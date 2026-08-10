import { Section, Text } from "@react-email/components";

import { Detail, EmailLayout } from "./components/layout";
import * as s from "./theme";

export interface MatchRequestCopyEmailProps {
  name: string;
  phone: string;
  matchDateLabel: string;
  levelLabel: string;
  missingLabel: string;
  notes?: string;
}

/** Copia per chi ha inviato la richiesta: conferma di ricezione e riepilogo. */
export function MatchRequestCopyEmail({
  name,
  phone,
  matchDateLabel,
  levelLabel,
  missingLabel,
  notes,
}: MatchRequestCopyEmailProps) {
  const firstName = name.split(" ")[0] || name;

  return (
    <EmailLayout preview="Abbiamo ricevuto la tua richiesta di giocatori.">
      <Text style={s.eyebrow}>Richiesta ricevuta</Text>
      <Text style={s.heading}>Ci pensiamo noi, {firstName}.</Text>
      <Text style={s.paragraph}>
        Abbiamo preso in carico la tua richiesta: cerchiamo {missingLabel} per
        completare la partita e ti ricontattiamo appena il match è al completo.
        Questa è solo una copia di ciò che hai inviato, non serve rispondere.
      </Text>

      <Section style={s.panel}>
        <Detail label="Data e ora" value={matchDateLabel} />
        <Detail label="Livello di gioco" value={levelLabel} />
        <Detail label="Giocatori mancanti" value={missingLabel} />
        <Detail label="Il tuo telefono" value={phone} />
        {notes ? <Detail label="Note" value={notes} /> : null}
      </Section>

      <Text style={s.paragraph}>
        Se qualcosa non torna — data sbagliata, orario cambiato, non ti serve
        più — scrivici o chiamaci ai recapiti qui sotto.
      </Text>
    </EmailLayout>
  );
}

MatchRequestCopyEmail.PreviewProps = {
  name: "Mario Rossi",
  phone: "+39 333 1234567",
  matchDateLabel: "sabato 15 agosto 2026, 19:00",
  levelLabel: "Intermedio",
  missingLabel: "2 giocatori",
} satisfies MatchRequestCopyEmailProps;

export default MatchRequestCopyEmail;
