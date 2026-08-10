import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { FaFacebookF, FaInstagram } from "react-icons/fa";

import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { getInfo } from "@/lib/info";
import { EVENTS_LINK, WHERE_WE_ARE_LINK } from "@/lib/links";

const routes: ReadonlyArray<{ name: string; href: string }> = [
  { name: "Dove trovarci", href: WHERE_WE_ARE_LINK },
  { name: "Tornei ed Eventi", href: EVENTS_LINK },
];

export default function Footer() {
  return (
    // `#contatti` è l'ancora del bottone "Contattaci" nell'hero.
    <footer
      id="contatti"
      className="border-border bg-background text-foreground max-w-dvw scroll-mt-24 border-t px-6 pt-14 pb-10 lg:px-12"
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-12">
        <div className="flex flex-col gap-10 sm:flex-row sm:justify-between">
          <div className="flex flex-col gap-5">
            <Logo className="text-foreground h-8 w-auto" />
            <div className="text-muted-foreground flex flex-col gap-0.5 text-sm">
              <span className="text-foreground font-medium">
                {getInfo("name")}
              </span>
              <span>{getInfo("address")}</span>
              <a
                href={`mailto:${getInfo("email")}`}
                className="hover:text-foreground w-fit transition-colors"
              >
                {getInfo("email")}
              </a>
              <a
                href={`tel:${getInfo("cell")}`}
                className="hover:text-foreground w-fit transition-colors"
              >
                {getInfo("cell")}
              </a>
            </div>
          </div>

          <div className="flex flex-col gap-8 sm:items-end">
            <nav aria-label="Link utili">
              <ul className="text-muted-foreground flex flex-col gap-1.5 text-sm sm:items-end">
                {routes.map((route) => (
                  <li key={route.href}>
                    <Link
                      href={route.href}
                      className="hover:text-foreground transition-colors"
                    >
                      {route.name}
                    </Link>
                  </li>
                ))}
                <li>
                  <a
                    href={getInfo("bookingUrl")}
                    className="hover:text-foreground transition-colors"
                  >
                    Prenota una partita
                  </a>
                </li>
              </ul>
            </nav>

            <div className="flex flex-col gap-1.5 sm:items-end">
              <span className="text-muted-foreground text-sm">Seguici su</span>
              <div className="flex gap-1 sm:translate-x-2.5">
                <Button
                  asChild
                  size="icon"
                  variant="ghost"
                  className="rounded-full"
                >
                  <a
                    href={getInfo("instagramUrl") || "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Instagram"
                  >
                    <FaInstagram className="size-5" />
                  </a>
                </Button>
                <Button
                  asChild
                  size="icon"
                  variant="ghost"
                  className="rounded-full"
                >
                  <a
                    href={getInfo("facebookUrl") || "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Facebook"
                  >
                    <FaFacebookF className="size-5" />
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="border-border flex flex-col gap-3 border-t pt-6">
          <div className="text-muted-foreground flex flex-col items-center gap-3 text-xs sm:flex-row sm:justify-between">
            <p>CF/P.IVA {getInfo("cf")}</p>
            <Link
              href="https://salvatorearesco.com"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground flex items-center gap-1 transition-colors"
            >
              <span>
                Sito web realizzato da{" "}
                <span className="font-medium">Salvatore Aresco</span>
              </span>
              <ArrowUpRight className="size-3.5" strokeWidth={1.5} />
            </Link>
          </div>

          <p className="text-muted-foreground/70 text-center text-[11px] sm:text-left">
            Foto di copertina di{" "}
            <a
              href="https://unsplash.com/@ollivves?utm_source=unsplash&utm_medium=referral&utm_content=creditCopyText"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground underline underline-offset-2 transition-colors"
            >
              Oliver Sjöström
            </a>{" "}
            su{" "}
            <a
              href="https://unsplash.com/photos/person-holding-tennis-racket-sZKLku0YnFM?utm_source=unsplash&utm_medium=referral&utm_content=creditCopyText"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground underline underline-offset-2 transition-colors"
            >
              Unsplash
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
