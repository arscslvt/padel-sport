import { Section, Text } from "@react-email/components";

import { Detail, EmailLayout } from "./components/layout";
import * as s from "./theme";

export interface SupportRequestCopyEmailProps {
  name: string;
  email: string;
  phone: string;
  memberId?: string;
  message: string;
  receivedAtLabel: string;
  supportHours: string;
}

/**
 * Conferma per chi ha scritto: ricapitola per intero ciò che ha chiesto, così
 * la mail vale da ricevuta anche a distanza di settimane.
 */
export function SupportRequestCopyEmail({
  name,
  email,
  phone,
  memberId,
  message,
  receivedAtLabel,
  supportHours,
}: SupportRequestCopyEmailProps) {
  const firstName = name.split(" ")[0] || name;

  return (
    <EmailLayout preview="Abbiamo ricevuto la tua richiesta di assistenza.">
      <Text style={s.eyebrow}>Richiesta ricevuta</Text>
      <Text style={s.heading}>Grazie, {firstName}.</Text>
      <Text style={s.paragraph}>
        Abbiamo ricevuto la tua richiesta il {receivedAtLabel} e la leggiamo nel
        minor tempo possibile. Qui sotto trovi la copia di quello che ci hai
        scritto: non serve rispondere a questa mail.
      </Text>

      <Section style={s.panel}>
        <Text style={s.detailLabel}>La tua richiesta</Text>
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
        <Detail label="Nome completo" value={name} />
        <Detail label="Email" value={email} />
        <Detail label="Telefono" value={phone} />
        {memberId ? <Detail label="Matricola socio" value={memberId} /> : null}
      </Section>

      <Text style={s.paragraph}>
        Se ti serve una risposta subito, scrivici su WhatsApp o chiamaci:
        l'assistenza diretta è attiva {supportHours.toLowerCase()}.
      </Text>
    </EmailLayout>
  );
}

SupportRequestCopyEmail.PreviewProps = {
  name: "Mario Rossi",
  email: "mario.rossi@email.com",
  phone: "+39 333 1234567",
  memberId: "PS-01429",
  message:
    "Buongiorno, vorrei sapere come rinnovare la tessera per la nuova stagione e se ci sono ancora posti nei corsi del giovedì sera.",
  receivedAtLabel: "10 agosto 2026, 14:32",
  supportHours: "Tutti i giorni, 9:00 – 21:00",
} satisfies SupportRequestCopyEmailProps;

export default SupportRequestCopyEmail;
