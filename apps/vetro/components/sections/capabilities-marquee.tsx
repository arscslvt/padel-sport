import {
  ArrowsClockwiseIcon,
  BellRingingIcon,
  CalendarXIcon,
  ChatsCircleIcon,
  CurrencyEurIcon,
  DeviceMobileIcon,
  IdentificationCardIcon,
  LifebuoyIcon,
  ShieldCheckIcon,
  SquaresFourIcon,
  UserCircleGearIcon,
  UsersFourIcon,
} from "@phosphor-icons/react/dist/ssr";

import { SumUpLogo } from "@/components/brand/sumup-logo";

/**
 * Tutto quello che non ha una tessera sua, in una fascia che scorre. È
 * l'unica cosa della pagina che si muove da sola all'infinito: sono tante
 * cose che non chiedono attenzione una per una, e si fermano sotto il
 * puntatore per chi vuole leggerle. Con il movimento ridotto restano ferme
 * e si scorrono a mano.
 */
const ITEMS = [
  { icon: CurrencyEurIcon, label: "Listino prezzi" },
  { icon: IdentificationCardIcon, label: "Prezzo per i tesserati" },
  { icon: SquaresFourIcon, label: "Quadrangolari su due campi" },
  { icon: UsersFourIcon, label: "Partite aperte" },
  { icon: ChatsCircleIcon, label: "Inviti su WhatsApp" },
  { icon: BellRingingIcon, label: "Notifiche push" },
  { icon: CalendarXIcon, label: "Chiusure per data" },
  { icon: UserCircleGearIcon, label: "Staff e ruoli" },
  { icon: DeviceMobileIcon, label: "Si installa sul telefono" },
  // Al posto dell'icona, il simbolo ufficiale di SumUp (brand/sumup-logo.tsx).
  {
    icon: ArrowsClockwiseIcon,
    label: "Prenotazioni SumUp in agenda",
    sumup: true,
  },
  { icon: LifebuoyIcon, label: "Guida integrata" },
  { icon: ShieldCheckIcon, label: "Privacy e cancellazione account" },
] as const;

export function CapabilitiesMarquee() {
  return (
    <section aria-label="Altre funzioni" className="py-6">
      <div className="marquee overflow-x-auto [scrollbar-width:none] motion-safe:overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]">
        <ul className="marquee-track flex w-max gap-3 py-2">
          {/* Due copie una dopo l'altra: a metà corsa la seconda prende il
              posto della prima e il giro riparte senza scatto. La copia è
              nascosta allo screen reader. */}
          {[0, 1].map((copy) =>
            ITEMS.map(({ icon: Icon, label, ...item }) => (
              <li
                key={`${copy}-${label}`}
                aria-hidden={copy === 1}
                className="flex h-12 shrink-0 items-center gap-2.5 rounded-full border border-border bg-card pr-5 pl-2.5 text-[15px] shadow-[0_1px_2px_oklch(0_0_0/4%)]"
              >
                <span className="grid size-7 place-content-center rounded-full bg-brand-soft text-brand">
                  {"sumup" in item ? (
                    <SumUpLogo
                      variant="short"
                      label=""
                      className="size-3.5 text-foreground"
                    />
                  ) : (
                    <Icon aria-hidden weight="duotone" className="size-4" />
                  )}
                </span>
                {label}
              </li>
            )),
          )}
        </ul>
      </div>
    </section>
  );
}
