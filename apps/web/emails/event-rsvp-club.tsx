import { Button, Section, Text } from "@react-email/components";

import { Detail, EmailLayout } from "./components/layout";
import * as s from "./theme";

export interface EventRsvpClubEmailProps {
  name: string;
  email: string;
  eventTitle: string;
  eventDateLabel: string;
  eventUrl: string;
  guests: number;
  seats: number;
  /** Posti occupati in totale dopo questa iscrizione */
  seatsTaken: number;
  capacity: number | null;
}

/**
 * Avviso alla segreteria: chi si è iscritto e come stanno i posti dopo di lui,
 * così si capisce a colpo d'occhio se l'evento sta per riempirsi.
 */
export function EventRsvpClubEmail({
  name,
  email,
  eventTitle,
  eventDateLabel,
  eventUrl,
  guests,
  seats,
  seatsTaken,
  capacity,
}: EventRsvpClubEmailProps) {
  const remaining =
    capacity === null ? null : Math.max(capacity - seatsTaken, 0);

  return (
    <EmailLayout preview={`${name} si è iscritto a ${eventTitle}.`}>
      <Text style={s.eyebrow}>Nuova iscrizione</Text>
      <Text style={s.heading}>{eventTitle}</Text>
      <Text style={s.paragraph}>
        {name} ha confermato la presenza per{" "}
        {seats === 1 ? "sé" : `${seats} persone`}.
        {remaining === null
          ? ` In totale sono attese ${seatsTaken} persone.`
          : remaining === 0
            ? " I posti sono esauriti."
            : ` Restano ${remaining} posti su ${capacity}.`}
      </Text>

      <Section style={s.panel}>
        <Detail label="Nome completo" value={name} />
        <Detail label="Email" value={email} />
        <Detail
          label="Accompagnatori"
          value={guests === 0 ? "Nessuno" : String(guests)}
        />
        <Detail label="Quando" value={eventDateLabel} />
        <Detail
          label="Posti occupati"
          value={
            capacity === null
              ? String(seatsTaken)
              : `${seatsTaken} / ${capacity}`
          }
        />
      </Section>

      <Section style={{ paddingBottom: "8px" }}>
        <Button href={eventUrl} style={s.button}>
          Apri l'evento
        </Button>
      </Section>
    </EmailLayout>
  );
}

EventRsvpClubEmail.PreviewProps = {
  name: "Mario Rossi",
  email: "mario.rossi@email.com",
  eventTitle: "Torneo di fine estate",
  eventDateLabel: "sabato 5 settembre 2026, 18:00",
  eventUrl: "https://www.asdpadelsport.com/events/torneo-di-fine-estate",
  guests: 2,
  seats: 3,
  seatsTaken: 27,
  capacity: 32,
} satisfies EventRsvpClubEmailProps;

export default EventRsvpClubEmail;
