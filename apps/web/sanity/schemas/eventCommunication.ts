import { EnvelopeIcon } from "@sanity/icons/Envelope";
import { defineField, defineType } from "sanity";

/**
 * Una comunicazione da mandare via email agli iscritti a un evento.
 *
 * Si scrive qui e si manda dalla dashboard: sono due gesti distinti di
 * proposito. Lo Studio salva la bozza a ogni battuta, quindi «al salvataggio»
 * non è nemmeno un momento identificabile; e pubblicare si disfa, mandare una
 * mail no. **Pubblicare significa «pronta», non «inviata»**: finché non è
 * pubblicata la dashboard non la vede nemmeno, perché il client Sanity del
 * sito legge con `perspective: "published"`.
 *
 * Lo stato degli invii — a chi, quando, com'è andata — sta su Convex, in
 * `eventCommunications`: qui c'è solo il contenuto.
 */
export const eventCommunication = defineType({
  name: "eventCommunication",
  title: "Comunicazione",
  type: "document",
  icon: EnvelopeIcon,
  fields: [
    defineField({
      name: "event",
      title: "Evento",
      type: "reference",
      to: [{ type: "event" }],
      description:
        "A quale evento si riferisce. I destinatari saranno gli iscritti ai suoi moduli di iscrizione.",
      // Riferimento e non slug: resta valido anche se l'indirizzo dell'evento
      // cambia, come già fa `eventId` su Convex.
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "subject",
      title: "Oggetto",
      type: "string",
      description:
        "La riga che si legge nella lista della posta. Meglio corta e concreta: «Il torneo si sposta alle 18».",
      validation: (rule) => rule.required().max(120),
    }),
    defineField({
      name: "preheader",
      title: "Anteprima",
      type: "string",
      description:
        "Facoltativa. La riga grigia che i client di posta mostrano accanto all'oggetto. Se la lasci vuota mostrano l'inizio del testo.",
      validation: (rule) => rule.max(140),
    }),
    defineField({
      name: "body",
      title: "Testo",
      type: "emailContent",
      validation: (rule) => rule.required().min(1),
    }),
    defineField({
      name: "cta",
      title: "Pulsante",
      type: "object",
      description:
        "Facoltativo. Uno solo: due pulsanti primari nella stessa mail non sono una scelta, sono un'esitazione.",
      options: { collapsible: true, collapsed: true },
      fields: [
        defineField({
          name: "label",
          title: "Testo del pulsante",
          type: "string",
          validation: (rule) => rule.max(40),
        }),
        defineField({
          name: "href",
          title: "Indirizzo",
          type: "url",
          description: "Indirizzo completo, con https://",
          validation: (rule) =>
            rule.uri({ scheme: ["http", "https", "mailto", "tel"] }),
        }),
      ],
      // O tutti e due o nessuno: un pulsante senza indirizzo non porta da
      // nessuna parte, un indirizzo senza testo non si vede.
      validation: (rule) =>
        rule.custom((cta?: { label?: string; href?: string }) => {
          if (!cta?.label && !cta?.href) return true;
          if (cta.label && cta.href) return true;
          return "Il pulsante vuole sia il testo sia l'indirizzo.";
        }),
    }),
  ],
  preview: {
    select: {
      title: "subject",
      eventTitle: "event.title",
      dateStart: "event.dateStart",
    },
    prepare({ title, eventTitle, dateStart }) {
      const date = dateStart
        ? new Date(dateStart).toLocaleDateString("it-IT", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          })
        : null;

      return {
        title: title || "Senza oggetto",
        subtitle:
          [eventTitle, date].filter(Boolean).join(" · ") || "Senza evento",
      };
    },
  },
});
