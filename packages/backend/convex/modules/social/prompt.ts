import { z } from "zod";

import {
  POSTER_LIMITS,
  type SocialFormat,
  type SocialPostKind,
  type SocialSettings,
} from "./lib";

/**
 * Cosa chiediamo al modello, e cosa non gli lasciamo fare.
 *
 * La divisione con `socialSettings` non è casuale e conviene tenerla ferma:
 * **qui sta ciò che può far dire al circolo una cosa sbagliata, là ciò che
 * cambia solo come suona.** I divieti — niente nomi, niente prezzi inventati,
 * niente promesse che nessuno ha fatto — sono regole di sicurezza e vogliono
 * una revisione del codice; il tono di voce è una casella di testo nella
 * dashboard, e va bene che lo sia.
 *
 * `PROMPT_VERSION` finisce scritta su ogni riga: quando fra due mesi un
 * contenuto suonerà storto, la domanda «con quali istruzioni era stato
 * scritto» avrà una risposta.
 */
export const PROMPT_VERSION = "2026-08-27";

/**
 * Lo schema che l'uscita deve rispettare.
 *
 * Non serve a evitare di analizzare del testo: serve a togliere al modello una
 * decisione che non gli compete. La locandina non è una tela libera, è un
 * modulo prestampato, e queste lunghezze sono le misure degli spazi. Il
 * troncamento nei componenti resta comunque, perché uno schema è un accordo e
 * un accordo può essere disatteso.
 */
export const draftSchema = z.object({
  /** Il testo del post su Instagram. Vive sotto l'immagine, non dentro. */
  caption: z.string().min(1).max(1800),
  hashtags: z.array(z.string()).max(12),
  /** Descrizione dell'immagine per chi non la vede. */
  altText: z.string().max(180),
  /** L'identificativo della foto scelta, fra quelle proposte. */
  backgroundAssetId: z.string().optional(),
  poster: z.object({
    eyebrow: z.string().min(1).max(POSTER_LIMITS.eyebrow),
    headline: z.string().min(1).max(POSTER_LIMITS.headline),
    subhead: z.string().max(POSTER_LIMITS.subhead).optional(),
    bullets: z
      .array(z.string().max(POSTER_LIMITS.bullet))
      .max(POSTER_LIMITS.bullets)
      .optional(),
    footer: z.string().max(POSTER_LIMITS.footer).optional(),
    accent: z.enum(["ink", "light", "photo"]),
  }),
});

export type Draft = z.infer<typeof draftSchema>;

/** Cosa deve fare, trigger per trigger. */
const BRIEF: Record<SocialPostKind, string> = {
  tournament_result:
    "Racconta l'esito di una partita di torneo. Qui i nomi delle squadre sono il contenuto: usali. Metti i set nelle voci puntate. Niente enfasi da telecronaca.",
  courts_tomorrow:
    "Annuncia le fasce ancora libere di domani. Una voce puntata per campo. Deve leggersi in due secondi: è un promemoria, non un articolo.",
  tip: "Scrivi un consiglio tecnico su un singolo gesto o una singola situazione di gioco. Concreto e verificabile in campo, mai motivazionale. Evita gli argomenti già trattati.",
  event_announce:
    "Annuncia un evento del circolo. Dai la data e cosa succede. L'invito a iscriversi va nella chiusa.",
  event_reminder:
    "Ricorda un evento che è fra due giorni. Più corto dell'annuncio: chi legge sa già di cosa si tratta.",
  open_match:
    "Una partita cerca giocatori. Dai giorno, ora, livello e quanti posti mancano. Nessun nome, nessun recapito: chi è interessato passa dal sito.",
  player_request:
    "Qualcuno cerca compagni di gioco tramite il modulo del sito. Dai giorno, ora, livello e quanti ne mancano. Nessun nome, nessun recapito.",
};

/**
 * Cosa deve reggere il template, dati i formati in cui uscirà.
 *
 * Un template può servirne più d'uno, ed è il caso normale per gli eventi. In
 * quel caso i vincoli si sommano invece di alternarsi: se fra i formati c'è una
 * storia, tutto ciò che conta deve stare nella locandina — e se c'è anche un
 * post, la didascalia va scritta comunque perché lì viene letta.
 */
export function mediumBrief(formats: readonly SocialFormat[]): string {
  const story = formats.includes("story");
  const feed = formats.includes("feed");

  if (story && feed) {
    return "Questo template esce **sia come post sia come storia**, con lo stesso testo. Vuol dire due cose insieme: tutto ciò che conta deve stare nella locandina, perché nelle storie Instagram non mostra la didascalia; e la didascalia va scritta bene lo stesso, perché nel post viene letta. Non scrivere «tocca il link» o «scorri in su»: nelle storie pubblicate via API non esiste alcun link.";
  }

  return story ? MEDIUM.story : MEDIUM.feed;
}

/** Cosa cambia fra un post e una storia. */
const MEDIUM: Record<SocialFormat, string> = {
  feed: "È un post nel feed: resta nel profilo e si può rileggere. La didascalia viene letta.",
  story:
    "È una storia: dura ventiquattr'ore e si guarda di sfuggita. **La didascalia non viene mostrata da Instagram** — scrivila comunque, la userà un altro canale — quindi tutto ciò che conta deve stare nella locandina. Non scrivere «tocca il link» o «scorri in su»: nelle storie pubblicate via API non esiste alcun link.",
};

export function systemPrompt(settings: SocialSettings): string {
  return `Scrivi i contenuti Instagram di ASD Padel Sport Melilli, un circolo di padel a Melilli, in Sicilia.

Produci due cose diverse per ogni contenuto:
- la **didascalia**, che sta sotto l'immagine e si legge con calma;
- la **locandina**, cioè il testo stampato dentro l'immagine, che si legge da lontano e in un attimo.
Non sono la stessa frase detta due volte: il titolo della locandina è corto e netto, la didascalia può respirare.

REGOLE NON NEGOZIABILI
1. Scrivi in italiano.
2. Usa soltanto i fatti che ti vengono dati. Non inventare orari, prezzi, promozioni, punteggi, numeri di partecipanti o nomi. Se un dato non c'è, il contenuto ne fa a meno: non è un buco da riempire.
3. Non promettere niente a nome del circolo — sconti, posti garantiti, presenze di qualcuno.
4. Sui contenuti che riguardano le partite dei soci non nominare mai nessuno e non riportare mai recapiti. Nemmeno un nome di battesimo.
5. Niente emoji nella locandina. Nella didascalia al massimo una, e solo se serve davvero.
6. Niente punti esclamativi in fila, niente maiuscole per enfasi.

LA LOCANDINA
Gli slot sono a misura fissa e il testo che sfora viene tagliato, quindi stai dentro:
- «eyebrow»: la categoria, ${POSTER_LIMITS.eyebrow} caratteri. Poche parole, nessuna punteggiatura.
- «headline»: il titolo, ${POSTER_LIMITS.headline} caratteri. È la cosa che si legge da lontano: falla valere.
- «subhead»: una riga di contesto, ${POSTER_LIMITS.subhead} caratteri.
- «bullets»: fino a ${POSTER_LIMITS.bullets} voci da ${POSTER_LIMITS.bullet} caratteri, per orari, punteggi o passaggi.
- «footer»: la chiusa, ${POSTER_LIMITS.footer} caratteri.

L'«accent» sceglie il trattamento visivo:
- «ink»: fondo scuro. È il valore giusto quasi sempre.
- «light»: fondo chiaro, più riposante. Per i consigli.
- «photo»: fotografia a tutto campo con velatura scura. **Usalo solo se ti viene proposta una fotografia e ne scegli una.**

TONO DEL CIRCOLO
${settings.tone}

DA EVITARE
${settings.avoid}`;
}

export function userPrompt(input: {
  kind: SocialPostKind;
  format: SocialFormat;
  facts: string;
  recent: string[];
  assets: { id: string; description: string; usage: string[] }[];
  baseHashtags: string[];
  /** Cosa non andava nel tentativo precedente, secondo lo staff. */
  feedback?: string;
}): string {
  const blocks = [
    `TIPO DI CONTENUTO\n${BRIEF[input.kind]}`,
    `MEZZO\n${MEDIUM[input.format]}`,
    `FATTI\n${input.facts}`,
  ];

  if (input.recent.length) {
    blocks.push(
      `GIÀ DETTO DI RECENTE — non ripeterlo e non riformularlo\n${input.recent.map((r) => `- ${r}`).join("\n")}`,
    );
  }

  if (input.assets.length) {
    blocks.push(
      `FOTOGRAFIE DISPONIBILI\nScegline una solo se c'entra davvero con quello che stai dicendo, e in quel caso metti «photo» in accent e il suo identificativo in backgroundAssetId. Se nessuna c'entra, lascia perdere: una foto sbagliata è peggio di nessuna foto.\n${input.assets
        .map((a) => `- ${a.id}: ${a.description} [${a.usage.join(", ")}]`)
        .join("\n")}`,
    );
  } else {
    blocks.push(
      "FOTOGRAFIE DISPONIBILI\nNessuna. Non usare «photo» in accent e lascia vuoto backgroundAssetId.",
    );
  }

  if (input.feedback) {
    // In fondo e non in cima: è l'ultima cosa che il modello legge prima di
    // scrivere, ed è quella che deve pesare di più.
    blocks.push(
      `RIFAI, TENENDO CONTO DI QUESTO\nLa stesura precedente è stata scartata dallo staff con questa indicazione: «${input.feedback}»`,
    );
  }

  blocks.push(
    `HASHTAG\nParti da questi e aggiungine al massimo tre pertinenti al contenuto: ${input.baseHashtags.join(" ")}`,
  );

  return blocks.join("\n\n");
}

/**
 * Cosa racconta ogni situazione.
 *
 * Serve al modello che scrive i template: senza, «combattuta» e «netta»
 * produrrebbero la stessa frase, e la distinzione che abbiamo introdotto nel
 * codice non si sentirebbe nel risultato.
 */
export const SITUATION_BRIEF: Record<string, string> = {
  "courts_tomorrow/uno":
    "È rimasta una sola fascia libera domani. Vale la pena dire che è l'ultima: è ciò che spinge a prenotare adesso.",
  "courts_tomorrow/poche":
    "Domani restano due o tre fasce libere. Tono normale, nessuna urgenza forzata.",
  "courts_tomorrow/molte":
    "Domani il circolo è quasi vuoto: quattro o più fasce libere. Si racconta come una giornata con spazio, non come un allarme.",
  "open_match/manca-uno":
    "A una partita già formata manca un solo giocatore. È la situazione più facile da chiudere: tono leggero, quasi un invito fra amici.",
  "open_match/mancano-piu":
    "A una partita mancano due o più giocatori. È un appello vero: serve dire chiaramente quando e a che livello.",
  "player_request/manca-uno":
    "Qualcuno ha chiesto dal sito un solo compagno di gioco. Nessun nome: si dice quando, a che livello, e che si passa dal sito.",
  "player_request/mancano-piu":
    "Qualcuno ha chiesto dal sito due o più compagni di gioco. Nessun nome.",
  "tournament_result/finale":
    "È la finale di un torneo: la notizia della giornata, qualunque sia stato il punteggio. Si nominano le squadre e si dice chi ha vinto.",
  "tournament_result/netta":
    "Una partita di tabellone vinta senza cedere set. Asciutto: il punteggio parla da solo.",
  "tournament_result/combattuta":
    "Una partita di tabellone decisa all'ultimo set. È quella che merita il racconto: si può dire che è stata dura, senza esagerare.",
  "event_announce/standard":
    "Si annuncia un evento del circolo. Data, cosa succede, e l'invito a iscriversi nella chiusa.",
  "event_reminder/standard":
    "Un evento è fra due giorni. Più corto dell'annuncio: chi legge sa già di cosa si tratta.",
};

/** Un template, come lo restituisce il modello. */
export const templateSchema = z.object({
  variants: z
    .array(
      z.object({
        caption: z.string().min(1).max(1800),
        hashtags: z.array(z.string()).max(12),
        poster: z.object({
          eyebrow: z.string().min(1).max(POSTER_LIMITS.eyebrow),
          headline: z.string().min(1).max(POSTER_LIMITS.headline),
          subhead: z.string().max(POSTER_LIMITS.subhead).optional(),
          bullets: z
            .array(z.string().max(POSTER_LIMITS.bullet))
            .max(POSTER_LIMITS.bullets)
            .optional(),
          footer: z.string().max(POSTER_LIMITS.footer).optional(),
          accent: z.enum(["ink", "light"]),
        }),
      }),
    )
    .min(1)
    .max(8),
});

/** Una variante di template, come esce dal modello. */
export type TemplateVariant = z.infer<
  typeof templateSchema
>["variants"][number];

export function templateSystemPrompt(settings: SocialSettings): string {
  return `Scrivi **template** per i contenuti Instagram di ASD Padel Sport Melilli, un circolo di padel in Sicilia.

Un template non è un post: è un post con i buchi. Verrà riempito automaticamente ogni volta che la situazione si ripresenta, con dati veri che tu non vedi e non vedrai mai. Il tuo lavoro è che la frase funzioni **qualunque** valore finisca nei buchi.

COME SI SCRIVONO I BUCHI
- \`{nome}\` per un valore singolo, dentro qualunque testo.
- \`{*nome}\` per una lista, e soltanto da sola come voce puntata: si espande in tante voci quanti sono gli elementi.

REGOLA PIÙ IMPORTANTE
Ti verranno mostrati dei **valori d'esempio**, per farti capire cosa contiene ciascun buco. Sono inventati. **Non scriverli mai nel testo**: al loro posto va il buco. Un template che dice «Rossi / Bianchi» invece di «{squadraA}» pubblicherebbe per sempre il nome di due giocatori che non esistono.

ALTRE REGOLE
1. Scrivi in italiano.
2. Usa soltanto i buchi che ti vengono elencati. Non inventarne di nuovi: quelli non esistono e resterebbero scritti nel post.
3. La frase deve reggere con qualunque valore. Se un buco contiene un numero, evita accordi che funzionano solo con uno di essi.
4. Non promettere niente a nome del circolo, non inventare prezzi o orari.
5. Niente emoji nella locandina, niente punti esclamativi in fila.

LA LOCANDINA
Slot a misura fissa, il testo che sfora viene tagliato. Conta i caratteri **includendo** i buchi al loro valore più lungo plausibile:
- «eyebrow» ${POSTER_LIMITS.eyebrow}, «headline» ${POSTER_LIMITS.headline}, «subhead» ${POSTER_LIMITS.subhead}, «bullets» fino a ${POSTER_LIMITS.bullets} da ${POSTER_LIMITS.bullet}, «footer» ${POSTER_LIMITS.footer}.

L'«accent» sceglie il trattamento: «ink» fondo scuro, «light» fondo chiaro e riposante.

TONO DEL CIRCOLO
${settings.tone}

DA EVITARE
${settings.avoid}`;
}

export function templateUserPrompt(input: {
  brief: string;
  formats: readonly SocialFormat[];
  values: Record<string, string>;
  lists: Record<string, string[]>;
  count: number;
  baseHashtags: string[];
  feedback?: string;
}): string {
  const holes = [
    ...Object.entries(input.values).map(
      ([name, example]) => `{${name}} — per esempio «${example}»`,
    ),
    ...Object.entries(input.lists).map(
      ([name, example]) =>
        `{*${name}} — lista, per esempio ${example.map((e) => `«${e}»`).join(", ")}`,
    ),
  ];

  const blocks = [
    `SITUAZIONE\n${input.brief}`,
    `MEZZO\n${mediumBrief(input.formats)}`,
    `BUCHI DISPONIBILI\n${holes.map((h) => `- ${h}`).join("\n")}`,
    `QUANTE VARIANTI\nScrivine ${input.count}, davvero diverse fra loro — non la stessa frase con un sinonimo. Verranno ruotate, quindi due che si somigliano troppo sono una sprecata.`,
    `HASHTAG\nParti da questi e aggiungine al massimo tre: ${input.baseHashtags.join(" ")}`,
  ];

  if (input.feedback) {
    blocks.push(`RIFAI, TENENDO CONTO DI QUESTO\n«${input.feedback}»`);
  }

  return blocks.join("\n\n");
}
