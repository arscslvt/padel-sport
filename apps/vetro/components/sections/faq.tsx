import { Reveal, Words } from "@/components/motion/reveal";
import { headingVariants } from "@/components/site/heading";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ANCHORS } from "@/lib/brand";
import { PLANS, PROMO, TRIAL } from "@/lib/plans";
import { cn } from "@/lib/utils";

const QUESTIONS = [
  {
    q: "Serve installare qualcosa?",
    a: "No. Vetro si apre dal browser, da computer e da telefono. Sul telefono lo aggiungi alla schermata Home e si apre come un'app, con le notifiche.",
  },
  {
    q: "Funziona con SumUp?",
    a: "Sì, con il piano Completo. Chi prenota può pagare online con SumUp, e i rimborsi partono dal gestionale quando li decidi tu. Il pagamento online è facoltativo, e puoi tenerlo spento.",
  },
  {
    q: "Può usarlo tutto lo staff?",
    a: "Dipende dal piano. Con Essenziale entra una persona, con Completo fino a 10, ognuna con il suo accesso. Con più persone, gli amministratori decidono chi può cambiare la configurazione del club.",
  },
  {
    q: "Come prenotano i giocatori?",
    a: "Dal telefono, scegliendo giorno, ora e compagni. Ricevono la conferma per email e possono invitare gli amici con un link su WhatsApp.",
  },
  {
    q: "E i dati dei clienti?",
    a: "Restano del club. Ogni cliente può chiedere la cancellazione del proprio account, subito o con trenta giorni per ripensarci.",
  },
  {
    q: "Quanto costa?",
    a: `${PLANS[0].name} costa ${PLANS[0].price} € al mese, ${PLANS[1].name} ${PLANS[1].price} € al mese, IVA esclusa. Con un codice di invito i primi ${PROMO.months} mesi costano ${PLANS[0].promoPrice} € e ${PLANS[1].promoPrice} €.`,
  },
  {
    q: "C'è un vincolo di durata?",
    a: `No. Dopo i ${TRIAL.days} giorni di prova paghi mese per mese, e puoi disdire quando vuoi. Nessuna penale e nessuna commissione sulle prenotazioni.`,
  },
] as const;

/**
 * Le domande di chi valuta Vetro, con risposte brevi, su due colonne: sei
 * domande si vedono tutte insieme, e si apre solo quella che interessa.
 */
export function Faq() {
  const half = Math.ceil(QUESTIONS.length / 2);
  const columns = [QUESTIONS.slice(0, half), QUESTIONS.slice(half)];

  return (
    <section id={ANCHORS.faq} className="py-24 sm:py-32">
      <div className="page-container">
        <h2
          className={cn(headingVariants({ size: "section" }), "max-w-[16ch]")}
        >
          <Words
            lead="Le domande"
            accent="di chi inizia."
            accentClassName="text-brand"
          />
        </h2>
        <div className="mt-12 grid grid-cols-1 gap-x-16 lg:mt-16 lg:grid-cols-2">
          {columns.map((questions, column) => (
            <Reveal key={questions[0].q} delay={column * 0.08}>
              <Accordion
                className={cn(
                  column === 1 && "max-lg:[&>*:first-child]:border-t-0",
                )}
              >
                {questions.map(({ q, a }) => (
                  <AccordionItem key={q} value={q}>
                    <AccordionTrigger>{q}</AccordionTrigger>
                    <AccordionContent>{a}</AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
