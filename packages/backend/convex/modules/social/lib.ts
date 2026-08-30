import { type Infer, v } from "convex/values";

/**
 * Vocabolario condiviso dei contenuti social.
 *
 * Sta qui e non su `apps/web` perché la locandina è una proiezione della riga:
 * il compositore scrive la `PosterSpec`, il sito la disegna. Una definizione
 * sola, importata dai due lati, evita che i due si allontanino in silenzio —
 * lo stesso motivo per cui `utils/hark.ts` è condiviso con il sito.
 *
 * I validator stanno qui e non in `tables/socialPosts.ts`, al contrario di
 * quanto fanno le altre tabelle: quel file importerebbe `convex/server`, e il
 * sito che ha bisogno di `PosterSpec` e `POSTER_LIMITS` se lo trascinerebbe
 * dietro per due tipi e un oggetto di costanti. La tabella importa da qui, la
 * direzione è invertita apposta.
 *
 * Il file non esporta funzioni Convex: sono validator, tipi e funzioni pure,
 * come `modules/openMatches/lib.ts`.
 */

/** Cosa ha fatto scattare il contenuto. Governa tono, formato e approvazione. */
export const socialPostKind = v.union(
  v.literal("tournament_result"),
  v.literal("courts_tomorrow"),
  v.literal("tip"),
  v.literal("event_announce"),
  v.literal("event_reminder"),
  v.literal("open_match"),
  v.literal("player_request"),
);
export type SocialPostKind = Infer<typeof socialPostKind>;

/** Comodo per iterare: le impostazioni hanno un interruttore per ciascuno. */
export const SOCIAL_POST_KINDS = [
  "tournament_result",
  "courts_tomorrow",
  "tip",
  "event_announce",
  "event_reminder",
  "open_match",
  "player_request",
] as const satisfies readonly SocialPostKind[];

/** Dove finisce: nel feed (4:5) o fra le storie (9:16). */
export const socialFormat = v.union(v.literal("feed"), v.literal("story"));
export type SocialFormat = Infer<typeof socialFormat>;

/**
 * Su quale canale.
 *
 * Oggi ha un valore solo, e non è una svista: l'indice di unicità delle righe
 * lo include già, perché lo stesso fatto pubblicato su due canali sono due
 * righe con lo stesso `triggerKey`. È l'unica cosa che va indovinata adesso;
 * aggiungere `facebook` dopo sarà una riga qui e un modulo nuovo.
 */
export const socialChannel = v.union(v.literal("instagram"));
export type SocialChannel = Infer<typeof socialChannel>;

/** Chi decide se esce. Deriva dalla modalità scelta per il tipo. */
export const socialApproval = v.union(v.literal("auto"), v.literal("staff"));
export type SocialApproval = Infer<typeof socialApproval>;

/**
 * Come si comporta il circolo su una categoria di contenuti.
 *
 * Prima era cablata nel codice, e la regola era una sola per tutti: passa dallo
 * staff ciò che il modello inventa. È una buona regola di partenza, ma non
 * sopravvive al fatto che la stessa struttura possa fidarsi dei risultati e non
 * dei consigli, o il contrario — e quel giudizio non è del codice.
 */
export const socialMode = v.union(
  /**
   * Il sistema non produce niente da sé per questa categoria.
   *
   * I trigger scattano e non lasciano traccia: nessuna riga, nessun contenuto
   * in sospeso. Non è «spento e basta» in senso stretto, è «me ne occupo io» —
   * e finché non c'è un modo di produrli su richiesta, in pratica coincide.
   */
  v.literal("manual"),
  /** Il contenuto si scrive e aspetta in dashboard. */
  v.literal("review"),
  /** Il contenuto si scrive ed esce da solo. */
  v.literal("auto"),
);
export type SocialMode = Infer<typeof socialMode>;

/**
 * Trattamento cromatico della locandina.
 *
 * Non sono tinte: il brand è volutamente monocromo — in `globals.css` ogni
 * token ha chroma zero — quindi un accento colorato sarebbe fuori identità.
 * Qui l'accento sceglie il *contrasto*, che è la cosa che serve davvero
 * decidere quando dietro può esserci una foto.
 */
export const posterAccent = v.union(
  /** Fondo scuro, testo chiaro. L'annuncio che deve pesare. */
  v.literal("ink"),
  /** Fondo chiaro, testo scuro. Editoriale, riposante: i consigli. */
  v.literal("light"),
  /** Foto a tutto campo con velatura scura e testo chiaro. */
  v.literal("photo"),
);
export type PosterAccent = Infer<typeof posterAccent>;

/**
 * Gli slot che il modello riempie.
 *
 * Non è un layout: è un modulo prestampato. Il modello non decide dove va il
 * testo, decide cosa ci scrive — e lo fa entro le lunghezze di `POSTER_LIMITS`,
 * che sono le misure che la locandina sa contenere senza tracimare.
 */
export const posterSpec = v.object({
  /** Sopratitolo minuscolo e spaziato: la categoria del contenuto. */
  eyebrow: v.string(),
  /** Il titolo, in serif. È la sola cosa che si legge da lontano. */
  headline: v.string(),
  /** Una riga di contesto sotto il titolo. */
  subhead: v.optional(v.string()),
  /** Fino a quattro voci brevi: orari liberi, punteggi, punti di un consiglio. */
  bullets: v.optional(v.array(v.string())),
  /** Chiusa in fondo: l'invito, o l'indirizzo da digitare. */
  footer: v.optional(v.string()),
  accent: posterAccent,
});
export type PosterSpec = Infer<typeof posterSpec>;

/**
 * Gli stati di una riga, e cosa significano.
 *
 * Auto e in attesa di approvazione **vivono nella stessa macchina**: l'unica
 * differenza è un arco, `drafting → queued` se il contenuto esce da solo,
 * `drafting → pending_review` altrimenti. La dashboard è un filtro su questo
 * campo, non due elenchi separati.
 */
export const socialPostStatus = v.union(
  /** Lucchetto: il compositore ci sta lavorando. */
  v.literal("drafting"),
  /** Composto, aspetta lo staff. */
  v.literal("pending_review"),
  /** Approvato, o auto: pubblicabile da `scheduledAt` in poi. */
  v.literal("queued"),
  /** Lucchetto: il pubblicatore ci sta lavorando. */
  v.literal("publishing"),
  v.literal("published"),
  /** Scartato dallo staff. */
  v.literal("rejected"),
  /**
   * Il trigger è scattato ma non c'era niente da dire.
   *
   * Esiste per evitare il silenzio: se domani non c'è nessun campo libero, la
   * riga c'è comunque e dice perché non si è pubblicato. Senza, l'unico modo
   * di sapere che il cron gira sarebbe vedere qualcosa comparire su Instagram.
   */
  v.literal("skipped"),
  /** Composizione o pubblicazione non riuscite. */
  v.literal("failed"),
  /**
   * Pubblicazione di esito ignoto: decide una persona.
   *
   * Ci si finisce quando la chiamata a Instagram è partita ma la risposta si è
   * persa. Ritentare rischierebbe il doppione, arrendersi rischierebbe il buco:
   * si chiede allo staff, che ha modo di guardare il profilo.
   */
  v.literal("needs_attention"),
);
export type SocialPostStatus = Infer<typeof socialPostStatus>;

/**
 * Lunghezze massime di ogni slot.
 *
 * Servono due volte: come vincolo nello schema JSON dell'output strutturato, e
 * come soglia di troncamento nei componenti. La seconda non è ridondante — un
 * modello con lo schema imposto sfora quasi mai, ma «quasi mai» non è un
 * layout, e satori non manda a capo con grazia.
 */
export const POSTER_LIMITS = {
  eyebrow: 24,
  headline: 48,
  subhead: 90,
  bullet: 40,
  bullets: 4,
  footer: 60,
} as const;

/**
 * In quali formati esce un contenuto.
 *
 * L'annuncio di un evento è l'unico che ne vuole due: il post resta nel
 * profilo, la storia raggiunge chi non scorre il feed. Sono due righe distinte
 * con lo stesso `triggerKey` e formati diversi.
 */
export function formatsFor(kind: SocialPostKind): readonly SocialFormat[] {
  switch (kind) {
    case "event_announce":
      return ["feed", "story"];
    case "tip":
    case "tournament_result":
      return ["feed"];
    default:
      return ["story"];
  }
}

/**
 * Le modalità di partenza, finché nessuno le tocca dalla dashboard.
 *
 * Riproducono la regola che prima era cablata: passa dallo staff ciò che il
 * modello *inventa*, esce da solo ciò che viene soltanto confezionato. Con gli
 * template quel confine si è spostato — ciò che il modello inventa adesso è lo
 * template, letto e approvato una volta — e resta a carico dello staff soltanto
 * il consiglio tecnico, che viene riscritto da capo ogni volta.
 *
 * Da qui in poi è una preferenza, non una legge: la struttura può decidere di
 * fidarsi dei consigli o di rivedere i risultati, e quel giudizio non spetta a
 * questo file.
 */
export const DEFAULT_MODES: Record<SocialPostKind, SocialMode> = {
  tournament_result: "auto",
  courts_tomorrow: "auto",
  tip: "review",
  event_announce: "auto",
  event_reminder: "auto",
  open_match: "auto",
  player_request: "auto",
};

/**
 * Le modalità effettive, componendo le fonti in ordine di precedenza.
 *
 * Quella salvata vince; se manca si guarda il vecchio elenco di trigger spenti,
 * dove «spento» diventa «manuale»; e in mancanza di entrambi vale il valore di
 * partenza. Così una configurazione salvata mesi fa continua a comportarsi come
 * si comportava, e una categoria aggiunta dopo non nasce muta.
 *
 * Sta qui e non accanto a chi legge perché i lettori sono due — il motore e il
 * pannello — e due copie della stessa precedenza sarebbero due occasioni di
 * scriverla diversa.
 */
export function resolveModes(
  saved: { kind: SocialPostKind; mode: SocialMode }[] | undefined,
  legacyDisabled: SocialPostKind[] | undefined,
): Record<SocialPostKind, SocialMode> {
  const explicit = new Map(saved?.map((entry) => [entry.kind, entry.mode]));

  return Object.fromEntries(
    SOCIAL_POST_KINDS.map((kind) => [
      kind,
      explicit.get(kind) ??
        (legacyDisabled?.includes(kind) ? "manual" : DEFAULT_MODES[kind]),
    ]),
  ) as Record<SocialPostKind, SocialMode>;
}

/**
 * In quali formati esce un template, leggendo la forma nuova o quella vecchia.
 *
 * Sta qui perché i lettori sono tre — la scelta al momento di pubblicare, la
 * mappa di copertura e il pannello — e tre copie della stessa ricaduta
 * sarebbero tre occasioni di scriverla diversa.
 */
export function templateFormats(template: {
  formats?: SocialFormat[];
  format?: SocialFormat;
}): SocialFormat[] {
  if (template.formats?.length) return template.formats;
  return template.format ? [template.format] : [];
}

/** La forma con cui le modalità si salvano: coppie, non un dizionario. */
export function modesToPairs(
  modes: Record<SocialPostKind, SocialMode>,
): { kind: SocialPostKind; mode: SocialMode }[] {
  return SOCIAL_POST_KINDS.map((kind) => ({ kind, mode: modes[kind] }));
}

/**
 * Chi deve dare il via libera, secondo la modalità scelta.
 *
 * `manual` non compare: quella non è una risposta a «chi approva», è un «non si
 * arriva nemmeno a chiederselo», e viene intercettata prima che una riga nasca.
 *
 * Il primo contenuto di ogni template fa comunque una sosta in dashboard anche in
 * modalità autonoma. Quella regola non sta qui perché non riguarda la
 * categoria: riguarda il template, ed è la differenza fra fidarsi di una scelta
 * editoriale e fidarsi di una frase che nessuno ha ancora visto riempita.
 */
export function approvalForMode(mode: SocialMode): SocialApproval {
  return mode === "review" ? "staff" : "auto";
}

/**
 * I contenuti che non possono nominare nessuno.
 *
 * Un insieme leggibile invece di un `if` sparso fra i moduli: l'eccezione dei
 * risultati di torneo — dove i nomi delle squadre sono il contenuto — si vede
 * dal fatto che `tournament_result` qui non c'è.
 */
export const ANONYMOUS_KINDS: ReadonlySet<SocialPostKind> = new Set([
  "open_match",
  "player_request",
]);

/**
 * Da cosa nasce una riga, e con che chiave la si riconosce.
 *
 * La chiave è l'unica difesa contro il doppione, quindi deve dipendere solo da
 * identificatori — mai dall'ora, mai dal contenuto — esattamente come le
 * `idempotencyKey` di `utils/hark.ts`. Raccoglierle in una funzione sola invece
 * di comporle a mano nei sei punti di aggancio serve a questo: la convenzione
 * si legge in un posto, e nessuno la reinventa leggermente diversa.
 *
 * Il giorno va passato come `YYYY-MM-DD` **nel fuso del club**, non in UTC: a
 * mezzanotte e mezza di un sabato d'estate le due date sono diverse, e la
 * storia dei campi liberi uscirebbe due volte.
 */
export type TriggerSubject =
  /** Una singola partita di tabellone: quarti, semifinale, finale. */
  | { kind: "tournament_result"; matchId: string }
  /** Il riepilogo serale di una giornata di gironi. */
  | { kind: "tournament_result"; categoryId: string; day: string }
  | { kind: "courts_tomorrow"; day: string }
  | { kind: "tip"; day: string }
  | { kind: "event_announce" | "event_reminder"; documentId: string }
  | { kind: "open_match"; matchId: string }
  | { kind: "player_request"; requestId: string };

export function triggerKeyFor(subject: TriggerSubject): string {
  switch (subject.kind) {
    case "tournament_result":
      return "matchId" in subject
        ? `tournament-match-${subject.matchId}`
        : `tournament-day-${subject.categoryId}-${subject.day}`;
    case "courts_tomorrow":
      return `courts-${subject.day}`;
    case "tip":
      return `tip-${subject.day}`;
    case "event_announce":
      return `event-announce-${subject.documentId}`;
    case "event_reminder":
      return `event-reminder-${subject.documentId}`;
    case "open_match":
      return `open-match-${subject.matchId}`;
    case "player_request":
      return `player-request-${subject.requestId}`;
  }
}

/** Le impostazioni, con i valori di partenza. */
export interface SocialSettings {
  /**
   * L'interruttore generale.
   *
   * Nasce **spento**, e non è prudenza eccessiva: finché non esistono né la
   * chiave del modello né il token di Instagram, acceso non farebbe altro che
   * riempire la tabella di righe fallite. Lo accende lo staff quando il resto è
   * a posto.
   */
  enabled: boolean;
  /** Come si comporta ogni categoria: manuale, con approvazione, autonoma. */
  modes: Record<SocialPostKind, SocialMode>;
  /** Quante pubblicazioni al giorno al massimo, su tutti i trigger insieme. */
  maxPerDay: number;
  /** Voce del club: come deve suonare. */
  tone: string;
  /** Parole e temi da non toccare. */
  avoid: string;
  baseHashtags: string[];
}

export const DEFAULT_SOCIAL_SETTINGS: SocialSettings = {
  enabled: false,
  modes: DEFAULT_MODES,
  // Due al giorno è la rete di sicurezza contro la giornata di torneo che
  // scatena una raffica: non è il ritmo previsto, è il tetto oltre il quale
  // qualcosa è andato storto.
  maxPerDay: 2,
  tone: "Diretto e cordiale, senza entusiasmi forzati. Diamo del tu. Frasi corte.",
  avoid: "Punti esclamativi a raffica, gergo motivazionale, emoji nei titoli.",
  baseHashtags: ["#padel", "#melilli", "#asdpadelsport"],
};
