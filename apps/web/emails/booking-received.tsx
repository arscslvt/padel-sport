import { Button, Section, Text } from "@react-email/components";

import { Detail, EmailLayout } from "./components/layout";
import * as s from "./theme";

export interface BookingReceivedEmailProps {
  /** Nome di chi riceve la mail: chi ha prenotato o un compagno di squadra. */
  recipientName: string;
  isBooker: boolean;
  bookedBy: string;
  dayLabel: string;
  timeLabel: string;
  court?: string;
  levelLabel: string;
  players: string[];
  /** Posti ancora da riempire: sotto, il club dice che ci pensa lui. */
  missing: number;
  code: string;
  bookingUrl: string;
}

/**
 * Richiesta ricevuta, in attesa che la struttura confermi.
 *
 * Niente QR qui: arriva con la conferma (`booking-accepted.tsx`), ed è quella
 * la sua funzione — riceverlo significa che il campo è stato accettato. Anche
 * il pulsante porta alla pagina della prenotazione, non a un biglietto: chi
 * apre trova lo stato aggiornato invece di una promessa.
 */
export function BookingReceivedEmail({
  recipientName,
  isBooker,
  bookedBy,
  dayLabel,
  timeLabel,
  court,
  levelLabel,
  players,
  missing,
  code,
  bookingUrl,
}: BookingReceivedEmailProps) {
  const firstName = recipientName.split(" ")[0] || recipientName;

  return (
    <EmailLayout preview={`Richiesta ricevuta: ${dayLabel}, ${timeLabel}.`}>
      <Text style={s.eyebrow}>Richiesta ricevuta</Text>
      <Text style={s.heading}>Ci stiamo lavorando, {firstName}.</Text>
      <Text style={s.paragraph}>
        {isBooker
          ? "Abbiamo ricevuto la tua richiesta e la struttura la sta esaminando. Appena è confermata ti mandiamo il codice d'ingresso: senza quello la prenotazione non è ancora definitiva."
          : `${bookedBy} ha chiesto un campo e ti ha messo in squadra. La struttura sta esaminando la richiesta: appena è confermata ricevi anche tu il codice d'ingresso.`}
      </Text>

      <Section style={s.panel}>
        <Detail label="Quando" value={`${dayLabel}, ${timeLabel}`} />
        {court && <Detail label="Campo" value={court} />}
        <Detail label="Livello" value={levelLabel} />
        <Detail label="In campo" value={players.join(", ")} />
        <Detail label="Riferimento" value={code} />
      </Section>

      {missing > 0 && (
        <Text style={s.paragraph}>
          {missing === 1
            ? "Manca un giocatore"
            : `Mancano ${missing} giocatori`}
          : ci pensiamo noi a cercare chi gioca al vostro livello.{" "}
          {isBooker
            ? "Se serve definire qualche dettaglio ti chiamiamo."
            : "Vi aggiorniamo appena la squadra è al completo."}
        </Text>
      )}

      <Section style={{ paddingBottom: "8px" }}>
        <Button href={bookingUrl} style={s.button}>
          Vedi lo stato della prenotazione
        </Button>
      </Section>

      <Text style={s.paragraph}>
        Hai cambiato idea o sbagliato orario? Chiamaci prima della conferma e
        non se ne fa nulla.
      </Text>
    </EmailLayout>
  );
}

BookingReceivedEmail.PreviewProps = {
  recipientName: "Mario Rossi",
  isBooker: true,
  bookedBy: "Mario Rossi",
  dayLabel: "Lunedì 3 agosto",
  timeLabel: "18:30 – 20:00",
  court: "Campo 1",
  levelLabel: "Intermedio",
  players: ["Mario Rossi", "Luca Bianchi", "Sara Verdi"],
  missing: 1,
  code: "7F2K9Q",
  bookingUrl: "https://asdpadelsport.com/booking/7F2K9Q",
} satisfies BookingReceivedEmailProps;

export default BookingReceivedEmail;
