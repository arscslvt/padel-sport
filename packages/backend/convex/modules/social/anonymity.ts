import { formatClubDateTime } from "../../utils/clubTime";
import { ANONYMOUS_KINDS, type PosterSpec, type SocialPostKind } from "./lib";

/**
 * Il collo di bottiglia fra i dati del circolo e il modello.
 *
 * Il modello non riceve mai un documento: riceve una stringa costruita qui, e
 * questo file esiste separato proprio per essere trovabile — la domanda «cosa
 * esce di preciso da questo sistema» deve avere un posto solo in cui si
 * risponde.
 *
 * La difesa non è un filtro, è il **tipo**. Guarda i due rami anonimi di
 * `FactsInput`: non hanno un campo in cui un nome possa entrare. Non esiste un
 * percorso di codice capace di trasportarci un indirizzo o un numero di
 * telefono, perché non c'è il posto dove metterli. Una funzione di ripulitura
 * si può dimenticare di un caso; un tipo che non prevede il campo, no.
 *
 * `assertAnonymous` è la seconda linea, e serve per la cosa che la prima non
 * può fare: il modello può inventarsi un nome che nessuno gli ha dato.
 */

/** La scala 1.0–5.0 delle partite aperte, detta come la direbbe una persona. */
function levelRange(min: number, max: number): string {
  const word = (value: number) =>
    value <= 2 ? "principiante" : value <= 3.5 ? "intermedio" : "avanzato";

  const from = word(min);
  const to = word(max);

  return from === to ? from : `da ${from} ad ${to}`;
}

/**
 * Tutto ciò che si può raccontare, per tipo di contenuto.
 *
 * I due rami anonimi — `open_match` e `player_request` — portano conteggi,
 * date e livelli. Nient'altro. È qui che la promessa fatta all'utente diventa
 * una cosa che il compilatore fa rispettare.
 */
export type FactsInput =
  | {
      kind: "open_match";
      matchDate: number;
      freeSeats: number;
      levelMin: number;
      levelMax: number;
    }
  | {
      kind: "player_request";
      matchDate: number;
      level: string;
      missingPlayers: number;
    }
  | {
      kind: "courts_tomorrow";
      day: number;
      slots: { court: string; times: string[] }[];
    }
  | {
      kind: "tournament_result";
      tournament: string;
      stage: string;
      teamA: string;
      teamB: string;
      sets: { a: number; b: number }[];
    }
  | {
      kind: "event_announce" | "event_reminder";
      title: string;
      excerpt: string;
      startsAt: number;
      endsAt?: number;
      tags: string[];
    }
  | { kind: "tip"; alreadyCovered: string[] };

/** I fatti, in italiano, come li leggerà il modello. */
export function buildFacts(input: FactsInput): string {
  switch (input.kind) {
    case "open_match":
      return [
        `Partita aperta il ${formatClubDateTime(input.matchDate)}.`,
        `Posti liberi: ${input.freeSeats}.`,
        `Livello: ${levelRange(input.levelMin, input.levelMax)}.`,
      ].join("\n");

    case "player_request":
      return [
        `Richiesta di giocatori per il ${formatClubDateTime(input.matchDate)}.`,
        `Giocatori mancanti: ${input.missingPlayers}.`,
        `Livello: ${input.level}.`,
      ].join("\n");

    case "courts_tomorrow":
      return [
        `Disponibilità dei campi per il ${formatClubDateTime(input.day)}.`,
        ...input.slots.map(
          (slot) => `${slot.court}: ${slot.times.join(", ")}.`,
        ),
      ].join("\n");

    case "tournament_result":
      return [
        `Torneo: ${input.tournament}.`,
        `Fase: ${input.stage}.`,
        `${input.teamA} contro ${input.teamB}.`,
        `Set: ${input.sets.map((set) => `${set.a}-${set.b}`).join(", ")}.`,
      ].join("\n");

    case "event_announce":
    case "event_reminder":
      return [
        `Evento: ${input.title}.`,
        input.excerpt ? `Descrizione: ${input.excerpt}` : null,
        `Inizio: ${formatClubDateTime(input.startsAt)}.`,
        input.endsAt ? `Fine: ${formatClubDateTime(input.endsAt)}.` : null,
        input.tags.length ? `Tag: ${input.tags.join(", ")}.` : null,
      ]
        .filter(Boolean)
        .join("\n");

    case "tip":
      return [
        "Consiglio tecnico sul padel, per giocatori del circolo.",
        input.alreadyCovered.length
          ? `Argomenti già trattati, da non ripetere:\n${input.alreadyCovered.map((t) => `- ${t}`).join("\n")}`
          : "Nessun consiglio pubblicato finora.",
      ].join("\n");
  }
}

/**
 * I recapiti veri, letti solo per controllare che non compaiano.
 *
 * Arrivano dalla mutation che chiude la composizione, cioè da un punto che il
 * documento originale può rileggerlo. Nell'azione non ci sono, e non è una
 * dimenticanza: se ci fossero, il controllo non proverebbe niente.
 */
export interface AnonymitySource {
  name?: string;
  email?: string;
  phone?: string;
}

/** Il minimo di lettere perché un nome sia un nome e non una sillaba. */
const MIN_NAME_LENGTH = 3;

/**
 * Rifiuta un testo che nomina qualcuno, quando non dovrebbe.
 *
 * Sta in una mutation e non nell'azione perché deve poter **rifiutare in
 * transazione**: la riga va a `failed` e il contenuto non esce. Un controllo
 * che si limitasse a segnalare avrebbe pubblicato e poi avvisato, che per una
 * cosa irreversibile come un post non serve a niente.
 *
 * I controlli sono cuciti sui modi in cui un recapito finisce davvero in un
 * testo, non su un'idea generica di dato personale: una chiocciola, una fila
 * di cifre da numero di telefono, il prefisso italiano, il nome per intero.
 * Sui contenuti anonimi non esiste una ragione legittima per nessuno dei
 * quattro, quindi non ci sono falsi positivi da temere.
 */
export function assertAnonymous(
  kind: SocialPostKind,
  caption: string,
  poster: PosterSpec,
  source: AnonymitySource,
): void {
  if (!ANONYMOUS_KINDS.has(kind)) return;

  const haystack = [
    caption,
    poster.eyebrow,
    poster.headline,
    poster.subhead ?? "",
    ...(poster.bullets ?? []),
    poster.footer ?? "",
  ]
    .join("\n")
    .toLowerCase();

  const refuse = (why: string): never => {
    throw new Error(
      `Contenuto rifiutato: ${why}. I contenuti di tipo «${kind}» non possono nominare nessuno.`,
    );
  };

  if (haystack.includes("@")) refuse("contiene una chiocciola");
  if (/\+39/.test(haystack)) refuse("contiene un prefisso telefonico");

  // Sei cifre di fila non sono un orario, una data o un punteggio: a quel punto
  // è un numero di telefono o qualcosa che gli somiglia troppo.
  if (/\d{6,}/.test(haystack)) refuse("contiene una sequenza di cifre lunga");

  const name = source.name?.trim().toLowerCase();
  if (name) {
    for (const part of name.split(/\s+/)) {
      if (part.length < MIN_NAME_LENGTH) continue;
      if (haystack.includes(part)) refuse(`contiene «${part}»`);
    }
  }

  const local = source.email?.split("@")[0]?.trim().toLowerCase();
  if (local && local.length >= MIN_NAME_LENGTH && haystack.includes(local)) {
    refuse("contiene la parte iniziale di un indirizzo di posta");
  }

  const digits = source.phone?.replace(/\D/g, "") ?? "";
  if (digits.length >= 6 && haystack.includes(digits.slice(-6))) {
    refuse("contiene le ultime cifre di un numero di telefono");
  }
}
