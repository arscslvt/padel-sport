import AnimatedBackground from "@/components/animated-background";
import Header from "@/components/header";
import { Toaster } from "@/components/ui/sonner";

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
      <Header hideNav hideBackground />
      <main className="relative z-10">{children}</main>
      <Toaster />
    </>
  );
}
