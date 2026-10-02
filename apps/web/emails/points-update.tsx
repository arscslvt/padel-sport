import { Button, Section, Text } from "@react-email/components";

import { Detail, EmailLayout } from "./components/layout";
import * as s from "./theme";

export interface PointsUpdateEmailProps {
  firstName: string;
  /** Con il segno: positivo è un carico, negativo una rimozione o un riscatto. */
  delta: number;
  label: string;
  note?: string;
  balance: number;
  walletUrl: string;
  /** Presente solo quando i punti sono stati spesi per un premio. */
  redemption?: {
    title: string;
    code: string;
    terms?: string;
    expiresLabel?: string;
  };
}

/**
 * Il movimento di punti, raccontato a chi li riceve.
 *
 * Tre notizie con la stessa forma: punti arrivati, punti tolti, premio
 * riscattato. Il riscatto porta il codice da mostrare allo sportello, ed è la
 * ragione per cui la mail esiste anche quando è il cliente stesso a spendere.
 */
export function PointsUpdateEmail({
  firstName,
  delta,
  label,
  note,
  balance,
  walletUrl,
  redemption,
}: PointsUpdateEmailProps) {
  const name = firstName.split(" ")[0] || firstName;
  const amount = Math.abs(delta);
  const unit = amount === 1 ? "punto" : "punti";

  const heading = redemption
    ? `Premio riscattato, ${name}.`
    : delta > 0
      ? `+${amount} ${unit} per te, ${name}.`
      : `${amount} ${unit} in meno sul tuo saldo.`;

  const preview = redemption
    ? `Il codice per ritirare ${redemption.title} è ${redemption.code}.`
    : delta > 0
      ? `Hai ricevuto ${amount} ${unit}: ora ne hai ${balance}.`
      : `Ti sono stati tolti ${amount} ${unit}: ora ne hai ${balance}.`;

  return (
    <EmailLayout preview={preview}>
      <Text style={s.eyebrow}>I tuoi punti</Text>
      <Text style={s.heading}>{heading}</Text>

      {redemption ? (
        <Text style={s.paragraph}>
          Hai usato {amount} {unit} per <strong>{redemption.title}</strong>.
          Mostra questo codice allo sportello per ritirarlo.
        </Text>
      ) : (
        <Text style={s.paragraph}>
          {delta > 0
            ? "Il club ha aggiunto dei punti al tuo saldo."
            : "Il club ha tolto dei punti dal tuo saldo."}{" "}
          Se qualcosa non ti torna, rispondi a questa mail.
        </Text>
      )}

      <Section style={s.panel}>
        {redemption ? (
          <>
            <Detail label="Codice di ritiro" value={redemption.code} />
            {redemption.expiresLabel && (
              <Detail label="Da usare entro" value={redemption.expiresLabel} />
            )}
          </>
        ) : (
          <Detail label="Motivo" value={label} />
        )}
        {note && <Detail label="Nota" value={note} />}
        <Detail label="Saldo attuale" value={`${balance} punti`} />
      </Section>

      {redemption?.terms && (
        <Text style={{ ...s.paragraph, fontSize: "13px" }}>
          Condizioni: {redemption.terms}
        </Text>
      )}

      <Section style={{ paddingBottom: "8px" }}>
        <Button href={walletUrl} style={s.button}>
          Apri la tua area personale
        </Button>
      </Section>
    </EmailLayout>
  );
}

PointsUpdateEmail.PreviewProps = {
  firstName: "Mario",
  delta: 3,
  label: "Partita vinta",
  balance: 12,
  walletUrl: "https://asdpadelsport.com/area-personale",
} satisfies PointsUpdateEmailProps;

export default PointsUpdateEmail;
