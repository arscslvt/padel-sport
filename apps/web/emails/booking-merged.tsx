import { Button, Section, Text } from "@react-email/components";

import { Detail, EmailLayout } from "./components/layout";
import * as s from "./theme";

export interface BookingMergedEmailProps {
  /** Nome di chi riceve la mail: chi ha prenotato o un compagno di squadra. */
  recipientName: string;
  isBooker: boolean;
  bookedBy: string;
  dayLabel: string;
  timeLabel: string;
  court?: string;
  /** La squadra di chi riceve la mail. */
  players: string[];
  /** Chi ha prenotato dall'altra parte, e i suoi giocatori. */
  partnerBookedBy: string;
  partnerPlayers: string[];
  /** Prenotazione già accettata dalla struttura: il QR è già nelle sue mani. */
  accepted: boolean;
  bookingUrl: string;
}

/**
 * Il club ha trovato i giocatori mancanti.
 *
 * È la risposta alla promessa fatta al momento della prenotazione: si poteva
 * prenotare anche in due, e ai mancanti ci pensava la struttura. Qui si dice
 * chi sono, per nome — nessun recapito: metterli in contatto non è compito di
 * una mail, e in campo si conoscono comunque.
 *
 * Niente QR, di proposito: quello arriva con la conferma e vale come lasciapassare
 * all'ingresso. Sapere con chi si gioca e avere il campo confermato sono due
 * notizie diverse, e questa mail non deve insegnare a presentarsi senza l'altra.
 */
export function BookingMergedEmail({
  recipientName,
  isBooker,
  bookedBy,
  dayLabel,
  timeLabel,
  court,
  players,
  partnerBookedBy,
  partnerPlayers,
  accepted,
  bookingUrl,
}: BookingMergedEmailProps) {
  const firstName = recipientName.split(" ")[0] || recipientName;
  const team = [...players, ...partnerPlayers];

  return (
    <EmailLayout preview={`Campo completo: ${dayLabel}, ${timeLabel}.`}>
      <Text style={s.eyebrow}>Campo completo</Text>
      <Text style={s.heading}>Abbiamo trovato gli altri, {firstName}.</Text>
      <Text style={s.paragraph}>
        {isBooker
          ? `Avevi lasciato dei posti liberi e ci eravamo presi l'incarico di riempirli: ci siamo riusciti. Giocherete con il gruppo di ${partnerBookedBy}, dello stesso orario.`
          : `${bookedBy} ti ha messo in squadra per questa partita, e la struttura ha completato il campo con il gruppo di ${partnerBookedBy}.`}
      </Text>

      <Section style={s.panel}>
        <Detail label="Quando" value={`${dayLabel}, ${timeLabel}`} />
        {court && <Detail label="Campo" value={court} />}
        <Detail label="In campo" value={team.join(", ")} />
        <Detail label="Si aggiungono" value={partnerPlayers.join(", ")} />
      </Section>

      <Text style={s.paragraph}>
        {accepted
          ? "Il codice QR che hai già ricevuto resta valido: è quello da mostrare all'ingresso."
          : "Ti confermiamo la prenotazione a breve: sarà quella mail a portarti il codice QR d'ingresso."}
      </Text>

      <Section style={{ paddingBottom: "8px" }}>
        <Button href={bookingUrl} style={s.button}>
          Vedi la prenotazione
        </Button>
      </Section>

      <Text style={s.paragraph}>
        Non ti va di giocare con altri? Chiamaci e rimettiamo le cose come
        stavano, finché siamo in tempo.
      </Text>
    </EmailLayout>
  );
}

BookingMergedEmail.PreviewProps = {
  recipientName: "Mario Rossi",
  isBooker: true,
  bookedBy: "Mario Rossi",
  dayLabel: "Lunedì 3 agosto",
  timeLabel: "18:30 – 20:00",
  court: "Campo 1",
  players: ["Mario Rossi", "Sara Verdi"],
  partnerBookedBy: "Luca Bianchi",
  partnerPlayers: ["Luca Bianchi", "Anna Neri"],
  accepted: false,
  bookingUrl: "https://asdpadelsport.com/booking/7F2K9Q",
} satisfies BookingMergedEmailProps;

export default BookingMergedEmail;
