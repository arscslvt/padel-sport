import {
  Body,
  Container,
  Head,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import type { ReactNode } from "react";

import * as s from "../theme";

const SITE_URL = "https://www.asdpadelsport.com";

interface EmailLayoutProps {
  /** Riga di anteprima nella lista della casella. */
  preview: string;
  children: ReactNode;
}

/**
 * Cornice comune delle mail: stessa gerarchia del sito — marchio, occhiello,
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
            <Text
              style={{
                color: s.color.foreground,
                fontFamily: s.font.display,
                fontSize: "20px",
                letterSpacing: "-0.01em",
                margin: 0,
              }}
            >
              Padel Sport Melilli
            </Text>
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
