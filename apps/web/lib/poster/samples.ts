import type {
  PosterSpec,
  SocialFormat,
  SocialPostKind,
} from "@padel-sport/backend/convex/modules/social/lib";

/**
 * Locandine finte per lavorare sul disegno senza dipendere da nulla.
 *
 * È la stessa convenzione dei `PreviewProps` dei template di posta: il
 * componente non deve sapere da dove arrivano i dati, e per guardarlo non
 * devono esistere né Convex, né il modello, né Instagram. I testi sono
 * verosimili di proposito — su contenuti finti troppo corti ogni layout sembra
 * funzionare.
 */

export interface PosterSample {
  /** Etichetta leggibile per l'elenco delle anteprime. */
  label: string;
  kind: SocialPostKind;
  format: SocialFormat;
  spec: PosterSpec;
}

export const POSTER_SAMPLES = {
  "story-courts": {
    label: "Storia — campi liberi domani",
    kind: "courts_tomorrow",
    format: "story",
    spec: {
      eyebrow: "Domani in campo",
      headline: "Tre campi liberi giovedì",
      subhead: "Le fasce ancora aperte per domani, 27 agosto.",
      bullets: [
        "Campo 1 — 09:00 e 10:30",
        "Campo 2 — 18:00",
        "Campo 3 — 19:30 e 21:00",
      ],
      footer: "asdpadelsport.com/book",
      accent: "ink",
    },
  },

  "feed-tip": {
    label: "Post — consiglio tecnico",
    kind: "tip",
    format: "feed",
    spec: {
      eyebrow: "Consigli",
      headline: "La bandeja non è uno smash",
      subhead: "Serve a tenere la rete, non a chiudere il punto.",
      bullets: [
        "Colpisci all'altezza della spalla",
        "Accompagna, non frustare",
        "Chiudi il piatto verso il vetro",
      ],
      footer: "Il giovedì si prova in campo",
      accent: "light",
    },
  },

  "story-open-match": {
    label: "Storia — cercasi giocatori (partita aperta)",
    kind: "open_match",
    format: "story",
    spec: {
      // Nessun nome, nessun contatto: è uno dei due contenuti che abbiamo
      // promesso anonimi, e la finta deve somigliare al vero anche in questo.
      eyebrow: "Cercasi giocatori",
      headline: "Manca uno per sabato sera",
      subhead: "Sabato 30 agosto, 21:00. Livello intermedio.",
      footer: "asdpadelsport.com/book",
      accent: "photo",
    },
  },

  "story-player-request": {
    label: "Storia — richiesta dal sito",
    kind: "player_request",
    format: "story",
    spec: {
      eyebrow: "Cercasi giocatori",
      headline: "Due posti per domenica",
      subhead: "Domenica 31 agosto, 10:30. Livello principiante.",
      footer: "asdpadelsport.com/book",
      accent: "ink",
    },
  },

  "feed-tournament": {
    label: "Post — risultato di torneo",
    kind: "tournament_result",
    format: "feed",
    spec: {
      // Qui i nomi ci sono, ed è l'eccezione voluta: chi si iscrive a un
      // torneo si aspetta che il risultato si sappia.
      eyebrow: "Trofeo San Sebastiano",
      headline: "Finale ai vantaggi",
      subhead: "Russo / Amato battono Consiglio / Blanco.",
      bullets: ["6-4", "3-6", "7-5"],
      footer: "Il tabellone completo sul sito",
      accent: "ink",
    },
  },

  "feed-event": {
    label: "Post — nuovo evento",
    kind: "event_announce",
    format: "feed",
    spec: {
      eyebrow: "Nuovo evento",
      headline: "Torneo di fine estate",
      subhead: "Sabato 13 settembre, dalle 15:00. Iscrizioni aperte.",
      footer: "Iscriviti su asdpadelsport.com",
      accent: "photo",
    },
  },

  "story-event-reminder": {
    label: "Storia — promemoria evento",
    kind: "event_reminder",
    format: "story",
    spec: {
      eyebrow: "Fra due giorni",
      headline: "Torneo di fine estate",
      subhead: "Sabato 13 settembre, dalle 15:00.",
      footer: "Ultimi posti — asdpadelsport.com",
      accent: "photo",
    },
  },

  /**
   * Il caso che deve rompersi bene.
   *
   * Ogni slot sfora di molto la propria misura. Non è un capriccio: è l'unico
   * modo di vedere che il troncamento tiene, e va guardato a ogni ritocco del
   * layout. Se questa locandina resta leggibile, nessun capriccio del modello
   * può sfondare la tela.
   */
  "story-stress": {
    label: "Storia — prova di troncamento",
    kind: "courts_tomorrow",
    format: "story",
    spec: {
      eyebrow: "Una categoria dal nome interminabile",
      headline:
        "Un titolo che non finisce mai e continua ben oltre ogni ragionevole misura",
      subhead:
        "Un sottotitolo altrettanto prolisso, che si dilunga su dettagli che nessuno leggerebbe mai in una storia vista di sfuggita fra due video.",
      bullets: [
        "Una voce di elenco molto più lunga di quanto lo slot possa contenere",
        "Campo 2 — 18:00",
        "Campo 3 — 19:30",
        "Campo 4 — 20:00",
        "Questa quinta voce non deve comparire affatto",
      ],
      footer:
        "Una chiusa lunghissima che dovrebbe venire tagliata prima di uscire dal margine",
      accent: "ink",
    },
  },
} as const satisfies Record<string, PosterSample>;

export type PosterSampleId = keyof typeof POSTER_SAMPLES;

export function isPosterSampleId(value: string): value is PosterSampleId {
  return Object.hasOwn(POSTER_SAMPLES, value);
}
