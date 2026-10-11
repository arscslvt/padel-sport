import { ArrowUpRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type React from "react";
import courtPhoto from "@/assets/auth/court.webp";
import { Logo } from "@/components/logo";
import { siteUrl } from "@/lib/site";

/**
 * La cornice dell'accesso: la foto del campo da un lato, il modulo dall'altro.
 *
 * Su desktop è uno split a tutta altezza, con la foto ferma mentre la colonna
 * del modulo resta libera. Su telefono la foto diventa una fascia in alto e il
 * modulo scorre sotto, così il campo email resta sopra la tastiera.
 *
 * Sta fuori da `(staff)` apposta: la cornice del gestionale carica i conteggi
 * e il tour, che senza una sessione dello staff fallirebbero in coro.
 */
export default function AuthLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="min-h-[100dvh] bg-background lg:grid lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
      <aside className="p-2 pt-[max(0.5rem,env(safe-area-inset-top))] sm:p-3 lg:sticky lg:top-0 lg:h-[100dvh]">
        <div className="relative isolate h-[34dvh] min-h-[220px] overflow-hidden rounded-[24px] bg-club sm:h-[40dvh] lg:h-full lg:rounded-[28px]">
          <Image
            src={courtPhoto}
            alt=""
            fill
            priority
            placeholder="blur"
            sizes="(min-width: 1024px) 55vw, 100vw"
            className="auth-photo -z-10 object-cover object-[30%_55%]"
          />
          {/* Il verde del marchio sale dal basso: tiene leggibile il titolo. */}
          <div
            aria-hidden
            className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,oklch(0.29_0.055_165/0.35)_0%,oklch(0.29_0.055_165/0)_32%,oklch(0.29_0.055_165/0.25)_58%,oklch(0.29_0.055_165/0.92)_100%)]"
          />

          <Logo className="auth-rise absolute top-5 left-5 h-9 w-auto text-white sm:top-6 sm:left-6 lg:top-8 lg:left-8 lg:h-11" />

          <p
            className="auth-rise absolute right-5 bottom-5 left-5 max-w-[18ch] text-[28px] leading-[1.05] font-semibold tracking-[-0.03em] text-balance text-white sm:right-6 sm:bottom-6 sm:left-6 sm:text-4xl lg:right-10 lg:bottom-10 lg:left-10 lg:text-5xl xl:text-[56px]"
            style={{ "--auth-delay": "250ms" } as React.CSSProperties}
          >
            Il club, in un posto solo.
          </p>
        </div>
      </aside>

      <section className="flex min-h-[calc(66dvh-1rem)] flex-col px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:px-10 lg:min-h-[100dvh] lg:px-14">
        <header className="hidden h-20 items-center justify-end lg:flex">
          <SiteLink />
        </header>

        <main className="flex flex-1 items-start pt-9 pb-10 lg:items-center lg:py-0">
          <div
            className="auth-rise mx-auto w-full max-w-[380px]"
            style={{ "--auth-delay": "120ms" } as React.CSSProperties}
          >
            {children}
          </div>
        </main>

        <footer className="flex items-center justify-between gap-4 text-xs text-muted-foreground lg:justify-center">
          <span>ASD Padel Sport Melilli</span>
          <span className="lg:hidden">
            <SiteLink />
          </span>
        </footer>
      </section>
    </div>
  );
}

function SiteLink() {
  return (
    <Link
      href={siteUrl("/")}
      className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-xs text-muted-foreground transition-colors duration-150 hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-club/25 focus-visible:outline-none lg:text-sm"
    >
      Vai al sito
      <ArrowUpRight className="size-3.5" />
    </Link>
  );
}
