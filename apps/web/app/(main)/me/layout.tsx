import type { Metadata } from "next";

import { PersonalArea } from "./_components/personal-area";

export const metadata: Metadata = {
  title: {
    default: "Area personale",
    template: "%s · Area personale",
  },
  description:
    "Prenota un campo, ritrova le tue prenotazioni e controlla punti e premi del club.",
  robots: { index: false, follow: false },
};

/**
 * Il guscio resta montato fra una sezione e l'altra: verifica, portafoglio e
 * navigazione non ripartono da zero a ogni voce del dock.
 */
export default function PersonalAreaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <PersonalArea>{children}</PersonalArea>;
}
