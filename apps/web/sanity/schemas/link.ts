import { defineArrayMember, defineField } from "sanity";

/**
 * L'annotazione «link» del rich text, in due varianti.
 *
 * Stanno insieme in un file perché sono la stessa cosa detta a due mezzi
 * diversi: se domani cambiano gli schemi ammessi, si cambiano qui una volta
 * invece di scoprire fra sei mesi che una delle due è rimasta indietro.
 */

function hrefField(allowRelative: boolean) {
  return defineField({
    name: "href",
    title: "URL",
    type: "url",
    validation: (rule) =>
      rule.required().uri({
        scheme: ["http", "https", "mailto", "tel"],
        allowRelative,
      }),
  });
}

/** Sul sito: ammette indirizzi interni e la scelta della nuova scheda. */
export const linkAnnotation = defineArrayMember({
  name: "link",
  title: "Link",
  type: "object",
  fields: [
    hrefField(true),
    defineField({
      name: "blank",
      title: "Apri in una nuova scheda",
      type: "boolean",
      initialValue: false,
    }),
  ],
});

/**
 * Nella posta: solo indirizzi assoluti, perché una mail non ha una pagina da
 * cui partire e «/events/torneo» non porterebbe da nessuna parte. E niente
 * interruttore sulla nuova scheda: come aprire un link lo decide il client di
 * posta, quindi sarebbe un comando che non comanda niente.
 */
export const emailLinkAnnotation = defineArrayMember({
  name: "link",
  title: "Link",
  type: "object",
  fields: [hrefField(false)],
});
