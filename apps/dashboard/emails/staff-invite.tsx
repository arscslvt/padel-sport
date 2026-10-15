import { Button, Section, Text } from "@react-email/components";

import { EmailLayout } from "./components/layout";
import * as s from "./theme";

export interface StaffInviteEmailProps {
  firstName: string;
  /** Chi l'ha aggiunto: «Salvatore ti ha aggiunto allo staff». */
  invitedBy: string;
  /** La pagina d'accesso del gestionale. */
  signInUrl: string;
  /** L'email con cui entrare: è quella a cui arriva il codice. */
  email: string;
  isAdmin: boolean;
}

/**
 * L'ingresso nello staff.
 *
 * Arriva a chi un amministratore ha appena aggiunto dal profilo del
 * gestionale. L'account c'è già (o l'aveva, o l'ha aperto il gestionale per
 * lui): resta solo da dire dove si entra e con quale email, perché il codice
 * arriva lì e non altrove.
 */
export function StaffInviteEmail({
  firstName,
  invitedBy,
  signInUrl,
  email,
  isAdmin,
}: StaffInviteEmailProps) {
  const name = firstName.split(" ")[0] || firstName;

  return (
    <EmailLayout preview="Sei nello staff del Padel Sport Melilli.">
      <Text style={s.eyebrow}>Staff del club</Text>
      <Text style={s.heading}>Ti diamo il benvenuto nello staff, {name}.</Text>
      <Text style={s.paragraph}>
        {invitedBy} ti ha aggiunto allo staff del Padel Sport Melilli
        {isAdmin ? " con il ruolo di amministratore" : ""}. Dal gestionale vedi
        l'agenda dei campi, rispondi alle richieste e segui i clienti.
      </Text>

      <Section style={{ paddingBottom: "8px" }}>
        <Button href={signInUrl} style={s.button}>
          Entra nel gestionale
        </Button>
      </Section>

      <Text style={s.paragraph}>
        Per entrare usa questo indirizzo, {email}: ti mandiamo un codice via
        mail, ogni volta. Nessuna password da ricordare.
      </Text>

      <Text style={s.paragraph}>
        Se non aspettavi questa mail, rispondi pure e ce ne occupiamo noi.
      </Text>
    </EmailLayout>
  );
}

StaffInviteEmail.PreviewProps = {
  firstName: "Giulia",
  invitedBy: "Salvatore",
  signInUrl: "https://gestionale.asdpadelsport.com/sign-in",
  email: "giulia.ferrara@esempio.it",
  isAdmin: false,
} satisfies StaffInviteEmailProps;

export default StaffInviteEmail;
