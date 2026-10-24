import { Button, Section, Text } from "@react-email/components";

import { Detail, EmailLayout } from "./components/layout";
import * as s from "./theme";

export interface AccountDeletionEmailProps {
  kind: "requested" | "deleted";
  firstName: string;
  /** Solo per la richiesta: il giorno in cui diventa effettiva, già per esteso. */
  effectiveLabel?: string;
  /** Solo per la richiesta: dove annullarla. */
  profileUrl?: string;
}

/**
 * L'eliminazione dell'account, raccontata a chi la subisce o l'ha chiesta.
 *
 * Due momenti. La richiesta: la data in cui diventa effettiva e il pulsante
 * per annullarla, perché trenta giorni servono proprio a quello. L'eliminazione
 * effettiva: l'accesso non c'è più, e una copia dei dati resta un anno, come
 * dice l'informativa, prima di sparire del tutto.
 */
export function AccountDeletionEmail({
  kind,
  firstName,
  effectiveLabel,
  profileUrl,
}: AccountDeletionEmailProps) {
  const name = firstName.split(" ")[0] || firstName;

  if (kind === "requested") {
    return (
      <EmailLayout
        preview={`Il tuo account verrà eliminato il ${effectiveLabel}. Puoi ancora annullare.`}
      >
        <Text style={s.eyebrow}>Il tuo account</Text>
        <Text style={s.heading}>{name}, abbiamo ricevuto la richiesta.</Text>
        <Text style={s.paragraph}>
          Il tuo account verrà eliminato il <strong>{effectiveLabel}</strong>.
          Fino ad allora funziona come sempre: puoi prenotare, giocare e usare i
          tuoi punti.
        </Text>
        <Section style={s.panel}>
          <Detail label="Eliminazione" value={effectiveLabel ?? ""} />
        </Section>
        <Text style={s.paragraph}>
          Se ci hai ripensato, o se non sei stato tu a chiederla, annullala
          dalla tua area personale.
        </Text>
        {profileUrl && (
          <Section style={{ paddingBottom: "8px" }}>
            <Button href={profileUrl} style={s.button}>
              Annulla l'eliminazione
            </Button>
          </Section>
        )}
      </EmailLayout>
    );
  }

  return (
    <EmailLayout preview="Il tuo account è stato eliminato.">
      <Text style={s.eyebrow}>Il tuo account</Text>
      <Text style={s.heading}>Il tuo account è stato eliminato, {name}.</Text>
      <Text style={s.paragraph}>
        Non puoi più accedere al sito né all'app. Le prenotazioni già fissate
        restano a nome tuo in agenda: se vuoi annullarle, scrivici.
      </Text>
      <Text style={s.paragraph}>
        Una copia dei tuoi dati resta conservata per un anno, poi viene
        cancellata del tutto. Se hai domande, rispondi a questa mail.
      </Text>
    </EmailLayout>
  );
}

AccountDeletionEmail.PreviewProps = {
  kind: "requested",
  firstName: "Mario",
  effectiveLabel: "23 novembre 2026",
  profileUrl: "https://asdpadelsport.com/me/profilo",
} satisfies AccountDeletionEmailProps;

export default AccountDeletionEmail;
