import { Button, Link, Section, Text } from "@react-email/components";

import { Detail, EmailLayout } from "./components/layout";
import * as s from "./theme";

export interface SupportRequestClubEmailProps {
  name: string;
  email: string;
  phone: string;
  memberId?: string;
  message: string;
  receivedAtLabel: string;
}

/** Copia per la casella del club: la richiesta e i recapiti per rispondere. */
export function SupportRequestClubEmail({
  name,
  email,
  phone,
  memberId,
  message,
  receivedAtLabel,
}: SupportRequestClubEmailProps) {
  const whatsappNumber = phone.replace(/\D/g, "");

  return (
    <EmailLayout preview={`${name} ha scritto dal modulo di supporto`}>
      <Text style={s.eyebrow}>Richiesta di assistenza</Text>
      <Text style={s.heading}>{name} ha bisogno di aiuto</Text>
      <Text style={s.paragraph}>
        Arrivata dal modulo di supporto del sito il {receivedAtLabel}.
        {memberId ? " Chi scrive è un socio tesserato." : ""}
      </Text>

      <Section style={s.panel}>
        <Text style={s.detailLabel}>Messaggio</Text>
        <Text
          style={{
            ...s.detailValue,
            fontWeight: 400,
            lineHeight: "1.6",
            whiteSpace: "pre-wrap",
          }}
        >
          {message}
        </Text>
      </Section>

      <Section style={s.panel}>
        {memberId ? <Detail label="Matricola socio" value={memberId} /> : null}
        <Detail label="Telefono" value={phone} />
        <Section style={{ paddingBottom: 0 }}>
          <Text style={s.detailLabel}>Email</Text>
          <Text style={s.detailValue}>
            <Link href={`mailto:${email}`} style={s.link}>
              {email}
            </Link>
          </Text>
        </Section>
      </Section>

      <Button href={`https://wa.me/${whatsappNumber}`} style={s.button}>
        Rispondi su WhatsApp
      </Button>
    </EmailLayout>
  );
}

SupportRequestClubEmail.PreviewProps = {
  name: "Mario Rossi",
  email: "mario.rossi@email.com",
  phone: "+39 333 1234567",
  memberId: "PS-01429",
  message:
    "Buongiorno, vorrei sapere come rinnovare la tessera per la nuova stagione e se ci sono ancora posti nei corsi del giovedì sera.",
  receivedAtLabel: "10 agosto 2026, 14:32",
} satisfies SupportRequestClubEmailProps;

export default SupportRequestClubEmail;
