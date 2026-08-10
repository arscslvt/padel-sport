import { Button, Link, Section, Text } from "@react-email/components";

import { Detail, EmailLayout } from "./components/layout";
import * as s from "./theme";

export interface MatchRequestClubEmailProps {
  name: string;
  email: string;
  phone: string;
  matchDateLabel: string;
  levelLabel: string;
  missingLabel: string;
  notes?: string;
}

/** Mail alla segreteria: i dati della richiesta e come ricontattare chi l'ha inviata. */
export function MatchRequestClubEmail({
  name,
  email,
  phone,
  matchDateLabel,
  levelLabel,
  missingLabel,
  notes,
}: MatchRequestClubEmailProps) {
  const whatsappNumber = phone.replace(/\D/g, "");

  return (
    <EmailLayout preview={`${name} cerca ${missingLabel} — ${matchDateLabel}`}>
      <Text style={s.eyebrow}>Nuova richiesta</Text>
      <Text style={s.heading}>
        {name} cerca {missingLabel}
      </Text>
      <Text style={s.paragraph}>
        Richiesta arrivata dal modulo “Ti manca qualche giocatore?” del sito.
      </Text>

      <Section style={s.panel}>
        <Detail label="Data e ora" value={matchDateLabel} />
        <Detail label="Livello di gioco" value={levelLabel} />
        <Detail label="Giocatori mancanti" value={missingLabel} />
        <Detail label="Telefono" value={phone} />
        <Section style={{ paddingBottom: notes ? "14px" : 0 }}>
          <Text style={s.detailLabel}>Email</Text>
          <Text style={s.detailValue}>
            <Link href={`mailto:${email}`} style={s.link}>
              {email}
            </Link>
          </Text>
        </Section>
        {notes ? <Detail label="Note" value={notes} /> : null}
      </Section>

      <Button href={`https://wa.me/${whatsappNumber}`} style={s.button}>
        Rispondi su WhatsApp
      </Button>
    </EmailLayout>
  );
}

MatchRequestClubEmail.PreviewProps = {
  name: "Mario Rossi",
  email: "mario.rossi@email.com",
  phone: "+39 333 1234567",
  matchDateLabel: "sabato 15 agosto 2026, 19:00",
  levelLabel: "Intermedio",
  missingLabel: "2 giocatori",
  notes: "Preferiamo il campo coperto se disponibile.",
} satisfies MatchRequestClubEmailProps;

export default MatchRequestClubEmail;
