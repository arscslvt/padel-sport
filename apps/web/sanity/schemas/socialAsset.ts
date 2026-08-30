import { ImagesIcon } from "@sanity/icons/Images";
import { defineField, defineType } from "sanity";

/**
 * Le fotografie che l'IA può usare come sfondo delle locandine social.
 *
 * Stanno su Sanity e non su Convex perché sceglierle e descriverle è un lavoro
 * editoriale, e lo Studio è il posto dove quel lavoro si fa. Convex le legge in
 * sola lettura, via GROQ sull'API pubblica.
 *
 * Il campo che conta davvero è la **descrizione**: il modello non guarda le
 * fotografie, legge cosa c'è scritto qui. Una libreria con descrizioni pigre
 * produce scelte pigre, ed è l'unico punto in cui la qualità dipende da chi
 * carica invece che dal codice.
 */

/** A cosa somiglia la foto: serve al modello per capire quando ha senso. */
const USAGE_TAGS = [
  { title: "Campo da gioco", value: "campo" },
  { title: "Giocatori in azione", value: "giocatori" },
  { title: "Torneo o premiazione", value: "torneo" },
  { title: "Luce della sera", value: "sera" },
  { title: "Dettaglio (pala, pallina, rete)", value: "dettaglio" },
  { title: "Esterni e struttura", value: "esterno" },
  { title: "Festa o socialità", value: "festa" },
  { title: "Corso o lezione", value: "corso" },
];

/**
 * A quali contenuti può accompagnarsi.
 *
 * Una delimitazione dura e voluta: la coppa del torneo non deve finire sopra
 * «campi liberi domani». Lasciare tutto libero avrebbe scaricato sul modello
 * una scelta che una persona fa meglio e una volta sola.
 */
const KIND_OPTIONS = [
  { title: "Va bene per tutto", value: "qualsiasi" },
  { title: "Risultati di torneo", value: "tournament_result" },
  { title: "Campi liberi domani", value: "courts_tomorrow" },
  { title: "Consigli tecnici", value: "tip" },
  { title: "Nuovo evento", value: "event_announce" },
  { title: "Promemoria evento", value: "event_reminder" },
  { title: "Partita che cerca giocatori", value: "open_match" },
  { title: "Richiesta dal modulo del sito", value: "player_request" },
];

export const socialAsset = defineType({
  name: "socialAsset",
  title: "Foto per i social",
  type: "document",
  icon: ImagesIcon,
  fields: [
    defineField({
      name: "image",
      title: "Fotografia",
      type: "image",
      options: { hotspot: true },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "title",
      title: "Nome",
      type: "string",
      description: "Solo per ritrovarla in questo elenco.",
      validation: (rule) => rule.required().max(60),
    }),
    defineField({
      name: "description",
      title: "Cosa si vede",
      type: "text",
      rows: 2,
      description:
        "Descrivila come la racconteresti a chi non la vede. È il testo che l'IA legge per decidere se questa foto c'entra con quello che sta scrivendo: «due giocatori a rete al tramonto, campo blu» funziona, «bella foto» no.",
      validation: (rule) => rule.required().min(15).max(200),
    }),
    defineField({
      name: "usage",
      title: "Soggetto",
      type: "array",
      of: [{ type: "string" }],
      options: { list: USAGE_TAGS, layout: "tags" },
    }),
    defineField({
      name: "kinds",
      title: "Contenuti a cui può accompagnarsi",
      type: "array",
      of: [{ type: "string" }],
      options: { list: KIND_OPTIONS, layout: "grid" },
      description:
        "Lasciando vuoto vale per tutti. Restringi quando la foto è troppo caratterizzata per stare ovunque.",
    }),
    defineField({
      name: "hasFaces",
      title: "Ci sono volti riconoscibili",
      type: "boolean",
      initialValue: false,
      description:
        "Se spuntato, questa foto non verrà mai usata sui contenuti che parlano delle partite dei soci: quelli li pubblichiamo senza nomi, e una faccia riconoscibile rimetterebbe in circolo esattamente ciò che avevamo tolto dal testo.",
    }),
    defineField({
      name: "active",
      title: "In uso",
      type: "boolean",
      initialValue: true,
      description: "Toglila dal giro senza cancellarla.",
    }),
  ],
  preview: {
    select: { title: "title", subtitle: "description", media: "image" },
  },
});
