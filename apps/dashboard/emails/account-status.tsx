import { Button, Link, Section, Text } from "@react-email/components";

import { Detail, EmailLayout } from "./components/layout";
import * as s from "./theme";

export interface AccountStatusEmailProps {
  kind: "suspended" | "reactivated";
  firstName: string;
  /** Saldo punti: congelato con la sospensione, di nuovo spendibile dopo. */
  points: number;
  /** Solo per la sospensione: il motivo scritto dallo staff. */
  reason?: string;
  /** Premi riscattati e non ancora ritirati. */
  redemptions?: { title: string; code: string; expiresLabel?: string }[];
  /** Recapiti per un reclamo: arrivano da `lib/info.ts`. */
  contacts: { email: string; phone: string; whatsappUrl: string };
  walletUrl: string;
}

/**
 * Account sospeso, o di nuovo attivo.
 *
 * La sospensione dice tre cose che il cliente vuole sapere subito: perché, che
 * fine fanno i suoi punti e i premi già riscattati, e con chi parlare se non è
 * d'accordo. La riattivazione è una riga sola: si torna a giocare.
 */
export function AccountStatusEmail({
  kind,
  firstName,
  points,
  reason,
  redemptions = [],
  contacts,
  walletUrl,
}: AccountStatusEmailProps) {
  const name = firstName.split(" ")[0] || firstName;
  const pointsLabel = points === 1 ? "1 punto" : `${points} punti`;

  if (kind === "reactivated") {
    return (
      <EmailLayout preview="Il tuo account è di nuovo attivo.">
        <Text style={s.eyebrow}>Il tuo account</Text>
        <Text style={s.heading}>Bentornato, {name}.</Text>

        <Text style={s.paragraph}>
          Il tuo account è di nuovo attivo: puoi accedere e prenotare dal sito e
          dall'app come prima.
          {points > 0 &&
            ` I tuoi ${pointsLabel} sono di nuovo utilizzabili per i premi.`}
        </Text>

        <Section style={{ paddingBottom: "8px" }}>
          <Button href={walletUrl} style={s.button}>
            Apri la tua area personale
          </Button>
        </Section>
      </EmailLayout>
    );
  }

  return (
    <EmailLayout preview="Il tuo account è stato sospeso: ecco cosa significa.">
      <Text style={s.eyebrow}>Il tuo account</Text>
      <Text style={s.heading}>Il tuo account è stato sospeso.</Text>

      <Text style={s.paragraph}>
        Ciao {name}, ti scriviamo per informarti che il club ha sospeso il tuo
        account. Finché resta sospeso non potrai accedere né prenotare dal sito
        e dall'app.
      </Text>

      {reason && (
        <Section style={s.panel}>
          <Text style={s.detailLabel}>Motivo</Text>
          <Text
            style={{
              ...s.detailValue,
              fontWeight: 400,
              lineHeight: "1.6",
              whiteSpace: "pre-wrap",
            }}
          >
            {reason}
          </Text>
        </Section>
      )}

      <Text style={s.subheading}>I tuoi punti</Text>
      <Text style={s.paragraph}>
        {points > 0
          ? `I tuoi ${pointsLabel} sono congelati: restano tuoi e non li perdi. Per tutta la sospensione non se ne aggiungono e non si possono spendere; tornano utilizzabili appena l'account viene riattivato.`
          : "Il tuo conto punti è congelato: per tutta la sospensione non si caricano punti e non si riscattano premi. Torna a funzionare appena l'account viene riattivato."}
      </Text>

      {redemptions.length > 0 && (
        <>
          <Text style={s.subheading}>I premi che hai già riscattato</Text>
          <Text style={s.paragraph}>
            Ti verranno consegnati comunque: passa allo sportello con il codice
            entro la scadenza.
          </Text>
          <Section style={s.panel}>
            {redemptions.map((redemption) => (
              <Detail
                key={redemption.code}
                label={redemption.title}
                value={
                  redemption.expiresLabel
                    ? `Codice ${redemption.code} · entro il ${redemption.expiresLabel}`
                    : `Codice ${redemption.code}`
                }
              />
            ))}
          </Section>
        </>
      )}

      <Text style={s.subheading}>Non sei d'accordo?</Text>
      <Text style={s.paragraph}>
        Se pensi che si tratti di un errore o vuoi chiarire, contatta il club:
        rispondi a questa mail, scrivi a{" "}
        <Link href={`mailto:${contacts.email}`} style={s.link}>
          {contacts.email}
        </Link>{" "}
        o chiamaci al{" "}
        <Link href={`tel:${contacts.phone.replace(/\s/g, "")}`} style={s.link}>
          {contacts.phone}
        </Link>
        . Valuteremo la tua richiesta e ti risponderemo.
      </Text>

      <Section style={{ paddingBottom: "8px" }}>
        <Button href={contacts.whatsappUrl} style={s.button}>
          Scrivici su WhatsApp
        </Button>
      </Section>
    </EmailLayout>
  );
}

AccountStatusEmail.PreviewProps = {
  kind: "suspended",
  firstName: "Mario",
  points: 24,
  reason:
    "Mancato pagamento di due prenotazioni e assenza non comunicata alla partita del 3 ottobre.",
  redemptions: [
    { title: "Borraccia del club", code: "K7P2QM", expiresLabel: "31 ottobre" },
  ],
  contacts: {
    email: "segreteria@asdpadelsport.com",
    phone: "+39 320 175 5897",
    whatsappUrl: "https://wa.me/393201755897",
  },
  walletUrl: "https://asdpadelsport.com/me",
} satisfies AccountStatusEmailProps;

export default AccountStatusEmail;
