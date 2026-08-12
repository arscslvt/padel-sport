import { UsersIcon } from "@sanity/icons/Users";
import { defineField, defineType } from "sanity";

import { RsvpFormInput } from "@/sanity/components/rsvp-form-input";

/**
 * Modulo di iscrizione inseribile nel corpo di un evento.
 *
 * Vive dentro `blockContent`, quindi comparire o meno è una scelta di chi
 * scrive l'articolo: se il blocco non c'è, la pagina non chiede niente a
 * nessuno. Un evento può ospitarne più d'uno (per esempio uno per categoria):
 * ogni blocco raccoglie le sue iscrizioni, distinte dal `_key`.
 *
 * Qui sta solo la configurazione. Le iscrizioni sono su Convex — vedi
 * `packages/backend/convex/tables/eventRsvps.ts` per il perché.
 */
export const rsvpForm = defineType({
  name: "rsvpForm",
  title: "Modulo di iscrizione",
  type: "object",
  icon: UsersIcon,
  components: { input: RsvpFormInput },
  fields: [
    defineField({
      name: "heading",
      title: "Titolo del modulo",
      type: "string",
      description: "Mostrato sopra i campi. Es. «Partecipi al torneo?»",
      initialValue: "Segnala la tua presenza",
      validation: (rule) => rule.required().max(80),
    }),
    defineField({
      name: "description",
      title: "Testo introduttivo",
      type: "text",
      rows: 2,
      description:
        "Facoltativo. Una riga per spiegare a cosa serve l'iscrizione.",
      validation: (rule) => rule.max(300),
    }),
    defineField({
      name: "capacity",
      title: "Posti disponibili",
      type: "number",
      description:
        "Facoltativo. Lascia vuoto per iscrizioni illimitate. Contano anche gli accompagnatori.",
      validation: (rule) => rule.integer().min(1),
    }),
    defineField({
      name: "maxGuests",
      title: "Accompagnatori massimi",
      type: "number",
      description:
        "Quante persone può portare con sé chi si iscrive. Metti 0 per accettare solo iscrizioni singole.",
      initialValue: 3,
      validation: (rule) => rule.required().integer().min(0).max(10),
    }),
    defineField({
      name: "closesAt",
      title: "Chiusura iscrizioni",
      type: "datetime",
      description:
        "Facoltativa. Passata questa data il modulo resta visibile ma non accetta più iscrizioni.",
    }),
    defineField({
      name: "successMessage",
      title: "Messaggio di conferma",
      type: "string",
      description:
        "Facoltativo. Mostrato dopo l'invio al posto del testo predefinito.",
      validation: (rule) => rule.max(160),
    }),
  ],
  preview: {
    select: {
      heading: "heading",
      capacity: "capacity",
      closesAt: "closesAt",
    },
    prepare({ heading, capacity, closesAt }) {
      const details = [
        capacity ? `${capacity} posti` : "Posti illimitati",
        closesAt
          ? `chiude il ${new Date(closesAt).toLocaleDateString("it-IT", {
              day: "2-digit",
              month: "short",
            })}`
          : null,
      ].filter(Boolean);

      return {
        title: heading || "Modulo di iscrizione",
        subtitle: details.join(" · "),
      };
    },
  },
});
