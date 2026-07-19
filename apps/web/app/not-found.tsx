import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, CalendarDays, MapPin } from "lucide-react";

import Header from "@/components/header";
import Footer from "@/components/footer";
import { Button } from "@/components/ui/button";

import stickerLightning from "@/assets/stickers/lightning.png";
import stickerPadelBall from "@/assets/stickers/padel-ball.png";
import { getInfo } from "@/lib/info";

export default function NotFound() {
  return (
    <div className="relative min-h-dvh overflow-hidden bg-linear-to-b from-emerald-900 via-emerald-950 to-background text-white">
      <div className="pointer-events-none absolute inset-0 opacity-70">
        <div className="absolute -top-28 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-emerald-400/20 blur-3xl" />
        <div className="absolute bottom-16 -left-16 h-56 w-56 rounded-full bg-emerald-300/15 blur-3xl" />
      </div>

      <Header />

      <main className="relative z-10 mx-auto flex min-h-[74dvh] w-full max-w-6xl items-center px-6 pb-14 pt-22 lg:px-12 lg:pt-30">
        <div className="relative isolate mx-auto flex w-full max-w-3xl flex-col items-center gap-8 text-center">
          <Image
            src={stickerPadelBall}
            alt="Sticker palla da padel"
            className="absolute -left-6 top-3 z-0 hidden size-20 -rotate-12 opacity-85 md:block"
          />
          <Image
            src={stickerLightning}
            alt="Sticker fulmine"
            className="absolute -right-6 top-14 z-0 hidden size-20 rotate-12 opacity-85 md:block"
          />

          <p className="relative z-10 inline-flex rounded-full border border-emerald-200/25 bg-emerald-200/10 px-4 py-1 text-xs tracking-[0.18em] text-emerald-100 uppercase">
            Errore 404
          </p>

          <div className="relative z-10 space-y-3">
            <h1 className="font-heading text-4xl leading-tight font-bold text-white sm:text-5xl">
              Qui il match non si gioca.
            </h1>
            <p className="mx-auto max-w-xl text-sm text-emerald-50/85 sm:text-base">
              La pagina che cerchi non esiste o e stata spostata. Torna in campo
              dalla home o vai direttamente ai nostri eventi.
            </p>
          </div>

          <div className="relative z-10 flex w-full flex-col justify-center gap-3 sm:w-auto sm:flex-row">
            <Link href="/" className="w-full sm:w-auto">
              <Button
                size="lg"
                className="h-12 w-full rounded-t-4xl rounded-b-sm bg-emerald-400 px-7 font-heading text-emerald-950 hover:bg-emerald-300 sm:rounded-l-4xl sm:rounded-r-md"
              >
                <ArrowLeft className="size-4" />
                Torna alla home
              </Button>
            </Link>
            <Link href="/events" className="w-full sm:w-auto">
              <Button
                variant="secondary"
                size="lg"
                className="h-12 w-full rounded-b-4xl rounded-t-sm border border-white/10 bg-white/90 px-7 font-heading text-emerald-950 hover:bg-white sm:rounded-l-md sm:rounded-r-4xl"
              >
                <CalendarDays className="size-4" />
                Vedi eventi
              </Button>
            </Link>
          </div>

          <div className="relative z-10 mt-3 flex flex-col items-center gap-2 text-sm text-emerald-100/90 sm:flex-row">
            <MapPin className="size-4" />
            <span>{getInfo("address")}</span>
            <span className="hidden sm:inline">•</span>
            <a
              href={getInfo("bookingUrl")}
              className="font-medium text-emerald-200 underline decoration-emerald-300/40 underline-offset-4 hover:text-white"
            >
              Prenota un campo
            </a>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
