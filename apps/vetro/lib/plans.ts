/**
 * I piani di Vetro, in un posto solo: schede, tabella di confronto e modulo
 * demo leggono tutti da qui.
 *
 * Nessun vincolo: si paga mese per mese e si disdice quando si vuole. La
 * prova gratuita include tutto quello che c'è nel piano più ricco. I nomi
 * dei piani sono ancora provvisori.
 */

export type PlanId = "essential" | "complete";

export interface Plan {
  id: PlanId;
  /** Provvisorio. */
  name: string;
  tagline: string;
  /** Euro al mese, IVA esclusa. */
  price: number;
  /** Euro al mese con il codice di invito, per i primi `PROMO.months`. */
  promoPrice: number;
  /** Quante schede clienti può avere il club; `null` vuol dire senza limite. */
  clientLimit: number | null;
  /** Quante persone dello staff possono entrare nel gestionale. */
  staffLimit: number;
  highlighted?: boolean;
}

export const TRIAL = {
  id: "trial",
  name: "Prova gratuita",
  days: 30,
} as const;

/**
 * Il lancio: chi ha un codice di invito (lo passa un club che usa già
 * Vetro, o arriva con una campagna) paga meno per i primi mesi. Poi il
 * prezzo torna quello pieno, e il club resta solo se vuole. I codici li
 * controlla chi riceve la richiesta: il sito li raccoglie e basta.
 */
export const PROMO = {
  months: 3,
} as const;

export const PLANS: readonly Plan[] = [
  {
    id: "essential",
    name: "Essenziale",
    tagline:
      "Tutto quello che serve per gestire campi, prenotazioni e clienti.",
    price: 39,
    promoPrice: 29,
    clientLimit: 150,
    staffLimit: 1,
  },
  {
    id: "complete",
    name: "Completo",
    tagline:
      "Tutto Vetro, con pagamenti, eventi, automazioni e l'area dei giocatori.",
    price: 99,
    promoPrice: 79,
    clientLimit: null,
    staffLimit: 10,
    highlighted: true,
  },
];

/** «Fino a 150 clienti» o «Clienti illimitati». */
export const clientLimitLabel = (plan: Plan) =>
  plan.clientLimit === null
    ? "Clienti illimitati"
    : `Fino a ${plan.clientLimit} clienti`;

/** «Un membro dello staff» o «Fino a 10 membri dello staff». */
export const staffLimitLabel = (plan: Plan) =>
  plan.staffLimit === 1
    ? "Un membro dello staff"
    : `Fino a ${plan.staffLimit} membri dello staff`;

export const planName = (id: PlanId) =>
  PLANS.find((plan) => plan.id === id)?.name ?? id;

/** Le scelte del modulo demo: la prova o uno dei piani. */
export const PLAN_CHOICES = [
  TRIAL.id,
  ...PLANS.map((plan) => plan.id),
] as const;
export type PlanChoice = (typeof PLAN_CHOICES)[number];

export const choiceLabel = (choice: PlanChoice) =>
  choice === TRIAL.id ? TRIAL.name : planName(choice);

export interface Feature {
  label: string;
  /** In quali piani c'è. La prova le ha tutte. */
  plans: readonly PlanId[];
  /** Annunciata ma non ancora nel prodotto. */
  soon?: boolean;
  /**
   * Per le righe che non sono un sì o un no (un limite, una quantità): il
   * testo da mostrare in ogni colonna, al posto della spunta.
   */
  values?: Partial<Record<PlanId | typeof TRIAL.id, string>>;
}

export interface FeatureGroup {
  title: string;
  features: readonly Feature[];
}

const BOTH: readonly PlanId[] = ["essential", "complete"];
const COMPLETE: readonly PlanId[] = ["complete"];

/**
 * Le funzioni, raggruppate come nel gestionale.
 *
 * Il piano Essenziale tiene solo quello che serve a gestire le prenotazioni
 * ogni giorno: agenda, prenotazioni (online e dallo staff), conferme,
 * clienti con tessera, listino, campi e orari, accessi dello staff. Con
 * queste un club smette di usare carta e telefono. Tutto il resto, cioè
 * automazioni, pagamenti, eventi e la parte dei giocatori, è nel Completo.
 */
export const FEATURE_GROUPS: readonly FeatureGroup[] = [
  {
    title: "Agenda e prenotazioni",
    features: [
      {
        label: "Agenda giorno per giorno, con le partite in corso",
        plans: BOTH,
      },
      { label: "Prenotazioni online dei giocatori", plans: BOTH },
      { label: "Prenotazioni inserite dallo staff", plans: BOTH },
      { label: "Campo scelto in automatico, senza buchi", plans: COMPLETE },
      { label: "Quadrangolari su due campi", plans: COMPLETE },
      { label: "Partite aperte e inviti su WhatsApp", plans: COMPLETE },
    ],
  },
  {
    title: "Clienti",
    features: [
      {
        label: "Schede clienti",
        plans: BOTH,
        values: {
          trial: "Illimitate",
          essential: `Fino a ${PLANS[0].clientLimit}`,
          complete: "Illimitate",
        },
      },
      { label: "Tessera e livello di ogni cliente", plans: BOTH },
      { label: "Unione delle schede doppie", plans: COMPLETE },
      { label: "Richieste di assistenza e di giocatori", plans: COMPLETE },
      { label: "Area personale dei giocatori", plans: COMPLETE },
      { label: "Punti e premi per i giocatori", plans: COMPLETE },
    ],
  },
  {
    title: "Pagamenti",
    features: [
      { label: "Listino e prezzo per i tesserati", plans: BOTH },
      { label: "Pagamenti online con SumUp", plans: COMPLETE },
      { label: "Rimborsi decisi dallo staff", plans: COMPLETE },
    ],
  },
  {
    title: "Avvisi",
    features: [
      { label: "Conferme automatiche ai giocatori", plans: BOTH },
      { label: "Promemoria prima delle partite", plans: COMPLETE },
      { label: "Avviso dei giorni ancora vuoti", plans: COMPLETE },
    ],
  },
  {
    title: "Eventi",
    features: [
      { label: "Iscrizioni e arrivi", plans: COMPLETE },
      { label: "Comunicazioni agli iscritti", plans: COMPLETE },
    ],
  },
  {
    title: "Club e staff",
    features: [
      { label: "Campi, orari e chiusure", plans: BOTH },
      { label: "Meteo al club e chiusure per pioggia", plans: COMPLETE },
      {
        label: "Membri dello staff",
        plans: BOTH,
        values: {
          trial: `Fino a ${PLANS[1].staffLimit}`,
          essential: String(PLANS[0].staffLimit),
          complete: `Fino a ${PLANS[1].staffLimit}`,
        },
      },
      // Con una persona sola i ruoli non servono: chi entra è l'amministratore.
      { label: "Ruoli per lo staff", plans: COMPLETE },
      { label: "Si installa sul telefono", plans: BOTH },
    ],
  },
  {
    title: "Intelligenza artificiale",
    features: [
      {
        label: "Funzioni con l'intelligenza artificiale",
        plans: COMPLETE,
        soon: true,
      },
    ],
  },
];

/** I punti forti del piano Essenziale, per la sua scheda. */
export const ESSENTIAL_HIGHLIGHTS = [
  "Agenda e prenotazioni online",
  "Prenotazioni inserite dallo staff",
  "Conferme automatiche ai giocatori",
  "Schede clienti, con tessera e livello",
  "Listino, campi e orari",
  "Si installa sul telefono",
] as const;

/**
 * Quello che il piano Completo aggiunge, raccolto per la sua scheda: una riga
 * per famiglia di funzioni, non una per funzione. Il dettaglio è nella
 * tabella di confronto. `icon` è il nome dell'icona in plan-cards.tsx.
 */
export const COMPLETE_HIGHLIGHTS = [
  { label: "Pagamenti online con SumUp", icon: "payments" },
  { label: "Eventi, iscrizioni e comunicazioni", icon: "events" },
  { label: "Campo automatico e promemoria", icon: "automations" },
  { label: "Partite aperte e inviti su WhatsApp", icon: "community" },
  { label: "Area personale, punti e premi", icon: "players" },
  { label: "Meteo al club e chiusure per pioggia", icon: "weather" },
  { label: "Funzioni con l'intelligenza artificiale", icon: "ai", soon: true },
] as const;

/**
 * Dove porta la scelta di un piano. Non c'è ancora un pagamento online: si
 * arriva al modulo della demo con il piano già indicato.
 */
export const requestHref = (choice: PlanChoice) => `/?plan=${choice}#demo`;
