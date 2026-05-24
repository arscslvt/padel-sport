import AnimatedBackground from "@/components/animated-background";
import Header from "@/components/header";
import { Toaster } from "@/components/ui/sonner";
import Image from "next/image";

import logo from "@/assets/branding/logo.svg";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Tornei",
  description:
    "Scopri i tornei di padel in corso e partecipa alla competizione!",
};

export default function TournamentsLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <div className="absolute top-0 left-0 w-dvw z-0">
        <AnimatedBackground
          colorStops={[
            "#12cc9b",
            "#282828",
            "#171717",
          ]} /* Colori più scuri per intonarsi al tema Neutral */
          blend={0.9}
          amplitude={2.0}
          speed={0.3}
        />
      </div>
      <div className="fixed bottom-0 inset-x-0 bg-linear-to-t from-accent-foreground to-transparent h-2/3 w-dvw" />
      <main className="relative z-10">
        <div className="sticky z-40 top-0 flex justify-center pt-4 pb-6">
          <header className="flex flex-1 items-center gap-4 w-full px-3 md:px-0 md:max-w-5xl">
            <div className="flex-1 flex items-center">
              <Image
                src={logo}
                alt="ASD Padel Sport Logo"
                className="h-10 md:h-12 w-auto"
              />
            </div>
            <div>
              <Link href={"/"}>
                <Button size={"sm"}>Torna alla home</Button>
              </Link>
            </div>
          </header>
        </div>
        {children}
      </main>
      <Toaster />
    </>
  );
}
