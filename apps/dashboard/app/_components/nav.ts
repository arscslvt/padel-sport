import {
  CalendarDays,
  Gift,
  Inbox,
  ListChecks,
  type LucideIcon,
  Mail,
  Settings,
  Ticket,
  Users,
} from "lucide-react";

/**
 * Le voci della dashboard, in un posto solo.
 *
 * Le stesse alimentano la barra in basso da telefono e la barra laterale da
 * desktop: due elenchi scritti a mano finirebbero per non essere d'accordo su
 * come si chiama una sezione. `count` dice quale contatore mostra il numero
 * di cose da fare (counts.provider.tsx).
 */

export type CountKey = "agenda" | "requests" | "points";

export interface NavItem {
  name: string;
  /** Etichetta corta per la barra in basso, dove lo spazio è di una parola. */
  short?: string;
  href: string;
  icon: LucideIcon;
  count?: CountKey;
}

/** Le quattro cose di tutti i giorni: la barra in basso le tiene a un tocco. */
export const PRIMARY_NAV: readonly NavItem[] = [
  { name: "Agenda", href: "/", icon: CalendarDays, count: "agenda" },
  {
    name: "Richieste",
    href: "/requests",
    icon: Inbox,
    count: "requests",
  },
  { name: "Clienti", href: "/clients", icon: Users },
  {
    name: "Punti e premi",
    short: "Punti",
    href: "/points",
    icon: Gift,
    count: "points",
  },
];

/** Il resto: su telefono sta dietro «Altro», su desktop in coda alla barra. */
export const SECONDARY_NAV: readonly { title: string; items: NavItem[] }[] = [
  {
    title: "Eventi",
    items: [
      { name: "Iscrizioni", href: "/events", icon: Ticket },
      { name: "Arrivi", href: "/events/arrivi", icon: ListChecks },
      {
        name: "Comunicazioni",
        href: "/events/comunicazioni",
        icon: Mail,
      },
    ],
  },
  {
    title: "Club",
    items: [{ name: "Configurazione", href: "/settings", icon: Settings }],
  },
];

/**
 * Quale voce è accesa.
 *
 * Vince la corrispondenza più lunga: su `/events/arrivi` deve
 * accendersi «Arrivi», non anche «Iscrizioni». L'Agenda è la radice di tutte
 * le rotte e si accende solo su se stessa.
 */
export function activeHref(pathname: string): string | null {
  const all = [...PRIMARY_NAV, ...SECONDARY_NAV.flatMap((g) => g.items)];
  const matches = all.filter(
    (item) =>
      pathname === item.href ||
      (item.href !== "/" && pathname.startsWith(`${item.href}/`)),
  );

  return matches.sort((a, b) => b.href.length - a.href.length)[0]?.href ?? null;
}

/** È una delle pagine che su telefono stanno dietro «Altro». */
export function isSecondary(href: string | null): boolean {
  return SECONDARY_NAV.some((group) =>
    group.items.some((item) => item.href === href),
  );
}
