import { Button, Section, Text } from "@react-email/components";

import { Detail, EmailLayout } from "./components/layout";
import * as s from "./theme";

export interface ReferralInviteEmailProps {
  /** Chi invita, come compare sulla sua scheda. */
  inviterName: string;
  /** Come chi invita ha chiamato l'amico, se l'ha scritto. */
  friendName?: string;
  email: string;
  code: string;
  inviteUrl: string;
  /** I punti di benvenuto alla prima tessera, se il club li dà. */
  points?: number;
}

/**
 * L'invito a iscriversi al club, mandato da un cliente a un amico.
 *
 * L'iscrizione si fa in struttura: la mail non porta a un modulo ma a una
 * pagina che spiega come farsi riconoscere allo sportello — con questa stessa
 * mail o col codice amico — così chi ha invitato riceve i suoi punti.
 */
export function ReferralInviteEmail({
  inviterName,
  friendName,
  email,
  code,
  inviteUrl,
  points,
}: ReferralInviteEmailProps) {
  const greeting = friendName ? `Ciao ${friendName.split(" ")[0]},` : "Ciao,";

  return (
    <EmailLayout
      preview={`${inviterName} ti invita a giocare a padel con noi.`}
    >
      <Text style={s.eyebrow}>Un invito per te</Text>
      <Text style={s.heading}>
        {inviterName} ti invita a giocare al Padel Sport.
      </Text>

      <Text style={s.paragraph}>
        {greeting} {inviterName} gioca da noi e pensa che ti piacerebbe. Per
        iscriverti passa in struttura: alla segreteria basta questa mail, o il
        codice amico qui sotto.
      </Text>

      {points ? (
        <Text style={s.paragraph}>
          Con la tua prima tessera ricevi <strong>{points} punti</strong> di
          benvenuto nel programma fedeltà.
        </Text>
      ) : null}

      <Section style={s.panel}>
        <Detail label="Iscriviti con la mail" value={email} />
        <Detail label="Oppure dai il codice amico" value={code} />
      </Section>

      <Section style={{ paddingBottom: "8px" }}>
        <Button href={inviteUrl} style={s.button}>
          Come iscriversi
        </Button>
      </Section>

      <Text style={{ ...s.paragraph, fontSize: "13px" }}>
        Ricevi questa mail perché {inviterName} ci ha dato il tuo indirizzo. Non
        ti scriveremo altro: se non ti interessa, ignorala.
      </Text>
    </EmailLayout>
  );
}

ReferralInviteEmail.PreviewProps = {
  inviterName: "Mario Rossi",
  friendName: "Luca",
  email: "luca@example.com",
  code: "48213",
  inviteUrl: "https://asdpadelsport.com/amico/abc",
  points: 5,
} satisfies ReferralInviteEmailProps;

export default ReferralInviteEmail;
