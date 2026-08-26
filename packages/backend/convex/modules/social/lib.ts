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

/** Chi decide se esce. Deriva dal `kind`, non lo passa il chiamante. */
export const socialApproval = v.union(v.literal("auto"), v.literal("staff"));
export type SocialApproval = Infer<typeof socialApproval>;

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
 * Chi deve dare il via libera.
 *
 * La regola è una sola: passa dallo staff ciò che il modello *inventa*, esce da
 * solo ciò che il modello si limita a confezionare. Un riepilogo di campi
 * liberi è un dato del gestionale vestito a festa; un consiglio tecnico è
 * un'opinione firmata dal circolo.
 */
export function approvalFor(kind: SocialPostKind): SocialApproval {
  return kind === "tip" || kind === "event_announce" ? "staff" : "auto";
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
  /**
   * I trigger spenti, non quelli accesi.
   *
   * Al contrario di quel che verrebbe da fare, perché così una riga di
   * configurazione salvata prima che un trigger esistesse non lo tiene spento
   * per sempre senza che nessuno capisca il perché.
   */
  disabledKinds: SocialPostKind[];
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
  disabledKinds: [],
  // Due al giorno è la rete di sicurezza contro la giornata di torneo che
  // scatena una raffica: non è il ritmo previsto, è il tetto oltre il quale
  // qualcosa è andato storto.
  maxPerDay: 2,
  tone: "Diretto e cordiale, senza entusiasmi forzati. Diamo del tu. Frasi corte.",
  avoid: "Punti esclamativi a raffica, gergo motivazionale, emoji nei titoli.",
  baseHashtags: ["#padel", "#melilli", "#asdpadelsport"],
};
