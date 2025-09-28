import { defineField, defineType } from "sanity";

export const eventType = defineType({
  name: "event",
  title: "Eventi",
  type: "document",
  fields: [
    defineField({
      name: "image",
      title: "Immagine di banner",
      type: "image",
      options: {
        hotspot: true,
      },
    }),
    defineField({
      name: "slug",
      type: "slug",
      options: {
        source: "name",
        maxLength: 96,
      },
    }),
    defineField({
      name: "name",
      title: "Nome evento",
      type: "string",
    }),
    defineField({
      name: "eventDateTime",
      title: "Programmazione",
      type: "object",
      fields: [
        {
          name: "datetime",
          title: "Quando si svolge l'evento?",
          type: "datetime",
          options: {
            dateFormat: "YYYY-MM-DD",
            timeFormat: "HH:mm",
          },
          validation: (Rule) => Rule.required(),
        },
        {
          name: "useTime",
          title: "Includi orario?",
          type: "boolean",
          initialValue: false,
        },
      ],
    }),
    defineField({
      title: "Descrivi l'evento",
      name: "content",
      type: "array",
      of: [{ type: "block" }],
    }),
  ],
});
