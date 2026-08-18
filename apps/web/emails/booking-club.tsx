import { Button, Section, Text } from "@react-email/components";

import { Detail, EmailLayout } from "./components/layout";
import * as s from "./theme";

export interface BookingClubEmailProps {
  bookedBy: string;
  phone?: string;
  email?: string;
  dayLabel: string;
  timeLabel: string;
  court?: string;
  levelLabel: string;
  players: string[];
  missing: number;
  notes?: string;
  code: string;
  bookingUrl: string;
}

/**
 * Copia per la segreteria. Non è un promemoria: è la scheda di lavoro della
 * prenotazione, quindi mette in evidenza le due cose su cui il club deve
 * agire — i posti da riempire e le note di chi ha prenotato — e tiene il
 * recapito a portata di mano.
 */
export function BookingClubEmail({
  bookedBy,
  phone,
  email,
  dayLabel,
  timeLabel,
  court,
  levelLabel,
  players,
  missing,
  notes,
  code,
  bookingUrl,
}: BookingClubEmailProps) {
  return (
    <EmailLayout
      preview={`${bookedBy} — ${dayLabel}, ${timeLabel}${missing > 0 ? ` · mancano ${missing}` : ""}`}
    >
      <Text style={s.eyebrow}>Nuova prenotazione dal sito</Text>
      <Text style={s.heading}>
        {missing > 0
          ? `Squadra incompleta: ${missing} da trovare`
          : "Squadra al completo"}
      </Text>
      <Text style={s.paragraph}>
        {missing > 0
          ? `Servono ${missing === 1 ? "un giocatore" : `${missing} giocatori`} di livello ${levelLabel.toLowerCase()}. Il prenotante si aspetta che ci pensiamo noi.`
          : "Non serve fare nulla: i quattro giocatori ci sono già."}
      </Text>

      <Section style={s.panel}>
        <Detail label="Quando" value={`${dayLabel}, ${timeLabel}`} />
        {court && <Detail label="Campo" value={court} />}
        <Detail label="Livello" value={levelLabel} />
        <Detail label="Codice" value={code} />
        <Detail label="Prenotante" value={bookedBy} />
        {phone && <Detail label="Telefono" value={phone} />}
        {email && <Detail label="Email" value={email} />}
        <Detail
          label={`In campo (${players.length}/4)`}
          value={players.join(", ")}
        />
      </Section>

      {notes && (
        <Section style={s.panel}>
          <Detail label="Note alla struttura" value={notes} />
        </Section>
      )}

      <Section style={{ paddingBottom: "8px" }}>
        <Button href={bookingUrl} style={s.button}>
          Apri la prenotazione
        </Button>
      </Section>
    </EmailLayout>
  );
}

BookingClubEmail.PreviewProps = {
  bookedBy: "Mario Rossi",
  phone: "+393201755897",
  email: "mario.rossi@esempio.it",
  dayLabel: "Lunedì 3 agosto",
  timeLabel: "18:30 – 20:00",
  court: "Campo 1",
  levelLabel: "Intermedio",
  players: ["Mario Rossi", "Luca Bianchi", "Sara Verdi"],
  missing: 1,
  notes: "Serve il noleggio di due racchette.",
  code: "7F2K9Q",
  bookingUrl: "https://asdpadelsport.com/booking/7F2K9Q",
} satisfies BookingClubEmailProps;

export default BookingClubEmail;
