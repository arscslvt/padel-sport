import { CalendarIcon } from "@sanity/icons/Calendar";
import { defineField, defineType } from "sanity";

const SUGGESTED_TAGS = [
  "Torneo",
  "Corso",
  "Lezione",
  "Festa",
  "Comunicazione",
  "Community",
  "Sponsor",
];

export const event = defineType({
  name: "event",
  title: "Evento",
  type: "document",
  icon: CalendarIcon,
  groups: [
    { name: "content", title: "Contenuto", default: true },
    { name: "dates", title: "Date" },
    { name: "seo", title: "SEO" },
  ],
  fields: [
    defineField({
      name: "banner",
      title: "Banner",
      type: "image",
      group: "content",
      description: "Facoltativo. Immagine di copertina dell'articolo.",
      options: { hotspot: true },
      fields: [
        defineField({
          name: "alt",
          title: "Testo alternativo",
          type: "string",
        }),
        defineField({
          name: "caption",
          title: "Didascalia",
          type: "string",
        }),
      ],
    }),
    defineField({
      name: "title",
      title: "Titolo",
      type: "string",
      group: "content",
      validation: (rule) => rule.required().max(120),
    }),
    defineField({
      name: "slug",
      title: "Slug",
      type: "slug",
      group: "content",
      description: "Determina l'indirizzo dell'articolo: /events/<slug>",
      options: {
        source: "title",
        maxLength: 96,
      },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "excerpt",
      title: "Breve descrizione",
      type: "text",
      rows: 3,
      group: "content",
      description:
        "Mostrata nella card su /events e usata come descrizione SEO di riserva.",
      validation: (rule) => rule.required().max(200),
    }),
    defineField({
      name: "dateStart",
      title: "Data inizio",
      type: "datetime",
      group: "dates",
      description: "Per gli eventi di un solo giorno, è la data esatta.",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "dateEnd",
      title: "Data fine",
      type: "datetime",
      group: "dates",
      description: "Facoltativa. Compilala solo per gli eventi su più giorni.",
      validation: (rule) =>
        rule.custom((dateEnd, context) => {
          const dateStart = (context.document as { dateStart?: string })
            ?.dateStart;

          if (!dateEnd || !dateStart) return true;

          return new Date(dateEnd) > new Date(dateStart)
            ? true
            : "La data di fine deve essere successiva alla data di inizio.";
        }),
    }),
    defineField({
      name: "body",
      title: "Corpo dell'articolo",
      type: "blockContent",
      group: "content",
    }),
    defineField({
      name: "tags",
      title: "Tag",
      type: "array",
      group: "content",
      of: [{ type: "string" }],
      options: {
        layout: "tags",
        list: SUGGESTED_TAGS,
      },
    }),
    defineField({
      name: "highlighted",
      title: "Metti in evidenza",
      type: "boolean",
      group: "content",
      description:
        "Gli articoli in evidenza compaiono per primi con l'ordinamento «Più rilevanti».",
      initialValue: false,
    }),
    defineField({
      name: "seoDescription",
      title: "Descrizione SEO",
      type: "text",
      rows: 3,
      group: "seo",
      description:
        "Facoltativa. Sostituisce la breve descrizione nei meta tag. Max 160 caratteri.",
      validation: (rule) => rule.max(160),
    }),
  ],
  orderings: [
    {
      title: "Data (dalla più recente)",
      name: "dateStartDesc",
      by: [{ field: "dateStart", direction: "desc" }],
    },
    {
      title: "Data (dalla più vecchia)",
      name: "dateStartAsc",
      by: [{ field: "dateStart", direction: "asc" }],
    },
    {
      title: "Titolo (A-Z)",
      name: "titleAsc",
      by: [{ field: "title", direction: "asc" }],
    },
  ],
  preview: {
    select: {
      title: "title",
      dateStart: "dateStart",
      dateEnd: "dateEnd",
      highlighted: "highlighted",
      media: "banner",
    },
    prepare({ title, dateStart, dateEnd, highlighted, media }) {
      const format = (value?: string) =>
        value
          ? new Date(value).toLocaleDateString("it-IT", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            })
          : null;

      const start = format(dateStart);
      const end = format(dateEnd);
      const range = [start, end].filter(Boolean).join(" → ");

      return {
        title: highlighted ? `★ ${title}` : title,
        subtitle: range || "Senza data",
        media,
      };
    },
  },
});
