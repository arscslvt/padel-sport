/**
 * Vocabolario condiviso dei contenuti social.
 *
 * Sta qui e non su `apps/web` perché la locandina è una proiezione della riga:
 * il compositore scrive la `PosterSpec`, il sito la disegna. Una definizione
 * sola, importata dai due lati, evita che i due si allontanino in silenzio —
 * lo stesso motivo per cui `utils/hark.ts` è condiviso con il sito.
 *
 * Il file non esporta funzioni Convex: sono tipi e funzioni pure, come
 * `modules/openMatches/lib.ts`.
 */

/** Cosa ha fatto scattare il contenuto. Governa tono, formato e approvazione. */
export type SocialPostKind =
  | "tournament_result"
  | "courts_tomorrow"
  | "tip"
  | "event_announce"
  | "event_reminder"
  | "open_match"
  | "player_request";

/** Dove finisce: nel feed (4:5) o fra le storie (9:16). */
export type SocialFormat = "feed" | "story";

/** Chi decide se esce. Deriva dal `kind`, non lo passa il chiamante. */
export type SocialApproval = "auto" | "staff";

/**
 * Trattamento cromatico della locandina.
 *
 * Non sono tinte: il brand è volutamente monocromo — in `globals.css` ogni
 * token ha chroma zero — quindi un accento colorato sarebbe fuori identità.
 * Qui l'accento sceglie il *contrasto*, che è la cosa che serve davvero
 * decidere quando dietro può esserci una foto.
 */
export type PosterAccent =
  /** Fondo scuro, testo chiaro. L'annuncio che deve pesare. */
  | "ink"
  /** Fondo chiaro, testo scuro. Editoriale, riposante: i consigli. */
  | "light"
  /** Foto a tutto campo con velatura scura e testo chiaro. */
  | "photo";

/**
 * Gli slot che il modello riempie.
 *
 * Non è un layout: è un modulo prestampato. Il modello non decide dove va il
 * testo, decide cosa ci scrive — e lo fa entro le lunghezze di `POSTER_LIMITS`,
 * che sono le misure che la locandina sa contenere senza tracimare.
 */
export interface PosterSpec {
  /** Sopratitolo minuscolo e spaziato: la categoria del contenuto. */
  eyebrow: string;
  /** Il titolo, in serif. È la sola cosa che si legge da lontano. */
  headline: string;
  /** Una riga di contesto sotto il titolo. */
  subhead?: string;
  /** Fino a quattro voci brevi: orari liberi, punteggi, punti di un consiglio. */
  bullets?: string[];
  /** Chiusa in fondo: l'invito, o l'indirizzo da digitare. */
  footer?: string;
  accent: PosterAccent;
}

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
