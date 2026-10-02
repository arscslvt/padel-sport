import type { Metadata } from "next";

import { Heading } from "@/components/ui/heading";

import { PersonalArea } from "./_components/personal-area";

export const metadata: Metadata = {
  title: "Area personale | A.S.D. Padel Sport Melilli",
  description:
    "Prenota un campo, ritrova le tue prenotazioni e controlla punti e premi del club.",
  robots: { index: false, follow: false },
};

export default function PersonalAreaPage() {
  return (
    <section className="mx-auto w-full max-w-6xl px-6 pb-24 lg:px-12">
      <header className="mb-10">
        <Heading as="h1" size="page">
          Area personale
        </Heading>
        <p className="text-muted-foreground max-w-[52ch] pt-3 text-sm leading-relaxed">
          Le tue partite, i tuoi punti e i premi che puoi riscattare al club.
        </p>
      </header>

      <PersonalArea />
    </section>
  );
}
