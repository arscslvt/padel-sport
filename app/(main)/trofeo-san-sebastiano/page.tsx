import type { Metadata } from "next";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "1° Trofeo Padel San Sebastiano",
  description:
    "Regolamento, formula e dettagli ufficiali del 1° Trofeo Padel San Sebastiano organizzato da ASD PadelSport Melilli.",
  alternates: {
    canonical: "/trofeo-san-sebastiano",
  },
  openGraph: {
    type: "article",
    locale: "it_IT",
    url: "https://www.asdpadelsport.com/trofeo-san-sebastiano",
    title: "1° Trofeo Padel San Sebastiano",
    description:
      "Scopri regolamento, calendario e formato del 1° Trofeo Padel San Sebastiano.",
    siteName: "ASD PadelSport Melilli",
    images: [
      {
        url: "https://www.asdpadelsport.com/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "1° Trofeo Padel San Sebastiano - ASD PadelSport Melilli",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "1° Trofeo Padel San Sebastiano",
    description:
      "Regolamento e dettagli del torneo: gironi, fase finale e criteri di classifica.",
    images: ["https://www.asdpadelsport.com/og-image.jpg"],
  },
};

const rules = [
  {
    title: "Formato del torneo",
    content: [
      "Il torneo si articola in due fasi.",
      "Fase a gironi: le coppie saranno suddivise in gruppi e si affronteranno con formula tutti contro tutti.",
      "Fase finale: le migliori coppie classificate di ciascun girone accederanno al tabellone ad eliminazione diretta (quarti di finale, semifinali e finale).",
    ],
  },
  {
    title: "Durata e campi di gioco",
    content: [
      "Il torneo si svolgera nell'arco di circa un mese.",
      "Le partite saranno disputate sui 2 campi disponibili presso la struttura.",
      "Il calendario degli incontri sara definito dall'organizzazione, in accordo con i giocatori, tenendo conto delle rispettive disponibilita.",
    ],
    highlights: [
      "Ogni squadra potra modificare o rinviare una sola partita. Superato tale limite, l'incontro sara assegnato perso a tavolino con punteggio 0-3.",
      "E previsto un tempo massimo di attesa di 15 minuti: trascorso tale limite, la coppia assente perdera a tavolino.",
      "Il riscaldamento avra una durata massima di 5 minuti.",
    ],
  },
  {
    title: "Formato delle partite",
    content: [
      "Gli incontri si disputano al meglio dei 3 set, ciascuno a 6 game.",
      "Sul punteggio di 40-40 si applica la regola del killer point (punto decisivo).",
    ],
    highlights: [
      "Ogni set vinto assegna 1 punto in classifica.",
      "Vittoria 3-0: 3 punti alla squadra vincente, 0 alla perdente.",
      "Vittoria 2-1: 2 punti alla squadra vincente, 1 punto alla perdente.",
      "E previsto un tempo massimo di gioco di 1 ora e 30 minuti.",
      "Se allo scadere del tempo il terzo set non e concluso, il set sara assegnato alla coppia in vantaggio.",
      "In caso di parita, si disputera un tie-break ai 7 punti.",
    ],
  },
  {
    title: "Punteggio e classifica (fase a gironi)",
    content: [
      "La classifica dei gironi e determinata dal totale dei punti (set vinti).",
      "Criteri in caso di parita: scontro diretto, differenza game, sorteggio.",
    ],
  },
  {
    title: "Fase finale",
    content: [
      "Accedono alla fase finale le migliori coppie classificate nei gironi (numero stabilito dall'organizzazione).",
      "Gli incontri si svolgeranno con formula ad eliminazione diretta, a partire dai quarti di finale fino alle finali per i primi 4 posti.",
    ],
  },
  {
    title: "Arbitraggio e comportamento",
    content: [
      "Le partite saranno auto-arbitrate dai giocatori.",
      "E richiesto il massimo rispetto dei principi di correttezza e sportivita.",
      "In caso di controversie, l'organizzazione interverra per prendere una decisione definitiva.",
      "L'organizzazione si riserva il diritto di adottare provvedimenti disciplinari in caso di comportamenti scorretti o antisportivi.",
    ],
  },
  {
    title: "Modifiche al regolamento",
    content: [
      "L'organizzazione si riserva la facolta di apportare modifiche al presente regolamento qualora necessario per garantire il corretto svolgimento del torneo.",
    ],
  },
] as const;

export default function TrofeoSanSebastianoPage() {
  return (
    <section className="px-6 lg:px-32 pb-14 text-white">
      <div className="mx-auto max-w-5xl space-y-8">
        <header className="rounded-3xl border border-white/20 bg-white/10 p-6 lg:p-8 backdrop-blur-sm">
          <Badge className="mb-4 bg-emerald-300 text-emerald-950 hover:bg-emerald-300">
            TORNEO
          </Badge>
          <p className="text-sm uppercase tracking-wide text-white/70">
            A.S.D. Padel Sport Melilli
          </p>
          <h1 className="mt-2 font-heading text-3xl font-bold leading-tight lg:text-4xl">
            1° Trofeo Padel San Sebastiano
          </h1>
          <p className="mt-4 max-w-3xl text-white/80">
            Il torneo inaugura una nuova fase della stagione: un mese di sfide,
            gironi e finali per vivere il padel con intensita, rispetto e
            sportivita.
          </p>
        </header>

        <div className="grid w-full gap-4 md:grid-cols-2">
          {rules.map((rule, index) => (
            <Card
              key={rule.title}
              className="w-full border-white/20 bg-card/10 text-white backdrop-blur-sm"
            >
              <CardHeader>
                <CardTitle className="font-heading text-lg">
                  {index + 1}. {rule.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm leading-relaxed text-white/85">
                {rule.content.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
                {"highlights" in rule && rule.highlights.length ? (
                  <ul className="list-disc space-y-2 pl-5 text-white/80">
                    {rule.highlights.map((item: string) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                ) : null}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
