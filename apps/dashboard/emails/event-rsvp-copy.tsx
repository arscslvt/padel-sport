import { Button, Hr, Link, Section, Text } from "@react-email/components";

import { Detail, EmailLayout } from "./components/layout";
import * as s from "./theme";

export interface EventRsvpCopyEmailProps {
  name: string;
  eventTitle: string;
  eventDateLabel: string;
  eventUrl: string;
  guests: number;
  seats: number;
  /** Pagina di conferma dell'annullamento, con il token dell'iscrizione. */
  cancelUrl: string;
}

/**
 * Conferma per chi si è iscritto: vale da promemoria dell'appuntamento, quindi
 * ripete data e numero di persone senza chiedere di rispondere.
 *
 * In fondo c'è la via d'uscita. È un link e non un pulsante di proposito: il
 * pulsante primario deve restare uno solo, e l'annullamento è la strada che si
 * prende di rado. Porta a una pagina di conferma, non annulla da sé — i client
 * di posta precaricano i link, e un annullamento a un clic scatterebbe da solo.
 */
export function EventRsvpCopyEmail({
  name,
  eventTitle,
  eventDateLabel,
  eventUrl,
  guests,
  seats,
  cancelUrl,
}: EventRsvpCopyEmailProps) {
  const firstName = name.split(" ")[0] || name;

  return (
    <EmailLayout preview={`La tua presenza a ${eventTitle} è registrata.`}>
      <Text style={s.eyebrow}>Iscrizione confermata</Text>
      <Text style={s.heading}>Ci vediamo lì, {firstName}.</Text>
      <Text style={s.paragraph}>
        Abbiamo registrato la tua presenza a «{eventTitle}». Non serve
        rispondere a questa mail: se qualcosa cambia, trovi qui sotto tutto il
        necessario.
      </Text>

      <Section style={s.panel}>
        <Detail label="Evento" value={eventTitle} />
        <Detail label="Quando" value={eventDateLabel} />
        <Detail
          label="Persone"
          value={
            guests === 0
              ? "Solo tu"
              : `${seats} persone (tu + ${guests} ${guests === 1 ? "accompagnatore" : "accompagnatori"})`
          }
        />
      </Section>

      <Section style={{ paddingBottom: "8px" }}>
        <Button href={eventUrl} style={s.button}>
          Rivedi i dettagli
        </Button>
      </Section>

      <Hr style={s.divider} />

      <Text style={{ ...s.paragraph, margin: "0 0 4px" }}>
        <strong style={{ color: s.color.foreground }}>
          Non riesci più a venire?
        </strong>
      </Text>
      <Text style={s.paragraph}>
        Liberare il posto ci aiuta a farlo prendere a qualcun altro.{" "}
        <Link href={cancelUrl} style={s.link}>
          Annulla la tua iscrizione
        </Link>
        .
      </Text>
    </EmailLayout>
  );
}

EventRsvpCopyEmail.PreviewProps = {
  name: "Mario Rossi",
  eventTitle: "Torneo di fine estate",
  eventDateLabel: "sabato 5 settembre 2026, 18:00",
  eventUrl: "https://www.asdpadelsport.com/events/torneo-di-fine-estate",
  guests: 2,
  seats: 3,
  cancelUrl:
    "https://www.asdpadelsport.com/events/torneo-di-fine-estate/rsvp/annulla?token=8f14e45f-ceea-467a-9575-7f1c4a1b2c3d",
} satisfies EventRsvpCopyEmailProps;

export default EventRsvpCopyEmail;
