import { api } from "@padel-sport/backend/convex/_generated/api";
import { ConvexHttpClient } from "convex/browser";
import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

import { Heading } from "@/components/ui/heading";
import { getInfo } from "@/lib/info";
import {
  BOOKING_LINK,
  PERSONAL_AREA_LINK,
  PRIVACY_LINK,
  SUMUP_BOOKING_URL,
} from "@/lib/links";

export const metadata: Metadata = {
  title: "Condizioni di prenotazione",
  description:
    "Come si prenota un campo dal sito di A.S.D. Padel Sport Melilli: conferma, prezzi, pagamento, disdetta e rimborso.",
  alternates: {
    canonical: "https://www.asdpadelsport.com/booking-terms",
  },
};

/** L'interruttore dei pagamenti online si legge a ogni richiesta. */
export const dynamic = "force-dynamic";

/** Data dell'ultima revisione dei contenuti di questa pagina. */
const LAST_UPDATE = "13 ottobre 2026";

/**
 * Le condizioni di prenotazione dei campi dal sito.
 *
 * Sono le informazioni che il Codice del Consumo chiede di dare prima di un
 * contratto a distanza (art. 49): chi offre il servizio, il prezzo, come si
 * paga, come si disdice e che il recesso di 14 giorni non si applica (art. 59,
 * lett. n). Le linka il riepilogo della prenotazione, prima della conferma.
 *
 * Disdetta e rimborso valgono per chi paga online, quindi la sezione si vede
 * solo quando il club accetta pagamenti online (`onlinePaymentsEnabled` e
 * chiavi SumUp, modules/payments/lib.ts). Spegnendo l'interruttore sparisce
 * da qui, ma non dalla pagina di una prenotazione già pagata
 * (components/booking/online-payment.tsx): quel pagamento resta suo.
 */

function Section({
  number,
  title,
  children,
}: {
  number: number;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="border-border scroll-mt-28 border-t pt-8">
      <span className="text-muted-foreground/60 mb-2 block text-xs tabular-nums">
        {number.toString().padStart(2, "0")}
      </span>
      <Heading as="h2" size="sub" className="mb-4">
        {title}
      </Heading>
      <div className="text-muted-foreground flex flex-col gap-4 text-sm leading-relaxed">
        {children}
      </div>
    </section>
  );
}

function Term({ children }: { children: ReactNode }) {
  return <strong className="text-foreground font-medium">{children}</strong>;
}

const LINK_CLASS =
  "text-foreground decoration-foreground/30 hover:decoration-foreground underline underline-offset-2 transition-colors";

function MailLink() {
  return (
    <a href={`mailto:${getInfo("email")}`} className={LINK_CLASS}>
      {getInfo("email")}
    </a>
  );
}

/** Se la lettura non riesce si mostra la versione senza pagamento online. */
async function onlinePaymentsEnabled(): Promise<boolean> {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!convexUrl) return false;

  try {
    return await new ConvexHttpClient(convexUrl).query(
      api.modules.payments.status.enabled,
      {},
    );
  } catch (error) {
    console.error("Stato dei pagamenti online non letto:", error);
    return false;
  }
}

export default async function BookingTermsPage() {
  const online = await onlinePaymentsEnabled();

  // Le sezioni si numerano in ordine: quella sulla disdetta può mancare.
  const sections: Array<{ title: string; body: ReactNode }> = [
    {
      title: "Chi offre il servizio",
      body: (
        <p>
          I campi sono di <Term>{getInfo("name")}</Term>, con sede legale in{" "}
          {getInfo("legalAddress")}, codice fiscale {getInfo("cf")} e partita
          IVA {getInfo("piva")}. Si gioca in {getInfo("address")}. Per ogni
          domanda puoi scrivere a <MailLink /> o telefonare al {getInfo("cell")}
          .
        </p>
      ),
    },
    {
      title: "Come si prenota",
      body: (
        <>
          <p>
            Dalla pagina{" "}
            <Link href={BOOKING_LINK} className={LINK_CLASS}>
              Prenota
            </Link>{" "}
            scegli giorno, orario e livello della partita, poi confermi la tua
            identità con un codice che ti mandiamo via email. Serve un account
            del club e, quando il club lo richiede, la tessera in corso.
          </p>
          <p>
            La prenotazione diventa definitiva quando la segreteria la{" "}
            <Term>conferma</Term>. Ti avvisiamo via email e WhatsApp, e la
            ritrovi nella tua{" "}
            <Link href={PERSONAL_AREA_LINK} className={LINK_CLASS}>
              area personale
            </Link>
            .
          </p>
          <p>
            Chi non ha un account prenota sulla{" "}
            <a
              href={SUMUP_BOOKING_URL}
              target="_blank"
              rel="noopener noreferrer"
              className={LINK_CLASS}
            >
              pagina del club su SumUp
            </a>
            , dove valgono anche le condizioni di SumUp.
          </p>
        </>
      ),
    },
    {
      title: "Prezzi",
      body: (
        <p>
          Il prezzo è a giocatore e lo vedi nel riepilogo prima di confermare. È
          il prezzo finale, senza costi aggiuntivi. Con la tessera del club in
          corso hai la <Term>tariffa tesserati</Term>, che vale solo per te che
          prenoti.
        </p>
      ),
    },
    {
      title: "Pagamento",
      body: online ? (
        <>
          <p>
            Puoi pagare <Term>in struttura</Term>, all'arrivo, oppure{" "}
            <Term>online</Term>. Online paghi con carta, Apple Pay o Google Pay
            sulla pagina sicura di SumUp, quando prenoti o più tardi dalla
            pagina della prenotazione. I dati della carta li inserisci su SumUp
            e non passano dal nostro sito.
          </p>
          <p>
            Online paghi per te e per i compagni che hai indicato. Chi si
            aggiunge dopo paga la sua quota in struttura. Il pagamento non
            conferma da solo la prenotazione. La conferma resta della
            segreteria.
          </p>
        </>
      ) : (
        <p>
          Si paga <Term>in struttura</Term>, all'arrivo.
        </p>
      ),
    },
  ];

  if (online) {
    sections.push({
      title: "Disdetta e rimborso dei pagamenti online",
      body: (
        <>
          <p>
            Se hai pagato online puoi disdire la prenotazione e chiedere il
            rimborso fino a <Term>24 ore prima dell'inizio della partita</Term>.
            Scrivi a <MailLink /> o chiama il {getInfo("cell")}, indicando il
            codice della prenotazione. Ti rimborsiamo l'intero importo sulla
            carta con cui hai pagato. I tempi di accredito dipendono dalla tua
            banca.
          </p>
          <p>
            Nelle 24 ore prima della partita la disdetta{" "}
            <Term>non dà diritto al rimborso</Term>, e lo stesso vale se non ti
            presenti. Con così poco preavviso il club spesso non riesce a
            riassegnare il campo e lo perderebbe per intero. Per questo, se
            prenoti quando mancano meno di 24 ore, il pagamento online non è
            rimborsabile.
          </p>
          <p>
            Se è il club ad annullare la prenotazione o a non confermarla, ti
            rimborsiamo sempre l'intero importo.
          </p>
        </>
      ),
    });
  }

  sections.push(
    {
      title: "Diritto di recesso",
      body: (
        <p>
          Il recesso di 14 giorni previsto per gli acquisti a distanza{" "}
          <Term>non si applica</Term> alle prenotazioni dei campi, perché sono
          servizi per il tempo libero con una data precisa (art. 59, comma 1,
          lettera n del Codice del Consumo).{" "}
          {online
            ? "Al suo posto vale la disdetta con rimborso descritta sopra."
            : "Se non puoi più venire, avvisa la segreteria appena puoi, così il campo torna libero per altri."}
        </p>
      ),
    },
    {
      title: "Reclami",
      body: (
        <p>
          Se qualcosa non è andato come doveva, scrivi a <MailLink /> indicando
          il codice della prenotazione. Ti rispondiamo il prima possibile.
        </p>
      ),
    },
    {
      title: "I tuoi dati",
      body: (
        <p>
          Come trattiamo i dati della prenotazione e del pagamento lo spieghiamo
          nell'
          <Link href={PRIVACY_LINK} className={LINK_CLASS}>
            informativa privacy
          </Link>
          .
        </p>
      ),
    },
  );

  return (
    <article className="mx-auto w-full max-w-3xl px-(--gutter) pb-24">
      <header className="mb-12">
        <Heading as="h1" size="page">
          Condizioni di prenotazione
        </Heading>
        <p className="text-muted-foreground mt-4 text-sm leading-relaxed">
          Le regole per prenotare un campo dal sito di {getInfo("name")}
          {online ? ", pagarlo e disdirlo" : " e pagarlo"}.
        </p>
        <p className="text-muted-foreground/70 mt-3 text-xs">
          Ultimo aggiornamento {LAST_UPDATE}
        </p>
      </header>

      <div className="flex flex-col gap-10">
        {sections.map((section, index) => (
          <Section key={section.title} number={index + 1} title={section.title}>
            {section.body}
          </Section>
        ))}
      </div>
    </article>
  );
}
