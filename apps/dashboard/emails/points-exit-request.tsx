import { Button, Section, Text } from "@react-email/components";

import { Detail, EmailLayout } from "./components/layout";
import * as s from "./theme";

export interface PointsExitRequestEmailProps {
  firstName: string;
  exitUrl: string;
  balance: number;
  /** Fino a quando vale il link, già scritto per esteso. */
  expiresLabel: string;
}

/**
 * La richiesta di uscita dal programma punti.
 *
 * La manda la segreteria quando qualcuno chiede di uscire, ma non lo fa
 * uscire: l'uscita vale solo se la persona la conferma dalla pagina del link,
 * dopo averne letto le conseguenze. Per questo la mail dice chiaramente che,
 * se non l'ha chiesto lei, basta ignorarla.
 */
export function PointsExitRequestEmail({
  firstName,
  exitUrl,
  balance,
  expiresLabel,
}: PointsExitRequestEmailProps) {
  const name = firstName.split(" ")[0] || firstName;

  return (
    <EmailLayout preview="Conferma la tua uscita dal programma punti.">
      <Text style={s.eyebrow}>Programma punti</Text>
      <Text style={s.heading}>Vuoi uscire dal programma, {name}?</Text>
      <Text style={s.paragraph}>
        La segreteria ci ha detto che vuoi uscire dal programma punti. Per farlo
        serve la tua conferma. Apri il link, leggi cosa succede ai tuoi punti e
        decidi tu.
      </Text>

      <Section style={s.panel}>
        <Detail label="Saldo attuale" value={`${balance} punti`} />
        <Detail label="Link valido fino al" value={expiresLabel} />
      </Section>

      <Section style={{ paddingBottom: "8px" }}>
        <Button href={exitUrl} style={s.button}>
          Leggi e conferma
        </Button>
      </Section>

      <Text style={s.paragraph}>
        Se non l'hai chiesto tu, ignora questa mail. Resti nel programma e i
        tuoi punti non cambiano.
      </Text>
    </EmailLayout>
  );
}

PointsExitRequestEmail.PreviewProps = {
  firstName: "Mario",
  exitUrl: "https://asdpadelsport.com/points-exit/6f1c2d",
  balance: 12,
  expiresLabel: "20 ottobre 2026",
} satisfies PointsExitRequestEmailProps;

export default PointsExitRequestEmail;
