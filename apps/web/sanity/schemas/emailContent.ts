import { ImageIcon } from "@sanity/icons/Image";
import { defineArrayMember, defineField, defineType } from "sanity";

import { emailLinkAnnotation } from "./link";

/**
 * Rich text del corpo di una comunicazione via email.
 *
 * Non riusa `blockContent` perché la posta è un mezzo più stretto del web, e
 * l'editor deve offrire solo quello che poi arriva davvero a destinazione:
 *
 * - niente `rsvpForm`: un modulo dentro una mail non funziona, e lasciarlo nel
 *   menu «+» vorrebbe dire farlo inserire per poi scartarlo in silenzio;
 * - niente `h4`: su 496px di colonna tre livelli di titolo sono già tanti;
 * - niente sottolineato, che nella posta si legge come un link, né `code`, che
 *   pretende un font monospaziato che Gmail non carica.
 *
 * Viene reso da `emails/components/portable-text.tsx`.
 */
export const emailContent = defineType({
  name: "emailContent",
  title: "Corpo della comunicazione",
  type: "array",
  of: [
    defineArrayMember({
      type: "block",
      styles: [
        { title: "Paragrafo", value: "normal" },
        { title: "Titolo", value: "h2" },
        { title: "Sottotitolo", value: "h3" },
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
        ],
        annotations: [emailLinkAnnotation],
      },
    }),
    defineArrayMember({
      name: "emailImage",
      title: "Immagine",
      type: "image",
      icon: ImageIcon,
      // Niente hotspot: nella mail l'immagine si mostra intera, non ritagliata,
      // quindi non c'è un punto da tenere al centro.
      options: { hotspot: false },
      fields: [
        defineField({
          name: "alt",
          title: "Testo alternativo",
          type: "string",
          description:
            "Obbligatorio: molti client di posta bloccano le immagini finché non le si accetta, e nel frattempo si legge solo questo.",
          validation: (rule) => rule.required(),
        }),
        defineField({
          name: "caption",
          title: "Didascalia",
          type: "string",
        }),
      ],
    }),
  ],
});
