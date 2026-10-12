import { Button, Section, Text } from "@react-email/components";

import { Detail, EmailLayout } from "./components/layout";
import * as s from "./theme";

export interface BookingRescheduledEmailProps {
  /** Nome di chi riceve la mail: chi ha prenotato o un compagno di squadra. */
  recipientName: string;
  isBooker: boolean;
  bookedBy: string;
  dayLabel: string;
  /** L'orario nuovo. */
  timeLabel: string;
  /** L'orario di prima, per dire cosa cambia. */
  previousTimeLabel: string;
  court?: string;
  /** Prenotazione già confermata: il QR che ha in mano resta valido. */
  accepted: boolean;
  bookingUrl: string;
  phone: string;
}

/**
 * La struttura ha spostato l'orario della partita, nello stesso giorno.
 *
 * La notizia sta tutta in cima, vecchio e nuovo orario uno sopra l'altro: chi
 * la apre deve capire in un colpo d'occhio a che ora presentarsi. Il codice e
 * il QR non cambiano, e lo si dice, perché è la prima domanda che viene.
 */
export function BookingRescheduledEmail({
  recipientName,
  isBooker,
  bookedBy,
  dayLabel,
  timeLabel,
  previousTimeLabel,
  court,
  accepted,
  bookingUrl,
  phone,
}: BookingRescheduledEmailProps) {
  const firstName = recipientName.split(" ")[0] || recipientName;

  return (
    <EmailLayout preview={`Nuovo orario: ${dayLabel}, ${timeLabel}.`}>
      <Text style={s.eyebrow}>Orario cambiato</Text>
      <Text style={s.heading}>{firstName}, la partita cambia orario.</Text>
      <Text style={s.paragraph}>
        {isBooker
          ? "Abbiamo spostato l'orario della tua partita. Il giorno resta lo stesso."
          : `Abbiamo spostato l'orario della partita prenotata da ${bookedBy}. Il giorno resta lo stesso.`}
      </Text>

      <Section style={s.panel}>
        <Detail label="Nuovo orario" value={`${dayLabel}, ${timeLabel}`} />
        <Detail label="Prima era" value={previousTimeLabel} />
        {court && <Detail label="Campo" value={court} />}
      </Section>

      <Text style={s.paragraph}>
        {accepted
          ? "Il codice QR che hai già ricevuto resta valido. Mostralo all'ingresso come sempre."
          : "La prenotazione è ancora in attesa di conferma. Ti scriviamo appena è confermata, con il codice QR per entrare."}
      </Text>

      <Section style={{ paddingBottom: "8px" }}>
        <Button href={bookingUrl} style={s.button}>
          Vedi la prenotazione
        </Button>
      </Section>

      <Text style={s.paragraph}>
        Il nuovo orario non ti va bene? Chiamaci al {phone} e troviamo insieme
        un'altra soluzione.
      </Text>
    </EmailLayout>
  );
}

BookingRescheduledEmail.PreviewProps = {
  recipientName: "Mario Rossi",
  isBooker: true,
  bookedBy: "Mario Rossi",
  dayLabel: "Lunedì 3 agosto",
  timeLabel: "19:00 – 20:30",
  previousTimeLabel: "18:30 – 20:00",
  court: "Campo 1",
  accepted: true,
  bookingUrl: "https://asdpadelsport.com/booking/7F2K9Q",
  phone: "333 123 4567",
} satisfies BookingRescheduledEmailProps;

export default BookingRescheduledEmail;
