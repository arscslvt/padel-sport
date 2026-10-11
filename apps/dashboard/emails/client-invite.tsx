import { Button, Section, Text } from "@react-email/components";

import { EmailLayout } from "./components/layout";
import * as s from "./theme";

export interface ClientInviteEmailProps {
  firstName: string;
  joinUrl: string;
  phone: string;
  /** Invito rimandato: chi lo riceve l'aveva già visto passare. */
  isReminder?: boolean;
}

/**
 * L'invito a iscriversi al club.
 *
 * Al Padel Sport si entra su invito, e questa mail è l'invito: prima era una
 * telefonata e un account creato a mano allo sportello. Il tono è quello di
 * qualcuno che ti aspetta, non di un sistema che ti registra.
 *
 * Dice esplicitamente che non c'è nessuna password da inventare — è la domanda
 * che si fa chiunque riceva un invito a iscriversi da qualche parte.
 */
export function ClientInviteEmail({
  firstName,
  joinUrl,
  phone,
}: ClientInviteEmailProps) {
  const name = firstName.split(" ")[0] || firstName;

  return (
    <EmailLayout preview="Completa la tua iscrizione al Padel Sport Melilli.">
      <Text style={s.eyebrow}>Invito al club</Text>
      <Text style={s.heading}>Ti aspettiamo in campo, {name}.</Text>
      <Text style={s.paragraph}>
        Il club ti ha invitato a iscriverti. Ti restano pochi dati da aggiungere
        — telefono, data di nascita — e sei dei nostri: da lì prenoti i campi
        dal sito e dall'app, entri nelle partite aperte e ritrovi le tue
        prenotazioni con il QR d'ingresso.
      </Text>

      <Section style={{ paddingBottom: "8px" }}>
        <Button href={joinUrl} style={s.button}>
          Attiva il tuo account
        </Button>
      </Section>

      <Text style={s.paragraph}>
        Nessuna password da inventare: per entrare ti mandiamo un codice via
        mail, ogni volta. Il link vale trenta giorni ed è personale.
      </Text>

      <Text style={s.paragraph}>
        Se non aspettavi questo invito, puoi ignorare questa mail
        {phone ? ` o chiamarci al ${phone}` : ""}: senza il tuo consenso non
        succede nulla.
      </Text>
    </EmailLayout>
  );
}

ClientInviteEmail.PreviewProps = {
  firstName: "Mario",
  joinUrl: "https://asdpadelsport.com/join/6f1c2d",
  phone: "+39 320 175 5897",
  isReminder: false,
} satisfies ClientInviteEmailProps;

export default ClientInviteEmail;
