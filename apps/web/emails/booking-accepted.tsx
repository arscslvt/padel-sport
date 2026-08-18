import { Button, Img, Section, Text } from "@react-email/components";

import { Detail, EmailLayout } from "./components/layout";
import * as s from "./theme";

export interface BookingAcceptedEmailProps {
  /** Nome di chi riceve la mail: chi ha prenotato o un compagno di squadra. */
  recipientName: string;
  isBooker: boolean;
  bookedBy: string;
  dayLabel: string;
  timeLabel: string;
  court?: string;
  players: string[];
  /** Posti ancora da riempire: sotto, il club dice che ci pensa lui. */
  missing: number;
  code: string;
  qrUrl: string;
  bookingUrl: string;
}

/**
 * La struttura ha confermato: il campo è vostro.
 *
 * È l'unica mail che porta il QR, ed è voluto — riceverlo *è* la conferma.
 * Finché la prenotazione è in esame non esiste niente da mostrare all'ingresso,
 * e un QR che arriva prima insegnerebbe al cliente a presentarsi senza aspettare
 * il via libera.
 *
 * Il QR è un'immagine remota e non un allegato inline: i client di posta
 * scartano i data URI. In allegato ci finisce comunque lo stesso PNG, per chi
 * blocca le immagini.
 */
export function BookingAcceptedEmail({
  recipientName,
  isBooker,
  bookedBy,
  dayLabel,
  timeLabel,
  court,
  players,
  missing,
  code,
  qrUrl,
  bookingUrl,
}: BookingAcceptedEmailProps) {
  const firstName = recipientName.split(" ")[0] || recipientName;

  return (
    <EmailLayout preview={`Campo confermato: ${dayLabel}, ${timeLabel}.`}>
      <Text style={s.eyebrow}>Prenotazione confermata</Text>
      <Text style={s.heading}>Ci vediamo in campo, {firstName}.</Text>
      <Text style={s.paragraph}>
        {isBooker
          ? "Abbiamo confermato la tua prenotazione: il campo è vostro. Mostra questo codice all'ingresso — lo trovi anche qui sotto in chiaro, se il QR non si legge."
          : `${bookedBy} ha prenotato un campo e ti ha messo in squadra. La struttura ha confermato: mostra questo codice all'ingresso, vale per tutti e quattro.`}
      </Text>

      <Section style={{ ...s.panel, textAlign: "center" as const }}>
        <Img
          src={qrUrl}
          alt={`QR della prenotazione ${code}`}
          width="200"
          height="200"
          style={{
            backgroundColor: s.color.background,
            borderRadius: "12px",
            display: "block",
            margin: "0 auto 12px",
            padding: "12px",
          }}
        />
        <Text style={s.detailLabel}>Codice prenotazione</Text>
        <Text
          style={{ ...s.detailValue, fontSize: "22px", letterSpacing: "0.2em" }}
        >
          {code}
        </Text>
      </Section>

      <Section style={s.panel}>
        <Detail label="Quando" value={`${dayLabel}, ${timeLabel}`} />
        {court && <Detail label="Campo" value={court} />}
        <Detail label="In campo" value={players.join(", ")} />
      </Section>

      {missing > 0 && (
        <Text style={s.paragraph}>
          {missing === 1
            ? "Manca un giocatore"
            : `Mancano ${missing} giocatori`}
          : ci pensiamo noi a cercare chi gioca al vostro livello.
        </Text>
      )}

      <Section style={{ paddingBottom: "8px" }}>
        <Button href={bookingUrl} style={s.button}>
          Vedi la prenotazione
        </Button>
      </Section>

      <Text style={s.paragraph}>
        Devi disdire o spostare? Chiamaci: fino a due ore prima facciamo ancora
        in tempo a riassegnare il campo.
      </Text>
    </EmailLayout>
  );
}

BookingAcceptedEmail.PreviewProps = {
  recipientName: "Mario Rossi",
  isBooker: true,
  bookedBy: "Mario Rossi",
  dayLabel: "Lunedì 3 agosto",
  timeLabel: "18:30 – 20:00",
  court: "Campo 1",
  players: ["Mario Rossi", "Luca Bianchi", "Sara Verdi"],
  missing: 1,
  code: "7F2K9Q",
  qrUrl: "https://asdpadelsport.com/api/bookings/7F2K9Q/qr",
  bookingUrl: "https://asdpadelsport.com/booking/7F2K9Q",
} satisfies BookingAcceptedEmailProps;

export default BookingAcceptedEmail;
