import { Button, Section, Text } from "@react-email/components";

import { Detail, EmailLayout } from "./components/layout";
import * as s from "./theme";

export interface BookingCancelledEmailProps {
  /** Nome di chi riceve la mail: chi aveva prenotato o un compagno. */
  recipientName: string;
  /** Falso per i compagni: la prenotazione non era la loro. */
  isBooker: boolean;
  /** `club` se ha annullato la struttura, `player` se chi aveva prenotato. */
  by: "club" | "player";
  bookedBy: string;
  dayLabel: string;
  timeLabel: string;
  court?: string;
  bookingUrl: string;
  phone: string;
}

/**
 * Prenotazione annullata.
 *
 * Vale soprattutto per i compagni di squadra: hanno ricevuto un QR e si
 * presenterebbero in struttura per un campo che non c'è più. Il QR non viene
 * ripetuto, e nemmeno il codice: qui non c'è più niente da mostrare
 * all'ingresso.
 */
export function BookingCancelledEmail({
  recipientName,
  isBooker,
  by,
  bookedBy,
  dayLabel,
  timeLabel,
  court,
  bookingUrl,
  phone,
}: BookingCancelledEmailProps) {
  const firstName = recipientName.split(" ")[0] || recipientName;

  return (
    <EmailLayout preview={`Prenotazione annullata: ${dayLabel}, ${timeLabel}.`}>
      <Text style={s.eyebrow}>Prenotazione annullata</Text>
      <Text style={s.heading}>
        {by === "club"
          ? `${firstName}, il campo non è più prenotato.`
          : `${firstName}, la partita è stata annullata.`}
      </Text>
      <Text style={s.paragraph}>
        {by === "club"
          ? isBooker
            ? "Abbiamo dovuto annullare la tua prenotazione. Ci dispiace: se vuoi rimediare subito, chiamaci e troviamo insieme un altro orario."
            : `La struttura ha annullato la prenotazione di ${bookedBy}. Il codice che avevi ricevuto non è più valido.`
          : isBooker
            ? "La tua prenotazione è stata annullata come richiesto. Il campo è tornato disponibile per altri."
            : `${bookedBy} ha annullato la prenotazione. Il codice che avevi ricevuto non è più valido.`}
      </Text>

      <Section style={s.panel}>
        <Detail label="Quando" value={`${dayLabel}, ${timeLabel}`} />
        {court && <Detail label="Campo" value={court} />}
        <Detail label="Prenotazione" value="Annullata" />
      </Section>

      <Section style={{ paddingBottom: "8px" }}>
        <Button href={bookingUrl} style={s.button}>
          Prenota un altro campo
        </Button>
      </Section>

      <Text style={s.paragraph}>
        Se pensi si tratti di un errore, chiamaci al {phone}: la sistemiamo
        insieme.
      </Text>
    </EmailLayout>
  );
}

BookingCancelledEmail.PreviewProps = {
  recipientName: "Mario Rossi",
  isBooker: true,
  by: "club",
  bookedBy: "Mario Rossi",
  dayLabel: "Lunedì 3 agosto",
  timeLabel: "18:30 – 20:00",
  court: "Campo 1",
  bookingUrl: "https://www.asdpadelsport.com/book",
  phone: "+39 320 175 5897",
} satisfies BookingCancelledEmailProps;

export default BookingCancelledEmail;
