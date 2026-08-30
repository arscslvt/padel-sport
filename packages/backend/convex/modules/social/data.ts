import { v } from "convex/values";

import { components } from "../../_generated/api";
import type { Doc, Id } from "../../_generated/dataModel";
import {
  internalMutation,
  internalQuery,
  type MutationCtx,
  type QueryCtx,
} from "../../_generated/server";
import { clubDay } from "../../utils/clubTime";
import {
  type AnonymitySource,
  assertAnonymous,
  type FactsInput,
} from "./anonymity";
import { freeSlotsTomorrow } from "./courts";
import {
  approvalForMode,
  DEFAULT_SOCIAL_SETTINGS,
  posterSpec,
  resolveModes,
  type SocialChannel,
  type SocialFormat,
  type SocialPostKind,
  type SocialSettings,
  socialChannel,
  socialPostKind,
  templateFormats,
} from "./lib";
import type { TemplateValues } from "./situations";
import { renderTemplate } from "./template";

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

  const modes = resolveModes(row.modes, row.disabledKinds);

  return {
    enabled: row.enabled,
    modes,
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
    subjectId,
    scheduledAt,
  }: {
    kind: SocialPostKind;
    format: SocialFormat;
    channel: SocialChannel;
    triggerKey: string;
    subjectId?: string;
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

  // Modalità manuale: il sistema non produce niente da sé, e non lascia
  // traccia. Una riga saltata direbbe «avrei potuto», che su una categoria
  // affidata alle persone è rumore, non informazione.
  if (!config.enabled || config.modes[kind] === "manual") return null;

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
    approval: approvalForMode(config.modes[kind]),
    triggerKey,
    subjectId,
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
 * I recapiti veri di ciò che ha generato una riga.
 *
 * Li rilegge la mutation, non li riceve: se il nome arrivasse dall'azione
 * insieme al testo da controllare, il controllo non proverebbe niente — starebbe
 * confrontando due cose passate per la stessa strada. Qui invece il confronto è
 * fra ciò che il modello ha scritto e ciò che sta davvero sul documento.
 */
async function anonymitySource(
  ctx: MutationCtx,
  row: Doc<"socialPosts">,
): Promise<AnonymitySource> {
  if (!row.subjectId) return {};

  if (row.kind === "player_request") {
    const request = await ctx.db.get(row.subjectId as Id<"matchRequests">);
    return request
      ? { name: request.name, email: request.email, phone: request.phone }
      : {};
  }

  if (row.kind === "open_match") {
    const match = await ctx.db.get(row.subjectId as Id<"openMatches">);
    if (!match) return {};
    const creator = await ctx.db.get(match.creatorId);
    return { name: creator?.name };
  }

  return {};
}

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

    // L'ultima rete prima che il contenuto diventi pubblicabile. Sta in una
    // mutation perché deve poter rifiutare in transazione: un controllo che si
    // limitasse a segnalare avrebbe pubblicato, e poi avvisato.
    assertAnonymous(
      row.kind,
      draft.caption,
      draft.poster,
      await anonymitySource(ctx, row),
    );

    const status = row.approval === "auto" ? "queued" : "pending_review";

    await ctx.db.patch(postId, {
      ...draft,
      status,
      // Il lasciapassare è nuovo a ogni stesura, non solo alla prima. Alla
      // rigenerazione la locandina precedente è già stata disegnata e messa in
      // cache come immutabile: senza un indirizzo nuovo, la versione corretta
      // resterebbe invisibile dietro quella vecchia.
      posterToken: crypto.randomUUID().replaceAll("-", ""),
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

    // Solo le stesure il cui momento è già arrivato: un promemoria d'evento
    // resta di proposito in composizione per settimane, e lo spazzino non deve
    // scambiare l'attesa per un incaglio.
    const draftingRows = await ctx.db
      .query("socialPosts")
      .withIndex("by_status_scheduled", (q) =>
        q.eq("status", "drafting").lte("scheduledAt", now),
      )
      .take(20);

    const drafting = stuck(draftingRows);

    /** Quelle il cui turno è arrivato adesso: vanno riempite, non archiviate. */
    const toRender = draftingRows.filter(
      (row) => !drafting.some((late) => late._id === row._id),
    );

    const publishing = stuck(
      await ctx.db
        .query("socialPosts")
        .withIndex("by_status_scheduled", (q) => q.eq("status", "publishing"))
        .take(20),
    );

    return {
      due: due.map((row) => row._id),
      toRender: toRender.map((row) => row._id),
      drafting: drafting.map((row) => row._id),
      publishing: publishing.map((row) => row._id),
    };
  },
});

/**
 * Una riga rimasta appesa passa a chi può decidere.
 *
 * `skipped` è il terzo caso, e non è un fallimento: il trigger è scattato ma non
 * c'era niente da raccontare. Vale la pena distinguerlo, altrimenti una serata
 * senza campi liberi somiglierebbe a un guasto.
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
    status: v.union(
      v.literal("failed"),
      v.literal("needs_attention"),
      v.literal("skipped"),
    ),
    error: v.string(),
  },
  handler: async (ctx, { postId, status, error }) => {
    await ctx.db.patch(postId, { status, error, publishStartedAt: undefined });
  },
});

export type SocialPostId = Id<"socialPosts">;

/**
 * I fatti di una riga, già ridotti a ciò che si può raccontare.
 *
 * È l'unico posto che legge i documenti sorgente, e proietta: le due funzioni
 * anonime restituiscono conteggi, date e livelli, e nient'altro. Il nome del
 * creatore di una partita e i recapiti di chi ha compilato il modulo escono da
 * qui **solo** dentro `source`, che non arriva mai al modello — serve alla
 * verifica finale, che gira in `completeCompose`.
 *
 * Restituisce `null` per i tipi il cui trigger non è ancora agganciato: il
 * compositore li archivia come saltati invece di inventarsi qualcosa.
 */
export async function factsInputFor(
  ctx: QueryCtx,
  row: Doc<"socialPosts">,
): Promise<{ input: FactsInput; source: AnonymitySource } | null> {
  if (row.kind === "player_request") {
    if (!row.subjectId) return null;
    const request = await ctx.db.get(row.subjectId as Id<"matchRequests">);
    if (!request) return null;

    return {
      input: {
        kind: "player_request" as const,
        matchDate: request.matchDate,
        level: request.level,
        missingPlayers: request.missingPlayers,
      },
      // Le note restano fuori di proposito: sono testo libero, e chi scrive
      // «sono Marco, chiamatemi al 333» lo fa lì dentro.
      source: {
        name: request.name,
        email: request.email,
        phone: request.phone,
      },
    };
  }

  if (row.kind === "open_match") {
    if (!row.subjectId) return null;
    const match = await ctx.db.get(row.subjectId as Id<"openMatches">);
    if (!match) return null;

    const guests = await ctx.db
      .query("matchGuests")
      .withIndex("by_match", (q) => q.eq("matchId", match._id))
      .collect();

    const taken = match.playerIds.length + guests.length;
    const creator = await ctx.db.get(match.creatorId);

    return {
      input: {
        kind: "open_match" as const,
        matchDate: match.matchDate,
        freeSeats: Math.max(match.maxPlayers - taken, 0),
        levelMin: match.levelMin,
        levelMax: match.levelMax,
      },
      source: { name: creator?.name },
    };
  }

  if (row.kind === "tournament_result") {
    if (!row.subjectId) return null;

    // Il componente valida l'identificativo e **lancia** se non ha la forma
    // giusta, invece di restituire `null`. Qui dentro siamo in una mutation
    // schedulata: un'eccezione annullerebbe la transazione e lascerebbe la riga
    // in composizione per sempre, senza che da nessuna parte compaia il motivo.
    const match = await ctx
      .runQuery(components.tournaments.modules.matches.get.getById, {
        matchId: row.subjectId as never,
      })
      .catch(() => null);

    if (!match || match.rawStatus !== "completed") return null;

    const [teamA, teamB] = match.teams;
    if (!teamA || !teamB) return null;

    /**
     * Il vincitore va per primo.
     *
     * I template dicono «{squadraA} vince»: se qui arrivasse la squadra A del
     * tabellone invece di quella che ha vinto, metà dei post racconterebbe il
     * risultato al contrario — e senza sbagliare un solo numero, il che è il
     * modo peggiore di sbagliare.
     */
    const wonA = match.points.teamA > match.points.teamB;

    return {
      input: {
        kind: "tournament_result" as const,
        tournament: match.tournamentName ?? "Torneo del circolo",
        stage: match.stage ?? "",
        teamA: wonA ? teamA.name : teamB.name,
        teamB: wonA ? teamB.name : teamA.name,
        sets: match.sets.map(
          (set: { teamAPoints: number; teamBPoints: number }) => ({
            a: wonA ? set.teamAPoints : set.teamBPoints,
            b: wonA ? set.teamBPoints : set.teamAPoints,
          }),
        ),
      },
      source: {},
    };
  }

  if (row.kind === "courts_tomorrow") {
    const slots = await freeSlotsTomorrow(ctx);

    return {
      input: {
        kind: "courts_tomorrow" as const,
        // Il giorno da raccontare è domani, e serve un istante qualunque dentro
        // quel giorno perché sia `formatClubDateTime` a scriverlo.
        day: Date.now() + 24 * 60 * 60 * 1000,
        slots,
      },
      source: {},
    };
  }

  if (row.kind === "tip") {
    const previous = await ctx.db
      .query("socialPosts")
      .withIndex("by_kind_created", (q) => q.eq("kind", "tip"))
      .order("desc")
      .take(40);

    return {
      input: {
        kind: "tip" as const,
        alreadyCovered: previous
          .filter((post) => post.status === "published" && post.poster)
          .map((post) => post.poster?.headline ?? "")
          .filter(Boolean)
          .slice(0, 30),
      },
      source: {},
    };
  }

  return null;
}

/** La versione interrogabile dall'azione che compone i consigli. */
export const factsFor = internalQuery({
  args: { postId: v.id("socialPosts") },
  handler: async (ctx, { postId }) => {
    const row = await ctx.db.get(postId);
    return row ? await factsInputFor(ctx, row) : null;
  },
});

/**
 * Il template da usare, fra quelli approvati per questa situazione.
 *
 * Si prende il meno usato, e a parità il più fermo. È la rotazione: pescare a
 * caso fra sei varianti significa, in pratica, vedere la stessa due volte di
 * fila abbastanza spesso da farsi notare.
 */
export async function pickTemplate(
  ctx: QueryCtx,
  kind: SocialPostKind,
  situation: string,
  format: SocialFormat,
): Promise<Doc<"socialTemplates"> | null> {
  const approved = (
    await ctx.db
      .query("socialTemplates")
      .withIndex("by_slot", (q) =>
        q.eq("kind", kind).eq("situation", situation).eq("status", "approved"),
      )
      .collect()
  ).filter((template) => templateFormats(template).includes(format));

  if (approved.length === 0) return null;

  return approved.sort(
    (a, b) =>
      a.usageCount - b.usageCount || (a.lastUsedAt ?? 0) - (b.lastUsedAt ?? 0),
  )[0];
}

/** Segna una riga come saltata, con il motivo, dall'interno di una mutation. */
export async function markSkipped(
  ctx: MutationCtx,
  postId: Id<"socialPosts">,
  reason: string,
): Promise<void> {
  await ctx.db.patch(postId, {
    status: "skipped",
    error: reason,
    publishStartedAt: undefined,
  });
}

/**
 * Scrive nella riga il contenuto uscito da un template.
 *
 * Il pezzo in comune fra le tre strade che arrivano qui — il trigger di
 * dominio, il webhook degli eventi, il promemoria che si sveglia al proprio
 * turno. Erano tre copie della stessa decina di righe, e la decisione più
 * delicata (il primo giro passa dalla dashboard) stava scritta in tre posti.
 *
 * Restituisce lo stato scelto, perché è chi chiama a sapere se accodare la
 * pubblicazione o mandare l'avviso.
 */
export async function applyTemplate(
  ctx: MutationCtx,
  row: Doc<"socialPosts">,
  template: Doc<"socialTemplates">,
  values: TemplateValues,
  factsLabel: string,
): Promise<{ status: "queued" | "pending_review"; firstUse: boolean }> {
  const drafted = renderTemplate(template, values);

  // La rete di sicurezza vale anche qui, dove i buchi vengono riempiti con dati
  // veri. Non protegge più dal modello — quei nomi non li ha mai visti — ma da
  // un template che chiedesse il buco sbagliato.
  assertAnonymous(
    row.kind,
    drafted.caption,
    drafted.poster,
    await anonymitySource(ctx, row),
  );

  /**
   * Il primo contenuto di ogni template fa una sosta in dashboard.
   *
   * È lì, con i buchi riempiti di dati veri, che si vedono le cose che sullo
   * template vuoto non si notano: un accordo sbagliato, una frase che con tre set
   * diventa sgraziata. Approvarlo è ciò che dichiara buono il template.
   */
  const firstUse = template.usageCount === 0;
  const status =
    row.approval === "auto" && !firstUse ? "queued" : "pending_review";

  await ctx.db.patch(row._id, {
    status,
    templateId: template._id,
    facts: factsLabel,
    caption: drafted.caption,
    hashtags: drafted.hashtags,
    poster: drafted.poster,
    backgroundAssetRef: template.backgroundAssetRef,
    altText: template.altText,
    linkUrl: "asdpadelsport.com/book",
    // Nuovo a ogni stesura: la locandina precedente può già essere stata
    // disegnata e messa in cache come immutabile.
    posterToken: crypto.randomUUID().replaceAll("-", ""),
    publishStartedAt: undefined,
  });

  if (status === "queued") {
    await ctx.db.patch(template._id, {
      usageCount: template.usageCount + 1,
      lastUsedAt: Date.now(),
    });
  }

  return { status, firstUse };
}

/**
 * Riempie una riga che aspettava il proprio turno.
 *
 * Oggi la usa solo il promemoria degli eventi, che nasce settimane prima di
 * quando dovrà uscire. I suoi valori sono conservati sulla riga perché gli
 * eventi vivono su Sanity e da qui non si rileggono — per tutti gli altri
 * trigger i fatti si ricalcolano al momento, che è meglio.
 */
export const renderParked = internalMutation({
  args: { postId: v.id("socialPosts") },
  handler: async (ctx, { postId }) => {
    const row = await ctx.db.get(postId);
    if (!row || row.status !== "drafting") return null;

    if (!row.subjectValues) {
      await markSkipped(ctx, postId, "Nessun dato conservato per comporlo.");
      return null;
    }

    const values = JSON.parse(row.subjectValues) as TemplateValues;

    // Gli eventi hanno una situazione sola, e sono gli unici che si parcheggiano.
    // Se un domani si mettesse in attesa anche altro, la situazione andrà
    // conservata sulla riga insieme ai valori.
    const template = await pickTemplate(ctx, row.kind, "standard", row.format);

    if (!template) {
      await markSkipped(
        ctx,
        postId,
        `Nessuno template approvato per «${row.kind}».`,
      );
      return null;
    }

    const { status } = await applyTemplate(
      ctx,
      row,
      template,
      values,
      row.facts ?? "promemoria evento",
    );

    return { status };
  },
});

/** Il gettone di un canale, se ne è già stato salvato uno. */
export const credentials = internalQuery({
  args: { channel: socialChannel },
  handler: async (ctx, { channel }) =>
    await ctx.db
      .query("socialCredentials")
      .withIndex("by_channel", (q) => q.eq("channel", channel))
      .first(),
});

/**
 * Salva un gettone rinnovato, o il seme al primo avvio.
 *
 * `refreshFailures` si azzera a ogni successo: conta i guasti *di fila*, non
 * quelli di sempre, perché serve a distinguere l'intoppo passeggero dal gettone
 * ormai morto.
 */
export const saveCredentials = internalMutation({
  args: {
    channel: socialChannel,
    accessToken: v.string(),
    expiresAt: v.optional(v.number()),
  },
  handler: async (ctx, { channel, accessToken, expiresAt }) => {
    const existing = await ctx.db
      .query("socialCredentials")
      .withIndex("by_channel", (q) => q.eq("channel", channel))
      .first();

    const now = Date.now();

    if (existing) {
      await ctx.db.patch(existing._id, {
        accessToken,
        expiresAt,
        refreshedAt: now,
        refreshFailures: 0,
        updatedAt: now,
      });
      return existing._id;
    }

    return await ctx.db.insert("socialCredentials", {
      channel,
      accessToken,
      expiresAt,
      refreshedAt: now,
      refreshFailures: 0,
      updatedAt: now,
    });
  },
});

/** Un rinnovo andato storto: si conta, e si riproverà domani. */
export const recordRefreshFailure = internalMutation({
  args: { channel: socialChannel },
  handler: async (ctx, { channel }) => {
    const existing = await ctx.db
      .query("socialCredentials")
      .withIndex("by_channel", (q) => q.eq("channel", channel))
      .first();

    if (!existing) return;

    await ctx.db.patch(existing._id, {
      refreshFailures: existing.refreshFailures + 1,
      updatedAt: Date.now(),
    });
  },
});

/**
 * Il gettone da usare adesso, promuovendo il seme quando serve.
 *
 * Tre casi, e vale la pena tenerli distinti:
 *
 * - **niente in tabella**: si promuove il seme e si ricorda da quale valore
 *   veniva;
 * - **il seme è cambiato**: qualcuno ha messo a mano un gettone nuovo perché il
 *   vecchio era morto. Vince la variabile, e la tabella riparte da lì;
 * - **il seme è lo stesso**: la tabella è più aggiornata, perché il rinnovo
 *   automatico ci ha scritto sopra. Vince la tabella.
 *
 * È una mutation e non una query perché il primo e il secondo caso scrivono. Il
 * gettone non esce mai da qui verso l'esterno: lo leggono solo le azioni che
 * devono parlare con Meta.
 */
export const resolveToken = internalMutation({
  args: { channel: socialChannel, seed: v.optional(v.string()) },
  handler: async (ctx, { channel, seed }) => {
    const existing = await ctx.db
      .query("socialCredentials")
      .withIndex("by_channel", (q) => q.eq("channel", channel))
      .first();

    const now = Date.now();

    if (!existing) {
      if (!seed) return null;

      await ctx.db.insert("socialCredentials", {
        channel,
        accessToken: seed,
        seedFingerprint: seed,
        refreshFailures: 0,
        updatedAt: now,
      });

      return { accessToken: seed, expiresAt: undefined };
    }

    if (seed && existing.seedFingerprint !== seed) {
      await ctx.db.patch(existing._id, {
        accessToken: seed,
        seedFingerprint: seed,
        expiresAt: undefined,
        refreshedAt: undefined,
        refreshFailures: 0,
        updatedAt: now,
      });

      return { accessToken: seed, expiresAt: undefined };
    }

    return {
      accessToken: existing.accessToken,
      expiresAt: existing.expiresAt,
      refreshedAt: existing.refreshedAt,
    };
  },
});
