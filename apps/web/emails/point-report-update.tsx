import { Button, Section, Text } from "@react-email/components";

import { Detail, EmailLayout } from "./components/layout";
import * as s from "./theme";

export interface PointReportUpdateEmailProps {
  status: "in_progress" | "resolved";
  firstName: string;
  /** La categoria come la legge il cliente: «Punti sbagliati», «Chiarimento». */
  category: string;
  transaction?: { label: string; delta: number };
  message: string;
  /** La risposta dello staff, solo alla chiusura. */
  reply?: string;
  balance: number;
  walletUrl: string;
}

/**
 * A che punto è la segnalazione sui punti inviata dall'area personale.
 *
 * Due notizie: «l'abbiamo presa in carico» e «l'abbiamo risolta». La prima
 * serve a non far sentire il cliente ignorato; la seconda porta la risposta
 * dello staff e il saldo, che è la cosa che il cliente voleva sapere.
 */
export function PointReportUpdateEmail({
  status,
  firstName,
  category,
  transaction,
  message,
  reply,
  balance,
  walletUrl,
}: PointReportUpdateEmailProps) {
  const name = firstName.split(" ")[0] || firstName;
  const resolved = status === "resolved";

  const heading = resolved
    ? `Segnalazione risolta, ${name}.`
    : `Ci stiamo lavorando, ${name}.`;

  const preview = resolved
    ? "Abbiamo controllato la tua segnalazione sui punti."
    : "Abbiamo preso in carico la tua segnalazione sui punti.";

  const movement = transaction
    ? `${transaction.label} (${transaction.delta > 0 ? "+" : ""}${transaction.delta})`
    : undefined;

  return (
    <EmailLayout preview={preview}>
      <Text style={s.eyebrow}>La tua segnalazione</Text>
      <Text style={s.heading}>{heading}</Text>

      <Text style={s.paragraph}>
        {resolved
          ? "Abbiamo controllato la tua segnalazione sui punti. Se c'era da correggere qualcosa, il saldo qui sotto è già aggiornato."
          : "Abbiamo preso in carico la tua segnalazione sui punti. Ti scriviamo di nuovo appena l'abbiamo controllata."}
      </Text>

      {resolved && reply && <Text style={s.quote}>{reply}</Text>}

      <Section style={s.panel}>
        <Detail label="Motivo" value={category} />
        {movement && <Detail label="Movimento" value={movement} />}
        <Detail label="Il tuo messaggio" value={message} />
        {resolved && (
          <Detail label="Saldo attuale" value={`${balance} punti`} />
        )}
      </Section>

      <Text style={{ ...s.paragraph, fontSize: "13px" }}>
        Hai altre domande? Rispondi a questa mail.
      </Text>

      <Section style={{ paddingBottom: "8px" }}>
        <Button href={walletUrl} style={s.button}>
          Apri la tua area personale
        </Button>
      </Section>
    </EmailLayout>
  );
}

PointReportUpdateEmail.PreviewProps = {
  status: "resolved",
  firstName: "Mario",
  category: "Punti sbagliati",
  transaction: { label: "Partita vinta", delta: 3 },
  message: "La partita era di un quadrangolare: si vincono 4 punti, non 3.",
  reply: "Hai ragione: abbiamo aggiunto il punto che mancava.",
  balance: 14,
  walletUrl: "https://asdpadelsport.com/me",
} satisfies PointReportUpdateEmailProps;

export default PointReportUpdateEmail;
