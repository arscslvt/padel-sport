import {
  CalendarCheckIcon,
  HandCoinsIcon,
  LockOpenIcon,
} from "@phosphor-icons/react/dist/ssr";

import { Reveal } from "@/components/motion/reveal";
import { TRIAL } from "@/lib/plans";

const PROMISES = [
  {
    icon: CalendarCheckIcon,
    title: `${TRIAL.days} giorni gratis`,
    body: "Con tutte le funzioni, sul tuo club.",
  },
  {
    icon: LockOpenIcon,
    title: "Nessun vincolo",
    body: "Paghi mese per mese e disdici quando vuoi.",
  },
  {
    icon: HandCoinsIcon,
    title: "Nessuna commissione",
    body: "I pagamenti delle prenotazioni vanno tutti al club.",
  },
] as const;

/**
 * Le tre promesse sotto i piani: quello che un club teme prima di firmare,
 * detto subito. Altri gestionali chiedono un contratto di mesi o una
 * percentuale sulle prenotazioni; qui non c'è né l'uno né l'altra.
 *
 * Una fila con i divisori, non tre schede: sono rassicurazioni, non
 * prodotti da scegliere.
 */
export function Promises({ className }: { className?: string }) {
  return (
    <Reveal className={className}>
      <ul className="grid grid-cols-1 gap-6 sm:grid-cols-3 sm:gap-0 sm:divide-x sm:divide-border">
        {PROMISES.map(({ icon: Icon, title, body }) => (
          <li
            key={title}
            className="flex items-start gap-3 sm:px-6 sm:first:pl-0 sm:last:pr-0"
          >
            <span className="grid size-9 shrink-0 place-content-center rounded-full bg-brand-soft text-brand">
              <Icon aria-hidden weight="duotone" className="size-5" />
            </span>
            <span>
              <span className="block text-[15px] font-semibold">{title}</span>
              <span className="mt-0.5 block text-[14px] leading-snug text-muted-foreground">
                {body}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </Reveal>
  );
}
