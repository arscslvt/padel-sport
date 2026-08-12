import { defineQuery } from "next-sanity";

// `...` conserva `asset`, `hotspot` e `crop`, che servono a @sanity/image-url
// per generare i ritagli. `lqip` alimenta il blur placeholder di next/image.
const imageFields = /* groq */ `
  ...,
  "lqip": asset->metadata.lqip,
  "aspectRatio": asset->metadata.dimensions.aspectRatio
`;

const cardFields = /* groq */ `
  _id,
  title,
  "slug": slug.current,
  excerpt,
  dateStart,
  dateEnd,
  highlighted,
  tags,
  banner { ${imageFields} }
`;

/** Tutti gli eventi pubblicati, dal più recente. Ricerca e ordinamento avvengono lato client. */
export const EVENTS_QUERY = defineQuery(`
  *[_type == "event" && defined(slug.current)] | order(dateStart desc) {
    ${cardFields}
  }
`);

/** Singolo evento con il corpo completo. */
export const EVENT_BY_SLUG_QUERY = defineQuery(`
  *[_type == "event" && slug.current == $slug][0] {
    ${cardFields},
    seoDescription,
    body[] {
      ...,
      _type == "contentImage" => { ${imageFields} }
    }
  }
`);

/** Solo i campi che servono a generare il file .ics. */
export const EVENT_CALENDAR_QUERY = defineQuery(`
  *[_type == "event" && slug.current == $slug][0] {
    _id,
    title,
    "slug": slug.current,
    excerpt,
    seoDescription,
    dateStart,
    dateEnd
  }
`);

/**
 * Configurazione di un singolo modulo di iscrizione.
 *
 * La usa la route delle iscrizioni per rileggere da Sanity posti, scadenza e
 * accompagnatori massimi: sono la parola dell'editor, non del browser, e
 * arrivare qui è l'unico modo per esserne sicuri.
 */
export const EVENT_RSVP_FORM_QUERY = defineQuery(`
  *[_type == "event" && slug.current == $slug][0] {
    _id,
    title,
    "slug": slug.current,
    dateStart,
    dateEnd,
    "form": body[_key == $key && _type == "rsvpForm"][0] {
      _key,
      heading,
      description,
      capacity,
      maxGuests,
      closesAt,
      successMessage
    }
  }
`);

/**
 * Gli eventi che hanno almeno un modulo di iscrizione, per il selettore della
 * dashboard.
 *
 * La lista parte da Sanity e non da Convex perché un evento con il modulo ma
 * ancora senza iscritti su Convex non esiste, e nel selettore deve comparire
 * lo stesso — con lo zero accanto.
 */
export const EVENTS_WITH_RSVP_QUERY = defineQuery(`
  *[_type == "event" && defined(slug.current) && count(body[_type == "rsvpForm"]) > 0]
    | order(dateStart desc) {
      _id,
      title,
      "slug": slug.current,
      dateStart,
      dateEnd,
      "forms": body[_type == "rsvpForm"] {
        _key,
        heading,
        capacity,
        maxGuests,
        closesAt
      }
    }
`);

/** Solo gli slug, per `generateStaticParams`. */
export const EVENT_SLUGS_QUERY = defineQuery(`
  *[_type == "event" && defined(slug.current)].slug.current
`);
