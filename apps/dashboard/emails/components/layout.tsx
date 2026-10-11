import {
  Body,
  Container,
  Head,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import type { ReactNode } from "react";

import * as s from "../theme";

const SITE_URL = "https://www.asdpadelsport.com";

/**
 * Il logo ufficiale, lo stesso della home (`components/logo.tsx`) reso in PNG
 * e ritagliato attorno al marchio: `public/email/logo.png`.
 *
 * Dev'essere un indirizzo pubblico e assoluto: Gmail e Outlook scaricano le
 * immagini dai propri server, che `localhost` non lo raggiungono. Di norma è il
 * file servito dal sito in produzione. In locale `EMAIL_LOGO_URL` lo sostituisce
 * con una copia pubblica — un tunnel ngrok gratuito non va bene, perché a chi
 * si presenta come browser risponde con una pagina di avviso al posto
 * dell'immagine.
 *
 * PNG e non SVG: Gmail gli SVG non li mostra. Il file è a 480px per restare
 * nitido sugli schermi ad alta densità, e si mostra a un sesto della larghezza.
 */
const LOGO = {
  src: process.env.EMAIL_LOGO_URL ?? "https://asdpadelsport.com/email/logo.png",
  width: 80,
  height: 47,
};

interface EmailLayoutProps {
  /** Riga di anteprima nella lista della casella. */
  preview: string;
  children: ReactNode;
}

/**
 * Cornice comune delle mail: stessa gerarchia del sito — logo, occhiello,
 * titolo serif, corpo sans, chiusura con i recapiti.
 */
export function EmailLayout({ preview, children }: EmailLayoutProps) {
  return (
    <Html lang="it">
      <Head />
      <Preview>{preview}</Preview>
      <Body style={s.main}>
        <Container style={s.container}>
          <Section style={{ padding: "28px 32px 0" }}>
            <Link href={SITE_URL}>
              <Img
                src={LOGO.src}
                width={LOGO.width}
                height={LOGO.height}
                alt="Padel Sport Melilli"
                style={{ display: "block", border: 0 }}
              />
            </Link>
          </Section>

          <Section style={s.content}>{children}</Section>

          <Section style={{ padding: "0 32px 28px" }}>
            <Hr style={s.divider} />
            <Text style={s.footerText}>A.S.D. Padel Sport Melilli</Text>
            <Text style={s.footerText}>
              Via Pertini, 96010 Melilli (SR) — Italia
            </Text>
            <Text style={s.footerText}>
              <Link href="tel:+393201755897" style={s.link}>
                +39 320 175 5897
              </Link>
              {" · "}
              <Link href={SITE_URL} style={s.link}>
                asdpadelsport.com
              </Link>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

interface DetailProps {
  label: string;
  value: string;
}

/** Riga etichetta/valore dentro il pannello grigio. */
export function Detail({ label, value }: DetailProps) {
  return (
    <Section style={{ paddingBottom: "14px" }}>
      <Text style={s.detailLabel}>{label}</Text>
      <Text style={s.detailValue}>{value}</Text>
    </Section>
  );
}
