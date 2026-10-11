import type { PortableTextBlock } from "next-sanity";

export type SanityImage = {
  _type?: string;
  asset?: { _ref: string; _type: string };
  hotspot?: { x: number; y: number; height: number; width: number };
  crop?: { top: number; bottom: number; left: number; right: number };
  alt?: string | null;
  caption?: string | null;
  lqip?: string | null;
  aspectRatio?: number | null;
};

export type EventCardData = {
  _id: string;
  title: string;
  slug: string;
  excerpt: string;
  dateStart: string;
  dateEnd?: string | null;
  highlighted?: boolean | null;
  tags?: string[] | null;
  banner?: SanityImage | null;
};

export type EventContentImage = SanityImage & {
  _type: "contentImage";
  _key: string;
};

export type EventArticle = EventCardData & {
  seoDescription?: string | null;
  body?: PortableTextBlock[] | null;
};

/** Blocco «Modulo di iscrizione» inserito nel corpo dell'articolo. */
export type EventRsvpFormBlock = {
  _type: "rsvpForm";
  _key: string;
  heading?: string | null;
  description?: string | null;
  /** Posti totali. `null` = iscrizioni illimitate. */
  capacity?: number | null;
  maxGuests?: number | null;
  closesAt?: string | null;
  successMessage?: string | null;
};

/** Risultato di `EVENTS_WITH_RSVP_QUERY`: un evento e i moduli che ospita. */
export type EventWithRsvpForms = {
  _id: string;
  title: string;
  slug: string;
  dateStart: string;
  dateEnd?: string | null;
  forms: Omit<EventRsvpFormBlock, "_type" | "description" | "successMessage">[];
};

/** Risultato di `EVENT_RSVP_FORM_QUERY`. */
export type EventRsvpFormTarget = {
  _id: string;
  title: string;
  slug: string;
  dateStart: string;
  dateEnd?: string | null;
  form: Omit<EventRsvpFormBlock, "_type"> | null;
};

/** Immagine inserita nel corpo di una comunicazione via email. */
export type EmailContentImage = SanityImage & {
  _type: "emailImage";
  _key: string;
};

/** Pulsante primario di una comunicazione. O completo o assente. */
export type EmailCta = {
  label?: string | null;
  href?: string | null;
};

/**
 * L'evento a cui una comunicazione si riferisce, con i moduli che ospita: da
 * quelli si ricavano i destinatari.
 */
export type CommunicationEvent = {
  _id: string;
  title: string;
  slug: string;
  dateStart: string;
  dateEnd?: string | null;
  forms: { _key: string; heading?: string | null; capacity?: number | null }[];
};

/** Risultato di `COMMUNICATIONS_QUERY`: quel che basta a elencarle. */
export type EventCommunicationSummary = {
  _id: string;
  _updatedAt: string;
  subject: string;
  preheader?: string | null;
  cta?: EmailCta | null;
  event: CommunicationEvent | null;
};

/** Risultato di `COMMUNICATION_BY_ID_QUERY`: con il testo da comporre. */
export type EventCommunicationDocument = EventCommunicationSummary & {
  body?: PortableTextBlock[] | null;
};
