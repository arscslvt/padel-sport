import { v } from "convex/values";

import type { Doc, Id } from "../../_generated/dataModel";
import {
  internalMutation,
  internalQuery,
  type MutationCtx,
  type QueryCtx,
} from "../../_generated/server";
import { clubDay } from "../../utils/clubTime";
import {
  approvalFor,
  DEFAULT_SOCIAL_SETTINGS,
  posterSpec,
  type SocialChannel,
  type SocialFormat,
  type SocialPostKind,
  type SocialSettings,
  socialPostKind,
} from "./lib";

/**
 * Tutti gli accessi al database dei contenuti social.
 *
 * Stanno separati dalle azioni per il motivo scritto in
 * `modules/courtCalendar/data.ts`: il compositore gira in Node — gli serve
 * l'SDK del modello — e un file `"use node"` può esportare soltanto azioni.
 * Ogni lettura e ogni scrittura passa quindi da qui, via `ctx.runQuery` e
 * `ctx.runMutation`.
 *
 * Le due transizioni che contano sono `claim` e `beginPublish`: sono mutation,
 * quindi transazionali, ed è l'unica ragione per cui questo sistema può
 * sopravvivere a un'azione ritentata senza pubblicare due volte.
 */

/**
 * Dopo quanto un lavoro «in corso» si considera morto.
 *
 * Stessa soglia e stesso ragionamento di `modules/eventCommunications/begin.ts`:
 * se un'azione muore a metà, la riga resterebbe bloccata per sempre. Dieci
 * minuti sono molto più di quanto serva a comporre un testo o a caricare
 * un'immagine, quindi una riga più vecchia di così non sta lavorando.
 */
const STALE_AFTER_MS = 10 * 60 * 1000;

/** Quanto indietro guardare per contare le pubblicazioni di oggi. */
const DAY_LOOKBACK_MS = 48 * 60 * 60 * 1000;

/**
 * Gli stati che consumano il tetto giornaliero.
 *
 * Una riga scartata o saltata non ha parlato a nessuno e non deve occupare il
 * posto di una che potrebbe farlo.
 */
const COUNTS_TOWARD_CAP: ReadonlySet<string> = new Set([
  "drafting",
  "pending_review",
  "queued",
  "publishing",
  "published",
]);

async function readSettings(ctx: QueryCtx): Promise<SocialSettings> {
  const row = await ctx.db.query("socialSettings").first();

  if (!row) return DEFAULT_SOCIAL_SETTINGS;

  return {
    enabled: row.enabled,
    disabledKinds: row.disabledKinds,
    maxPerDay: row.maxPerDay,
    tone: row.tone,
    avoid: row.avoid,
    baseHashtags: row.baseHashtags,
  };
}

/** Le impostazioni, con i valori di partenza se nessuno le ha mai toccate. */
export const settings = internalQuery({
  args: {},
  handler: async (ctx) => await readSettings(ctx),
});

/**
 * Prende il posto per un contenuto, o si tira indietro.
 *
 * È la sola porta da cui nasce una riga, ed è una mutation per una ragione
 * precisa: le azioni Convex possono essere ritentate e `scheduler.runAfter` può
 * consegnare più di una volta. Se la riga nascesse dentro un'azione, lo stesso
 * fatto genererebbe due contenuti e nessuno se ne accorgerebbe fino a vederli
 * entrambi sul profilo.
 *
 * Restituisce `null` quando non c'è niente da fare, e i tre casi in cui accade
 * sono deliberatamente diversi fra loro:
 *
 * - **già presente**: il fatto ha già la sua riga, qualunque sia il suo stato;
 * - **sistema o trigger spenti**: non lascia traccia. Sembra sbagliato, ma
 *   scrivere una riga `skipped` brucerebbe la chiave per sempre: riacceso il
 *   sistema, quell'evento non verrebbe mai annunciato e nessuno capirebbe il
 *   perché. Il silenzio di un sistema spento è già spiegato dal fatto che sia
 *   spento;
 * - **tetto giornaliero raggiunto**: qui la riga `skipped` ci va, perché è
 *   un'informazione che nessun'altra parte del sistema racconta.
 */
export async function claimRow(
  ctx: MutationCtx,
  {
    kind,
    format,
    channel,
    triggerKey,
    scheduledAt,
  }: {
    kind: SocialPostKind;
    format: SocialFormat;
    channel: SocialChannel;
    triggerKey: string;
    scheduledAt?: number;
  },
): Promise<Id<"socialPosts"> | null> {
  const existing = await ctx.db
    .query("socialPosts")
    .withIndex("by_trigger", (q) =>
      q
        .eq("triggerKey", triggerKey)
        .eq("channel", channel)
        .eq("format", format),
    )
    .first();

  if (existing) return null;

  const config = await readSettings(ctx);

  if (!config.enabled || config.disabledKinds.includes(kind)) return null;

  const now = Date.now();
  const today = clubDay(now);

  const recent = await ctx.db
    .query("socialPosts")
    .withIndex("by_created", (q) => q.gte("createdAt", now - DAY_LOOKBACK_MS))
    .collect();

  const todayCount = recent.filter(
    (row) =>
      COUNTS_TOWARD_CAP.has(row.status) && clubDay(row.createdAt) === today,
  ).length;

  const common = {
    kind,
    format,
    channel,
    approval: approvalFor(kind),
    triggerKey,
    posterToken: crypto.randomUUID().replaceAll("-", ""),
    scheduledAt: scheduledAt ?? now,
    attempts: 0,
    createdAt: now,
  };

  if (todayCount >= config.maxPerDay) {
    await ctx.db.insert("socialPosts", {
      ...common,
      status: "skipped",
      error: `Tetto giornaliero raggiunto: ${config.maxPerDay} contenuti.`,
    });
    return null;
  }

  return await ctx.db.insert("socialPosts", {
    ...common,
    status: "drafting",
    publishStartedAt: now,
  });
}

/** La riga su cui il compositore deve lavorare. */
export const forCompose = internalQuery({
  args: { postId: v.id("socialPosts") },
  handler: async (ctx, { postId }) => await ctx.db.get(postId),
});

/**
 * Chiude la composizione e decide dove va la riga.
 *
 * Il bivio è tutto qui: chi esce da solo passa a `queued`, chi ha bisogno di
 * un occhio umano a `pending_review`. Restituisce lo stato scelto perché è il
 * compositore a dover sapere se accodare subito la pubblicazione o mandare
 * l'avviso allo staff.
 */
export const completeCompose = internalMutation({
  args: {
    postId: v.id("socialPosts"),
    facts: v.string(),
    caption: v.string(),
    hashtags: v.array(v.string()),
    poster: posterSpec,
    altText: v.optional(v.string()),
    backgroundAssetRef: v.optional(v.string()),
    linkUrl: v.optional(v.string()),
    model: v.optional(v.string()),
    promptVersion: v.optional(v.string()),
    inputTokens: v.optional(v.number()),
    outputTokens: v.optional(v.number()),
  },
  handler: async (ctx, { postId, ...draft }) => {
    const row = await ctx.db.get(postId);

    if (!row) throw new Error("Contenuto non trovato.");
    if (row.status !== "drafting") {
      throw new Error(`Il contenuto non è in composizione: ${row.status}.`);
    }

    const status = row.approval === "auto" ? "queued" : "pending_review";

    await ctx.db.patch(postId, {
      ...draft,
      status,
      publishStartedAt: undefined,
      error: undefined,
    });

    return { status, scheduledAt: row.scheduledAt };
  },
});

/** La composizione non è riuscita: la riga resta, con scritto perché. */
export const failCompose = internalMutation({
  args: {
    postId: v.id("socialPosts"),
    error: v.string(),
    /** Anche di un tentativo fallito vale la pena sapere cosa aveva letto. */
    facts: v.optional(v.string()),
  },
  handler: async (ctx, { postId, error, facts }) => {
    await ctx.db.patch(postId, {
      status: "failed",
      error,
      ...(facts ? { facts } : {}),
      publishStartedAt: undefined,
    });
  },
});

/**
 * Prende il lucchetto prima di pubblicare.
 *
 * Il salto `queued → publishing` avviene solo se lo stato è davvero `queued`:
 * chi arriva secondo trova la riga già mossa e si ferma. È lo stesso lucchetto
 * di `eventCommunications/begin.ts`, e vale qui per lo stesso motivo — due
 * tentativi in parallelo sulla stessa riga significano due post identici sul
 * profilo, e Instagram non permette di cancellarne uno.
 */
export const beginPublish = internalMutation({
  args: { postId: v.id("socialPosts") },
  handler: async (ctx, { postId }) => {
    const row = await ctx.db.get(postId);

    if (!row || row.status !== "queued") return null;
    if (row.scheduledAt > Date.now()) return null;

    await ctx.db.patch(postId, {
      status: "publishing",
      publishStartedAt: Date.now(),
      attempts: row.attempts + 1,
    });

    return row;
  },
});

/** Il contenitore è aperto: da qui un ritentativo lo riusa invece di duplicarlo. */
export const saveContainer = internalMutation({
  args: { postId: v.id("socialPosts"), containerId: v.string() },
  handler: async (ctx, { postId, containerId }) => {
    await ctx.db.patch(postId, { containerId });
  },
});

export const completePublish = internalMutation({
  args: {
    postId: v.id("socialPosts"),
    externalId: v.optional(v.string()),
    permalink: v.optional(v.string()),
  },
  handler: async (ctx, { postId, externalId, permalink }) => {
    await ctx.db.patch(postId, {
      status: "published",
      externalId,
      permalink,
      publishedAt: Date.now(),
      publishStartedAt: undefined,
      error: undefined,
    });
  },
});

/**
 * La pubblicazione non è riuscita.
 *
 * `retry` distingue il guasto passeggero — la riga torna in coda e il cron la
 * riprenderà — da quello definitivo. Chi chiama deve scegliere: rimettere in
 * coda un contenuto che Instagram ha rifiutato per il formato significa
 * ritentare all'infinito qualcosa che non passerà mai.
 */
export const failPublish = internalMutation({
  args: {
    postId: v.id("socialPosts"),
    error: v.string(),
    retry: v.boolean(),
  },
  handler: async (ctx, { postId, error, retry }) => {
    await ctx.db.patch(postId, {
      status: retry ? "queued" : "failed",
      error,
      publishStartedAt: undefined,
    });
  },
});

/**
 * Cosa si è già detto, per non ripetersi.
 *
 * Entra nel prompt sotto un blocco esplicito di argomenti già trattati. Si
 * guardano solo i contenuti usciti davvero: una bozza scartata non è un
 * argomento trattato, è un argomento evitato.
 */
export const recentCaptions = internalQuery({
  args: { kind: socialPostKind, limit: v.number() },
  handler: async (ctx, { kind, limit }) => {
    const rows = await ctx.db
      .query("socialPosts")
      .withIndex("by_kind_created", (q) => q.eq("kind", kind))
      .order("desc")
      .take(Math.min(limit, 50));

    return rows
      .filter((row) => row.status === "published")
      .map((row) => ({
        publishedAt: row.publishedAt,
        headline: row.poster?.headline,
        caption: row.caption,
      }));
  },
});

/**
 * Le righe che il cron deve rimettere in riga.
 *
 * Tre categorie, con destini diversi: quelle pronte da pubblicare, quelle
 * rimaste incastrate in composizione, e quelle rimaste incastrate in
 * pubblicazione — che sono le uniche di cui non si può decidere da soli.
 */
export const pending = internalQuery({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();

    const due = await ctx.db
      .query("socialPosts")
      .withIndex("by_status_scheduled", (q) =>
        q.eq("status", "queued").lte("scheduledAt", now),
      )
      .take(20);

    const stuck = (rows: Doc<"socialPosts">[]) =>
      rows.filter(
        (row) => now - (row.publishStartedAt ?? row.createdAt) > STALE_AFTER_MS,
      );

    const drafting = stuck(
      await ctx.db
        .query("socialPosts")
        .withIndex("by_status_scheduled", (q) => q.eq("status", "drafting"))
        .take(20),
    );

    const publishing = stuck(
      await ctx.db
        .query("socialPosts")
        .withIndex("by_status_scheduled", (q) => q.eq("status", "publishing"))
        .take(20),
    );

    return {
      due: due.map((row) => row._id),
      drafting: drafting.map((row) => row._id),
      publishing: publishing.map((row) => row._id),
    };
  },
});

/**
 * Una riga rimasta appesa passa a chi può decidere.
 *
 * La composizione incagliata è un fallimento e basta: nessuno ha visto niente.
 * La pubblicazione incagliata no — la chiamata a Instagram può essere andata a
 * buon fine con la risposta persa per strada — e ritentarla alla cieca
 * rischierebbe il doppione. Va a `needs_attention`, dove una persona guarda il
 * profilo e decide. Per un circolo che pubblica una volta al giorno, una
 * persona è un ottimo riconciliatore, ed è più onesto che fingere di aver
 * risolto.
 */
export const abandon = internalMutation({
  args: {
    postId: v.id("socialPosts"),
    status: v.union(v.literal("failed"), v.literal("needs_attention")),
    error: v.string(),
  },
  handler: async (ctx, { postId, status, error }) => {
    await ctx.db.patch(postId, { status, error, publishStartedAt: undefined });
  },
});

export type SocialPostId = Id<"socialPosts">;
