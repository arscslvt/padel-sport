import { ImageIcon } from "@sanity/icons/Image";
import { defineArrayMember, defineField, defineType } from "sanity";

/**
 * Rich text del corpo articolo (Portable Text).
 * Viene renderizzato da `components/events/portable-text.tsx`.
 */
export const blockContent = defineType({
  name: "blockContent",
  title: "Corpo dell'articolo",
  type: "array",
  of: [
    defineArrayMember({
      type: "block",
      styles: [
        { title: "Paragrafo", value: "normal" },
        { title: "Titolo", value: "h2" },
        { title: "Sottotitolo", value: "h3" },
        { title: "Sezione", value: "h4" },
        { title: "Citazione", value: "blockquote" },
      ],
      lists: [
        { title: "Elenco puntato", value: "bullet" },
        { title: "Elenco numerato", value: "number" },
      ],
      marks: {
        decorators: [
          { title: "Grassetto", value: "strong" },
          { title: "Corsivo", value: "em" },
          { title: "Sottolineato", value: "underline" },
          { title: "Codice", value: "code" },
        ],
        annotations: [
          defineArrayMember({
            name: "link",
            title: "Link",
            type: "object",
            fields: [
              defineField({
                name: "href",
                title: "URL",
                type: "url",
                validation: (rule) =>
                  rule.required().uri({
                    scheme: ["http", "https", "mailto", "tel"],
                    allowRelative: true,
                  }),
              }),
              defineField({
                name: "blank",
                title: "Apri in una nuova scheda",
                type: "boolean",
                initialValue: false,
              }),
            ],
          }),
        ],
      },
    }),
    defineArrayMember({
      name: "contentImage",
      title: "Immagine",
      type: "image",
      icon: ImageIcon,
      options: { hotspot: true },
      fields: [
        defineField({
          name: "alt",
          title: "Testo alternativo",
          type: "string",
          description: "Descrive l'immagine per screen reader e SEO.",
          validation: (rule) => rule.required(),
        }),
        defineField({
          name: "caption",
          title: "Didascalia",
          type: "string",
        }),
      ],
    }),
    // Il modulo di iscrizione è un blocco come gli altri: chi scrive l'articolo
    // decide se inserirlo e in che punto del testo.
    defineArrayMember({ type: "rsvpForm" }),
  ],
});
