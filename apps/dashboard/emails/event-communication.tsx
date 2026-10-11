import { Button, Hr, Link, Section, Text } from "@react-email/components";
import { PortableText, type PortableTextBlock } from "next-sanity";

import { EmailLayout } from "./components/layout";
import { emailPortableTextComponents } from "./components/portable-text";
import * as s from "./theme";

export interface EventCommunicationEmailProps {
  /** Oggetto della mail: fa anche da titolo in cima al corpo */
  subject: string;
  /** Riga grigia accanto all'oggetto nella lista della posta */
  preheader?: string | null;
  eventTitle: string;
  /** Il corpo scritto nello Studio, con le immagini già risolte */
  body: PortableTextBlock[];
  cta?: { label: string; href: string } | null;
  /** Pagina che smette di mandare comunicazioni su questo evento */
  unsubscribeUrl: string;
}

/**
 * Comunicazione della segreteria a chi si è iscritto a un evento.
 *
 * Il contenuto lo scrive lo staff nello Studio, quindi qui non c'è testo: c'è
 * la cornice. Stessa gerarchia delle altre mail — occhiello con l'evento,
 * titolo con l'oggetto, corpo, un pulsante solo — così una comunicazione si
 * riconosce come cosa del club anche prima di leggerla.
 *
 * In fondo la via d'uscita, come nella mail di conferma. È volutamente un link
 * e non un pulsante: il primario deve restare uno. E la parola è «comunicazioni»,
 * non «iscrizione», perché sono due cose diverse — chi si toglie dalle mail
 * all'evento ci viene lo stesso, e il suo posto resta suo.
 */
export function EventCommunicationEmail({
  subject,
  preheader,
  eventTitle,
  body,
  cta,
  unsubscribeUrl,
}: EventCommunicationEmailProps) {
  return (
    <EmailLayout preview={preheader || subject}>
      <Text style={s.eyebrow}>{eventTitle}</Text>
      <Text style={s.heading}>{subject}</Text>

      <PortableText value={body} components={emailPortableTextComponents} />

      {cta && (
        <Section style={{ padding: "8px 0" }}>
          <Button href={cta.href} style={s.button}>
            {cta.label}
          </Button>
        </Section>
      )}

      <Hr style={s.divider} />

      <Text style={{ ...s.footerText, margin: 0 }}>
        Ricevi questa mail perché ti sei iscritto a «{eventTitle}». Se
        preferisci non ricevere altre comunicazioni su questo evento,{" "}
        <Link href={unsubscribeUrl} style={s.link}>
          disiscriviti qui
        </Link>
        : la tua iscrizione e il tuo posto restano validi.
      </Text>
    </EmailLayout>
  );
}

EventCommunicationEmail.PreviewProps = {
  subject: "Il torneo si sposta alle 18:00",
  preheader: "Cambia solo l'orario: campo e formula restano quelli.",
  eventTitle: "Torneo di fine estate",
  cta: {
    label: "Rivedi i dettagli",
    href: "https://www.asdpadelsport.com/events/torneo-di-fine-estate",
  },
  unsubscribeUrl:
    "https://www.asdpadelsport.com/events/torneo-di-fine-estate/comunicazioni/disiscriviti?token=8f14e45f-ceea-467a-9575-7f1c4a1b2c3d",
  body: [
    {
      _type: "block",
      _key: "a1",
      style: "normal",
      children: [
        {
          _type: "span",
          _key: "a1s",
          text: "Ciao, una sola novità: per via del caldo abbiamo spostato l'inizio dalle 16:00 alle 18:00. Il resto non cambia.",
          marks: [],
        },
      ],
      markDefs: [],
    },
    {
      _type: "block",
      _key: "a2",
      style: "h3",
      children: [
        { _type: "span", _key: "a2s", text: "Cosa portare", marks: [] },
      ],
      markDefs: [],
    },
    {
      _type: "block",
      _key: "a3",
      style: "normal",
      listItem: "bullet",
      children: [
        {
          _type: "span",
          _key: "a3s",
          text: "Racchetta e scarpe da campo",
          marks: [],
        },
      ],
      markDefs: [],
    },
    {
      _type: "block",
      _key: "a4",
      style: "normal",
      listItem: "bullet",
      children: [
        {
          _type: "span",
          _key: "a4s",
          text: "Una maglietta di ricambio",
          marks: [],
        },
      ],
      markDefs: [],
    },
    {
      _type: "block",
      _key: "a5",
      style: "normal",
      children: [
        { _type: "span", _key: "a5s", text: "Trovi il ", marks: [] },
        {
          _type: "span",
          _key: "a5l",
          text: "tabellone aggiornato",
          marks: ["l1"],
        },
        {
          _type: "span",
          _key: "a5e",
          text: " sulla pagina dell'evento.",
          marks: [],
        },
      ],
      markDefs: [
        {
          _type: "link",
          _key: "l1",
          href: "https://www.asdpadelsport.com/events/torneo-di-fine-estate",
        },
      ],
    },
  ] as unknown as PortableTextBlock[],
} satisfies EventCommunicationEmailProps;

export default EventCommunicationEmail;
