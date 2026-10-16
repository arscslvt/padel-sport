import { Button, Section, Text } from "@react-email/components";

import { Detail, EmailLayout } from "./components/layout";
import * as s from "./theme";

export interface MatchInviteEmailProps {
  /** Nome di chi è stato invitato. */
  recipientName: string;
  /** Chi ha prenotato e lo ha chiamato per nome. */
  inviterName: string;
  dayLabel: string;
  timeLabel: string;
  court?: string;
  /** I giocatori già in partita, chi invita compreso. */
  players: string[];
  /** La schermata di quell'invito, dove si accetta o si rifiuta. */
  inviteUrl: string;
}

/**
 * Un amico ti ha chiamato per una partita: rispondi.
 *
 * È la gemella del WhatsApp d'invito (modules/notifications/matchInvite.ts sul
 * backend) e porta allo stesso posto, `/invite/<id>`. Nessun QR: quello arriva
 * con la conferma della struttura, ai giocatori che sono entrati in partita.
 * Il posto resta tenuto finché non si risponde, ed è per questo che la mail
 * chiede una risposta invece di dare solo la notizia.
 */
export function MatchInviteEmail({
  recipientName,
  inviterName,
  dayLabel,
  timeLabel,
  court,
  players,
  inviteUrl,
}: MatchInviteEmailProps) {
  const firstName = recipientName.split(" ")[0] || recipientName;

  return (
    <EmailLayout
      preview={`${inviterName} ti invita a giocare: ${dayLabel}, ${timeLabel}.`}
    >
      <Text style={s.eyebrow}>Invito a una partita</Text>
      <Text style={s.heading}>Si gioca, {firstName}?</Text>
      <Text style={s.paragraph}>
        {inviterName} ha prenotato un campo e vuole te in squadra. Il posto è
        tuo finché non rispondi: accetta per entrare in partita, oppure rifiuta
        per lasciarlo a qualcun altro.
      </Text>

      <Section style={s.panel}>
        <Detail label="Quando" value={`${dayLabel}, ${timeLabel}`} />
        {court && <Detail label="Campo" value={court} />}
        <Detail label="In campo" value={players.join(", ")} />
      </Section>

      <Section style={{ paddingBottom: "8px" }}>
        <Button href={inviteUrl} style={s.button}>
          Rispondi all'invito
        </Button>
      </Section>

      <Text style={s.paragraph}>
        Quando la struttura conferma il campo ricevi il codice d'ingresso, con
        mail e WhatsApp.
      </Text>
    </EmailLayout>
  );
}

MatchInviteEmail.PreviewProps = {
  recipientName: "Luca Bianchi",
  inviterName: "Mario Rossi",
  dayLabel: "Lunedì 3 agosto",
  timeLabel: "18:30 – 20:00",
  court: "Campo 1",
  players: ["Mario Rossi"],
  inviteUrl: "https://asdpadelsport.com/invite/k57abc",
} satisfies MatchInviteEmailProps;

export default MatchInviteEmail;
