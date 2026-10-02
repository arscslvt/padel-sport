import { POINTS_TERMS_VERSION } from "@padel-sport/backend/convex/modules/points/version";
import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

import { Heading } from "@/components/ui/heading";
import { getInfo } from "@/lib/info";
import { PERSONAL_AREA_LINK, PRIVACY_LINK } from "@/lib/links";
import { formatClubDate } from "@/lib/points";

export const metadata: Metadata = {
  title: "Regolamento del programma punti",
  description:
    "Come funziona il programma punti di A.S.D. Padel Sport Melilli: adesione, come si guadagnano i punti, premi, riscatto, scadenze e recesso.",
  alternates: { canonical: "https://www.asdpadelsport.com/regolamento-punti" },
};

/**
 * Il regolamento del programma punti.
 *
 * È il testo che il socio accetta prima di ricevere punti: la data in testa
 * viene da `POINTS_TERMS_VERSION`, la stessa che il backend registra con
 * l'adesione. Cambiare il testo in modo sostanziale vuol dire cambiare anche
 * quella data, e chiedere a tutti di accettare di nuovo
 * (packages/backend/convex/modules/points/terms.ts).
 *
 * Il tono è quello della pagina privacy: frasi piane, niente legalese dove non
 * serve. Prima della pubblicazione in produzione va riletto dal consulente del
 * club, che sa se il programma ricade fra le operazioni a premio.
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

export default function PointsTermsPage() {
  const version = formatClubDate(
    new Date(`${POINTS_TERMS_VERSION}T12:00:00`).getTime(),
  );

  return (
    <article className="mx-auto w-full max-w-3xl px-6 pb-24 lg:px-12">
      <header className="mb-12">
        <Heading as="h1" size="page">
          Regolamento del programma punti
        </Heading>
        <p className="text-muted-foreground mt-4 text-sm leading-relaxed">
          Le regole del programma con cui {getInfo("name")} premia chi gioca al
          club. Valgono solo per chi decide di aderire: leggile prima di farlo.
        </p>
        <p className="text-muted-foreground/70 mt-3 text-xs">
          Versione in vigore dal {version}
        </p>
      </header>

      <div className="flex flex-col gap-10">
        <Section number={1} title="Chi organizza il programma">
          <p>
            Il programma è organizzato da <Term>{getInfo("name")}</Term>, con
            sede legale in {getInfo("legalAddress")}, codice fiscale{" "}
            {getInfo("cf")} e partita IVA {getInfo("piva")}. Per ogni domanda
            puoi scrivere a <MailLink /> o telefonare al {getInfo("cell")}.
          </p>
        </Section>

        <Section number={2} title="Chi può partecipare e come si aderisce">
          <p>
            Possono partecipare i <Term>soci del club</Term> che hanno una
            scheda presso la segreteria. Per chi ha meno di 18 anni aderisce un
            genitore o chi ne ha la responsabilità.
          </p>
          <p>
            L'adesione è <Term>gratuita e facoltativa</Term>. Si fa accettando
            questo regolamento dalla tua{" "}
            <Link href={PERSONAL_AREA_LINK} className={LINK_CLASS}>
              area personale
            </Link>
            , oppure firmando il modulo di adesione in segreteria. Non aderire
            non cambia nulla della tua iscrizione al club né delle prenotazioni:
            semplicemente non ricevi punti.
          </p>
          <p>
            Se il club ti assegna dei punti prima che tu abbia aderito, quei
            punti restano <Term>in attesa</Term>: non sono ancora nel tuo saldo
            e non ricevi comunicazioni sul programma. Te li accreditiamo tutti
            nel momento in cui aderisci. Se non vuoi aderire puoi chiederci di
            cancellarli; in ogni caso li cancelliamo dopo 12 mesi.
          </p>
        </Section>

        <Section number={3} title="Come si guadagnano i punti">
          <p>
            I punti li assegna la segreteria, per le occasioni che il club
            stabilisce: per esempio <Term>3 punti per ogni partita vinta</Term>.
            L'elenco delle occasioni e dei punti relativi può cambiare nel
            tempo; le modifiche valgono per i punti assegnati da quel momento in
            poi e non toccano quelli che hai già.
          </p>
          <p>
            Il club può anche togliere punti, ad esempio per correggere un
            errore di assegnazione. Il saldo non scende mai sotto zero.
          </p>
        </Section>

        <Section number={4} title="Saldo e avvisi">
          <p>
            Il saldo, gli ultimi movimenti e i premi li trovi nella tua area
            personale. Se ci hai lasciato un indirizzo email, ti scriviamo{" "}
            <Term>a ogni movimento</Term>: punti ricevuti, punti tolti, premi
            riscattati. Sono comunicazioni di servizio sul programma, non
            messaggi promozionali.
          </p>
        </Section>

        <Section number={5} title="Cosa valgono i punti">
          <p>
            I punti servono solo a ottenere i premi del programma.{" "}
            <Term>
              Non hanno valore in denaro, non si convertono in denaro e non si
              cedono
            </Term>{" "}
            ad altri soci o a terzi. Restano validi finché il programma è attivo
            e tu vi aderisci.
          </p>
        </Section>

        <Section number={6} title="Premi e riscatto">
          <p>
            I premi disponibili sono pubblicati nella tua area personale, con
            foto, descrizione, punti necessari ed eventuali condizioni d'uso. Un
            premio si sblocca quando il tuo saldo raggiunge i punti richiesti.
          </p>
          <p>
            Il premio si riscatta dall'area personale:{" "}
            <Term>i punti vengono scalati subito</Term> e ricevi un codice da
            mostrare in segreteria per ritirarlo. Il riscatto non si può
            annullare da soli: se hai sbagliato, scrivici e valutiamo noi.
          </p>
          <p>
            Alcuni premi hanno una <Term>validità</Term>, indicata nel premio
            stesso, che decorre dal giorno del riscatto. Passato quel termine il
            codice non è più utilizzabile. Valgono inoltre le condizioni scritte
            nel singolo premio, che accetti al momento del riscatto.
          </p>
          <p>
            I premi sono soggetti a disponibilità. Se un premio che hai
            riscattato non fosse più disponibile, ti proponiamo un premio di
            valore equivalente oppure ti restituiamo i punti.
          </p>
        </Section>

        <Section number={7} title="Errori e uso scorretto">
          <p>
            Il club può correggere i punti assegnati per errore e annullare
            quelli ottenuti in modo irregolare. In caso di abuso del programma
            può escludere il socio, dandogliene comunicazione e indicandone il
            motivo.
          </p>
        </Section>

        <Section number={8} title="Se vuoi uscire dal programma">
          <p>
            Puoi uscire quando vuoi scrivendo a <MailLink />. Da quel momento
            non ricevi più punti né comunicazioni sul programma; i{" "}
            <Term>punti non usati decadono</Term>, mentre i premi già riscattati
            restano utilizzabili fino alla loro scadenza.
          </p>
        </Section>

        <Section number={9} title="Modifiche e fine del programma">
          <p>
            Se cambiamo questo regolamento pubblichiamo qui la nuova versione
            con la sua data. Se la modifica è sostanziale ti chiediamo di
            accettarla di nuovo: finché non lo fai i nuovi punti restano in
            attesa, mentre quelli che hai restano tuoi.
          </p>
          <p>
            Il club può chiudere il programma con un{" "}
            <Term>preavviso di almeno 30 giorni</Term>, comunicato sul sito e
            via email a chi ha aderito, così da lasciarti il tempo di riscattare
            i premi con i punti che hai.
          </p>
        </Section>

        <Section number={10} title="I tuoi dati">
          <p>
            Per gestire il programma trattiamo il tuo saldo, i movimenti e i
            premi riscattati, collegati alla tua scheda di socio. Come e per
            quanto tempo lo spieghiamo nell'
            <Link href={PRIVACY_LINK} className={LINK_CLASS}>
              informativa privacy
            </Link>
            .
          </p>
        </Section>
      </div>
    </article>
  );
}
