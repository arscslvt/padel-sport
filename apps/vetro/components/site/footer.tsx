import Link from "next/link";

import { LogoMark } from "@/components/brand/logo";
import { Reveal } from "@/components/motion/reveal";
import { ANCHORS, anchor, BRAND, ROUTES } from "@/lib/brand";

const LINKS = [
  { label: "Come funziona", href: anchor(ANCHORS.how) },
  { label: "Funzioni", href: anchor(ANCHORS.features), desktopOnly: true },
  { label: "Vantaggi", href: anchor(ANCHORS.benefits) },
  { label: "SumUp", href: anchor(ANCHORS.sumup) },
  { label: "Giocatori", href: anchor(ANCHORS.players), desktopOnly: true },
  { label: "Prezzi", href: ROUTES.pricing },
  { label: "Domande", href: anchor(ANCHORS.faq) },
  { label: "Richiedi una demo", href: anchor(ANCHORS.demo) },
] as const;

/**
 * La chiusura: le voci della pagina e il nome in grande, tagliato dal bordo
 * come se continuasse oltre lo schermo. È l'ultima cosa che si vede, e
 * l'unica in cui il marchio occupa tutto lo spazio.
 */
export function Footer() {
  return (
    <footer className="overflow-hidden pt-16">
      <div className="page-container">
        <div className="flex flex-col gap-10 border-t border-border pt-10 md:flex-row md:items-start md:justify-between">
          <div className="flex items-center gap-2.5 text-[15px] text-muted-foreground">
            <LogoMark className="text-foreground" />
            {BRAND.tagline}
          </div>
          <nav aria-label="Pagina">
            <ul className="grid grid-cols-2 gap-x-10 gap-y-3 text-[15px] sm:grid-cols-3">
              {LINKS.map((link) => (
                // Le sezioni che da telefono non ci sono non hanno un link.
                <li
                  key={link.href}
                  className={
                    "desktopOnly" in link ? "max-lg:hidden" : undefined
                  }
                >
                  <Link
                    href={link.href}
                    className="rounded-sm text-foreground/75 outline-none transition-colors duration-160 hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
        <p className="mt-12 text-[13px] text-muted-foreground">
          © {new Date().getFullYear()} {BRAND.name}
        </p>
      </div>

      <Reveal distance={60} amount={0.05}>
        <p
          aria-hidden
          className="mt-6 -mb-[0.24em] text-center font-display text-[clamp(8rem,31vw,28rem)] leading-[0.8] tracking-[-0.04em] bg-linear-to-b from-zinc-300 via-zinc-200 to-transparent to-90% bg-clip-text text-transparent select-none [-webkit-text-stroke:1px_var(--color-zinc-300)]"
        >
          {BRAND.name}
        </p>
      </Reveal>
    </footer>
  );
}
