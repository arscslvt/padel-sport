import { clubDateLong, formatClubDateTime } from "../../utils/clubTime";
import type { FactsInput } from "./anonymity";
import type { SocialPostKind } from "./lib";

/**
 * Che situazione è, e con che valori si riempiono i buchi di un template.
 *
 * Questo file è il perno del funzionamento a template: da una parte decide
 * **quale** template serve, dall'altra prepara **cosa** ci va dentro. Entrambe le
 * cose sono calcoli deterministici su dati strutturati — nessun modello, nessun
 * giudizio, nessuna incertezza.
 *
 * È anche il punto in cui la questione dei dati personali si chiude da sola. Il
 * modello che scrive i template vede `{squadraA}`; il nome vero entra qui, e da
 * qui non esce: la sostituzione avviene dentro Convex, dopo che il template è già
 * stato scelto. Non è una promessa da mantenere con un filtro, è il modo in cui
 * i pezzi sono montati.
 */

/**
 * Le situazioni previste, per trigger.
 *
 * Un insieme chiuso e scritto qui, non un filtro salvato accanto a ogni template.
 * La differenza si sente fra sei mesi: così la domanda «perché ha scelto questo
 * template» si risponde leggendo `situationOf`, invece di ricostruire a mente
 * quale fra venti condizioni salvate abbia vinto.
 *
 * `tip` non compare: i consigli non hanno template, li scrive il modello ogni
 * volta perché ogni volta sono contenuto nuovo.
 */
export const SITUATIONS = {
  courts_tomorrow: [
    /** Una sola fascia: vale la pena dire «l'ultima». */
    "uno",
    /** Due o tre fasce. */
    "poche",
    /** Quattro o più: è una giornata vuota, si racconta diversamente. */
    "molte",
  ],
  open_match: ["manca-uno", "mancano-piu"],
  player_request: ["manca-uno", "mancano-piu"],
  tournament_result: [
    /** La finale: è la notizia della giornata, qualunque sia il punteggio. */
    "finale",
    /** Tabellone, vinta senza cedere set. */
    "netta",
    /** Tabellone, decisa all'ultimo set: quella che merita il racconto. */
    "combattuta",
  ],
  event_announce: ["standard"],
  event_reminder: ["standard"],
} as const satisfies Partial<Record<SocialPostKind, readonly string[]>>;

/** I trigger che funzionano a template. Gli altri passano dal modello. */
export type TemplatedKind = keyof typeof SITUATIONS;

export function isTemplated(kind: SocialPostKind): kind is TemplatedKind {
  return kind in SITUATIONS;
}

/**
 * Che situazione è.
 *
 * Le soglie sono scelte sul significato, non sull'aritmetica: «uno» merita una
 * frase sua perché è l'ultimo posto rimasto, e quattro fasce libere raccontano
 * una serata vuota, non «tre più una».
 *
 * `null` vuol dire che non c'è niente da raccontare — nessun campo libero,
 * nessun posto rimasto — e chi chiama lo tratta come contenuto saltato.
 */
export function situationOf(input: FactsInput): string | null {
  switch (input.kind) {
    case "courts_tomorrow": {
      const count = input.slots.reduce(
        (total, slot) => total + slot.times.length,
        0,
      );
      if (count === 0) return null;
      return count === 1 ? "uno" : count <= 3 ? "poche" : "molte";
    }

    case "open_match":
      if (input.freeSeats < 1) return null;
      return input.freeSeats === 1 ? "manca-uno" : "mancano-piu";

    case "player_request":
      return input.missingPlayers === 1 ? "manca-uno" : "mancano-piu";

    case "tournament_result":
      // I gironi no: in una giornata di torneo sono decine di partite, e
      // altrettanti post. Meritano un riepilogo serale, che è un contenuto
      // diverso e non esiste ancora — nel frattempo la riga resta, saltata,
      // così si vede che il trigger ha funzionato.
      if (input.stage === "group") return null;
      if (input.stage === "final") return "finale";
      // Tre set vuol dire che qualcuno ne ha perso uno per strada: è la
      // differenza fra un risultato e una partita.
      return input.sets.length >= 3 ? "combattuta" : "netta";

    case "event_announce":
    case "event_reminder":
      return "standard";

    case "tip":
      return null;
  }
}

/** I buchi di un template: valori singoli e liste che si espandono. */
export interface TemplateValues {
  values: Record<string, string>;
  lists: Record<string, string[]>;
}

/**
 * Cosa va nei buchi.
 *
 * Le chiavi sono in italiano perché finiscono dentro i template, che li leggono
 * delle persone: `{squadraA}` si capisce rileggendo, `{tA}` no.
 */
export function valuesOf(input: FactsInput): TemplateValues {
  switch (input.kind) {
    case "courts_tomorrow": {
      const count = input.slots.reduce(
        (total, slot) => total + slot.times.length,
        0,
      );

      return {
        values: {
          giorno: clubDateLong(input.day),
          quante: `${count}`,
        },
        lists: {
          fasce: input.slots.map(
            (slot) => `${slot.court} — ${slot.times.join(", ")}`,
          ),
        },
      };
    }

    case "open_match":
      return {
        values: {
          quando: formatClubDateTime(input.matchDate, " alle "),
          posti: `${input.freeSeats}`,
        },
        lists: {},
      };

    case "player_request":
      return {
        values: {
          quando: formatClubDateTime(input.matchDate, " alle "),
          mancano: `${input.missingPlayers}`,
          livello: input.level,
        },
        lists: {},
      };

    case "tournament_result":
      // Qui entrano i nomi delle squadre, e qui si fermano: il template che li
      // riceve è già stato scelto e scritto, e chi lo ha scritto ha visto
      // soltanto «{squadraA}».
      return {
        values: {
          torneo: input.tournament,
          squadraA: input.teamA,
          squadraB: input.teamB,
          punteggio: input.sets.map((set) => `${set.a}-${set.b}`).join(" "),
        },
        lists: { set: input.sets.map((set) => `${set.a}-${set.b}`) },
      };

    case "event_announce":
    case "event_reminder":
      return {
        values: {
          titolo: input.title,
          quando: formatClubDateTime(input.startsAt, " alle "),
          descrizione: input.excerpt,
        },
        lists: {},
      };

    case "tip":
      return { values: {}, lists: {} };
  }
}

/**
 * Valori finti, per far capire al modello cosa sono i buchi.
 *
 * Servono a scrivere i template: senza un esempio, `{quando}` potrebbe essere
 * un'ora, una data o un giorno della settimana, e la frase costruita attorno
 * verrebbe storta.
 *
 * Sono **inventati di sana pianta**, e non è una comodità: è il motivo per cui
 * la generazione dei template non tocca mai dati veri. Il modello scrive
 * guardando «Rossi / Bianchi», il nome della squadra vera entra dopo, dentro
 * Convex, quando il template è già scritto e approvato. Non c'è nessun passaggio
 * in cui i due si incontrino.
 */
export function exampleValuesFor(kind: TemplatedKind): TemplateValues {
  switch (kind) {
    case "courts_tomorrow":
      return {
        values: { giorno: "giovedì 28 agosto", quante: "3" },
        lists: { fasce: ["Campo 1 — 09:00, 10:30", "Campo 2 — 18:00"] },
      };

    case "open_match":
      return {
        values: { quando: "sabato 30 agosto alle 21:00", posti: "2" },
        lists: {},
      };

    case "player_request":
      return {
        values: {
          quando: "domenica 31 agosto alle 10:30",
          mancano: "2",
          livello: "intermedio",
        },
        lists: {},
      };

    case "tournament_result":
      return {
        values: {
          torneo: "Trofeo di Primavera",
          squadraA: "Rossi / Bianchi",
          squadraB: "Verdi / Neri",
          punteggio: "6-4 3-6 7-5",
        },
        lists: { set: ["6-4", "3-6", "7-5"] },
      };

    case "event_announce":
    case "event_reminder":
      return {
        values: {
          titolo: "Torneo di fine estate",
          quando: "sabato 13 settembre alle 15:00",
          descrizione: "Doppio maschile e femminile, iscrizioni aperte.",
        },
        lists: {},
      };
  }
}
