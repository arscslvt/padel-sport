import type { EventWithRsvpForms } from "@/sanity/types";

/**
 * I moduli di iscrizione appiattiti, uno per riga.
 *
 * Vive qui e non dentro una pagina perché lo usano in due — l'elenco iscritti e
 * la lista arrivi — e devono per forza concordare: l'`id` che questa funzione
 * costruisce è anche il valore di `?form=` con cui le due pagine si passano la
 * selezione, e quello su cui atterra chi tocca l'avviso di una nuova iscrizione.
 * Due copie divergerebbero al primo ritocco, e a rompersi sarebbero i link.
 */
export type FormRow = {
  /** `eventId:blockKey` — la stessa forma che viaggia in `?form=`. */
  id: string;
  eventId: string;
  blockKey: string;
  eventTitle: string;
  eventSlug: string;
  dateStart: string;
  dateEnd?: string | null;
  heading?: string | null;
  capacity?: number | null;
  /** Accompagnatori ammessi dal modulo. Alla segreteria serve solo per dirlo. */
  maxGuests?: number | null;
  closesAt?: string | null;
  /** Compare nell'etichetta solo se l'evento ha più moduli: altrimenti è rumore. */
  showsHeading: boolean;
};

/**
 * Un modulo per riga: la coppia evento + blocco è la chiave con cui Convex
 * tiene le iscrizioni, e un evento può ospitare più di un modulo.
 */
export function flattenForms(events: EventWithRsvpForms[]): FormRow[] {
  return events.flatMap((event) =>
    event.forms.map((form) => ({
      id: `${event._id}:${form._key}`,
      eventId: event._id,
      blockKey: form._key,
      eventTitle: event.title,
      eventSlug: event.slug,
      dateStart: event.dateStart,
      dateEnd: event.dateEnd,
      heading: form.heading,
      capacity: form.capacity,
      maxGuests: form.maxGuests,
      closesAt: form.closesAt,
      showsHeading: event.forms.length > 1,
    })),
  );
}

/**
 * Il modulo scelto, dato quel che chiede `?form=`.
 *
 * Se il modulo non c'è più — evento spubblicato dallo Studio, blocco tolto dal
 * corpo — si ricade sul primo invece di mostrare una pagina vuota: il link può
 * essere vecchio di giorni, chi lo apre vuole comunque vedere qualcosa.
 */
export function initialFormId(forms: FormRow[], requested: string | null) {
  if (requested && forms.some((form) => form.id === requested)) {
    return requested;
  }
  return forms[0]?.id ?? "";
}
