"use client";

import { format } from "date-fns";
import { it } from "date-fns/locale";
import {
  ArrowUpRight,
  Check,
  Mail,
  MessageCircle,
  Phone,
  StickyNote,
  X,
} from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";

import { LevelBars } from "@/components/level-bars";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { findLevelRangeIndex, LEVEL_RANGES } from "@/lib/levels";
import { DURATION, EASE } from "@/lib/motion";
import { cn } from "@/lib/utils";

import { AccountBadge } from "./account-badge";
import { MembershipBadge } from "./membership-badge";
import type { ClientDetail, Membership, MembershipState } from "./types";

/**
 * La scheda del cliente a tutta pagina.
 *
 * Si legge dall'alto come una conversazione allo sportello: *chi è* (foto,
 * nome, da quando è cliente, a che punto sono tessera e account), *come lo
 * raggiungo* (chiamata, WhatsApp, mail, a un tocco), *i tre numeri che
 * contano* (punti, livello, tessera), e le note dello staff prima di parlarci.
 * Sotto, le linguette dove si modifica; in fondo il secondario, i consensi.
 *
 * Da telefono niente riquadri: lo spazio in orizzontale è poco e ogni bordo
 * con il suo margine se ne mangia un pezzo. Le sezioni si separano con lo
 * spazio e con una riga sottile. Da 768px in su tornano le superfici, e la
 * colonna a destra raccoglie contatti, consensi e note.
 *
 * Il movimento è solo l'ingresso, in sequenza. Una pagina di lavoro non deve
 * muoversi mentre ci si lavora.
 */

const MEMBERSHIP_SUMMARY: Record<
  MembershipState,
  { label: string; tone: string }
> = {
  active: { label: "Attiva", tone: "text-success-foreground" },
  expiring: { label: "In scadenza", tone: "text-warning-foreground" },
  unpaid: { label: "Da pagare", tone: "text-danger-foreground" },
  expired: { label: "Scaduta", tone: "text-danger-foreground" },
  none: { label: "Non iscritto", tone: "text-muted-foreground" },
};

const CONSENT_LABELS = {
  marketing: "Comunicazioni promozionali",
  newsletter: "Newsletter",
  tracking: "Statistiche d'uso",
} as const;

/** Il numero per WhatsApp: solo cifre, con il prefisso italiano se manca. */
function whatsappNumber(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return digits.startsWith("39") || digits.length > 10 ? digits : `39${digits}`;
}

/** Da 768px in su la sezione torna una superficie; sotto sta a filo pagina. */
const SURFACE = "md:bg-card md:overflow-hidden md:rounded-2xl md:border";

export function ClientPageLayout({
  client,
  current,
  children,
}: {
  client: ClientDetail;
  current?: Membership;
  /** Le linguette della scheda: le stesse del pannello laterale. */
  children: ReactNode;
}) {
  const reduce = useReducedMotion();

  const rise = (delay: number) => ({
    initial: reduce ? { opacity: 0 } : { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0 },
    transition: {
      duration: reduce ? 0.15 : DURATION.base,
      delay: reduce ? 0 : delay,
      ease: EASE,
    },
  });

  const membership = MEMBERSHIP_SUMMARY[client.membershipState];
  const levelIndex = findLevelRangeIndex(client.level);
  const since = format(client.createdAt, "MMMM yyyy", { locale: it });

  const contacts = [
    {
      key: "call",
      label: "Chiama",
      icon: Phone,
      href: client.phone ? `tel:${client.phone}` : undefined,
    },
    {
      key: "whatsapp",
      label: "WhatsApp",
      icon: MessageCircle,
      href: client.phone
        ? `https://wa.me/${whatsappNumber(client.phone)}`
        : undefined,
      external: true,
    },
    {
      key: "mail",
      label: "Email",
      icon: Mail,
      href: client.email ? `mailto:${client.email}` : undefined,
    },
  ];

  return (
    <div className="space-y-6">
      <motion.header {...rise(0)} className={SURFACE}>
        <div className="flex items-center gap-4 md:p-6">
          <Avatar className="size-16 shrink-0 text-lg md:size-20 md:text-xl">
            {client.avatarUrl && <AvatarImage src={client.avatarUrl} />}
            <AvatarFallback>
              {client.name.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>

          <div className="min-w-0 flex-1">
            <h1 className="text-[1.625rem] leading-tight font-semibold tracking-[-0.02em] text-balance md:text-3xl">
              {client.name}
            </h1>
            <p className="text-muted-foreground mt-0.5 text-[13px]">
              {client.code && (
                <span className="font-mono">#{client.code} · </span>
              )}
              cliente da {since}
            </p>
            {/* Da desktop i recapiti stanno anche qui, da leggere; da telefono
                ci sono i tasti sotto, da toccare. */}
            <p className="text-muted-foreground mt-0.5 hidden truncate text-sm md:block">
              {[client.email, client.phone].filter(Boolean).join(" · ") ||
                "Nessun recapito"}
            </p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-1.5 md:mt-0 md:px-6 md:pb-5">
          <MembershipBadge
            state={client.membershipState}
            until={
              current
                ? format(current.endsAt, "d MMM yyyy", { locale: it })
                : undefined
            }
          />
          <AccountBadge
            state={client.account.state}
            suspended={Boolean(client.suspension)}
          />
          {client.isStaff && <Badge variant="secondary">Staff</Badge>}
        </div>

        {/* I gesti di chi ha il telefono in mano: a un tocco, grandi quanto
            un pollice. Spenti quando manca il recapito, ma sempre al loro
            posto: dove stanno non deve cambiare da un cliente all'altro. */}
        <nav
          aria-label="Contatta"
          className="mt-5 grid grid-cols-3 gap-2 md:hidden"
        >
          {contacts.map((contact) => {
            const body = (
              <>
                <span className="bg-muted flex size-12 items-center justify-center rounded-full transition-transform group-active:scale-90">
                  <contact.icon className="size-5" />
                </span>
                <span className="text-xs font-medium">{contact.label}</span>
              </>
            );

            return contact.href ? (
              <a
                key={contact.key}
                href={contact.href}
                target={contact.external ? "_blank" : undefined}
                rel={contact.external ? "noopener noreferrer" : undefined}
                className="group flex flex-col items-center gap-1.5 py-1"
              >
                {body}
              </a>
            ) : (
              <span
                key={contact.key}
                aria-disabled="true"
                title={`${contact.label}: recapito non indicato`}
                className="text-muted-foreground flex flex-col items-center gap-1.5 py-1 opacity-40"
              >
                {body}
              </span>
            );
          })}
        </nav>

        {/* Tre numeri, separati da righe sottili invece che chiusi in caselle:
            da telefono le caselle si mangiano metà della larghezza. */}
        <dl className="mt-5 grid grid-cols-3 divide-x border-y md:mt-0 md:border-b-0">
          <Stat label="Punti">
            <span className="text-2xl leading-none font-semibold tabular-nums">
              {client.points}
            </span>
          </Stat>
          <Stat label="Livello">
            <span className="flex items-center gap-1.5">
              <span className="text-2xl leading-none font-semibold tabular-nums">
                {client.level.toFixed(1)}
              </span>
              <LevelBars filled={levelIndex + 1} />
            </span>
            <span className="text-muted-foreground mt-1 block text-xs">
              {LEVEL_RANGES[levelIndex].label}
            </span>
          </Stat>
          <Stat label="Tessera">
            <span className={cn("text-[15px] font-semibold", membership.tone)}>
              {membership.label}
            </span>
            {current && client.membershipState !== "none" && (
              <span className="text-muted-foreground mt-1 block text-xs">
                fino al {format(current.endsAt, "d MMM", { locale: it })}
              </span>
            )}
          </Stat>
        </dl>
      </motion.header>

      {client.clubNotes && (
        <motion.section
          {...rise(0.04)}
          className="bg-muted/60 flex gap-3 rounded-xl p-3.5 md:hidden"
        >
          <StickyNote className="text-muted-foreground mt-0.5 size-4 shrink-0" />
          <div className="min-w-0">
            <h2 className="text-muted-foreground text-xs font-medium">
              Note del club
            </h2>
            <p className="mt-0.5 line-clamp-4 text-sm leading-relaxed whitespace-pre-line">
              {client.clubNotes}
            </p>
          </div>
        </motion.section>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
        <motion.section {...rise(0.06)} className={cn("min-w-0", SURFACE)}>
          {children}
        </motion.section>

        <motion.aside
          {...rise(0.12)}
          className="space-y-6 md:space-y-4 lg:sticky lg:top-6"
        >
          {/* Da telefono contatti e note sono già in cima: qui solo il resto. */}
          <SideSection title="Contatti" className="hidden md:block">
            <ul className="-mx-1">
              <ContactRow
                icon={Phone}
                label="Telefono"
                value={client.phone}
                href={client.phone ? `tel:${client.phone}` : undefined}
              />
              <ContactRow
                icon={MessageCircle}
                label="WhatsApp"
                value={client.phone}
                href={
                  client.phone
                    ? `https://wa.me/${whatsappNumber(client.phone)}`
                    : undefined
                }
                external
              />
              <ContactRow
                icon={Mail}
                label="Email"
                value={client.email}
                href={client.email ? `mailto:${client.email}` : undefined}
              />
            </ul>
          </SideSection>

          <SideSection
            title="Consensi"
            hint={
              client.consents
                ? `Aggiornati il ${format(client.consents.updatedAt, "d MMM yyyy", { locale: it })}`
                : "Mai raccolti: li dà la persona attivando l'account."
            }
          >
            {client.consents && (
              <ul className="space-y-2.5 text-sm">
                {Object.entries(CONSENT_LABELS).map(([key, label]) => {
                  const given =
                    client.consents?.[key as keyof typeof CONSENT_LABELS];

                  return (
                    <li key={key} className="flex items-center gap-2.5">
                      <span
                        className={cn(
                          "flex size-5 shrink-0 items-center justify-center rounded-full",
                          given
                            ? "bg-success-subtle text-success-foreground"
                            : "bg-muted text-muted-foreground",
                        )}
                      >
                        {given ? (
                          <Check className="size-3" />
                        ) : (
                          <X className="size-3" />
                        )}
                      </span>
                      <span className={cn(!given && "text-muted-foreground")}>
                        {label}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </SideSection>

          {client.clubNotes && (
            <SideSection
              title="Note del club"
              icon={StickyNote}
              hint="Le vede solo lo staff. Si modificano in Anagrafica."
              className="hidden md:block"
            >
              <p className="line-clamp-6 text-sm leading-relaxed whitespace-pre-line">
                {client.clubNotes}
              </p>
            </SideSection>
          )}
        </motion.aside>
      </div>
    </div>
  );
}

function Stat({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="px-3 py-3.5 first:pl-0 md:px-6 md:py-4 md:first:pl-6">
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className="mt-1.5">{children}</dd>
    </div>
  );
}

/**
 * Un blocco della colonna di destra. Da desktop è una superficie; da telefono
 * una sezione a filo pagina, separata da una riga sopra.
 */
function SideSection({
  title,
  hint,
  icon: Icon,
  className,
  children,
}: {
  title: string;
  hint?: string;
  icon?: typeof Phone;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <section
      className={cn(
        "border-t pt-5 md:bg-card md:rounded-2xl md:border md:p-4",
        className,
      )}
    >
      <h2 className="flex items-center gap-2 text-sm font-semibold">
        {Icon && <Icon className="text-muted-foreground size-4" />}
        {title}
      </h2>
      {children && <div className="mt-3">{children}</div>}
      {hint && <p className="text-muted-foreground mt-3 text-xs">{hint}</p>}
    </section>
  );
}

/**
 * Una riga di contatto: tutta cliccabile quando il recapito c'è, spenta e con
 * la ragione scritta quando manca. Meglio vedere «non indicato» che non
 * trovare il tasto e chiedersi dove sia finito.
 */
function ContactRow({
  icon: Icon,
  label,
  value,
  href,
  external,
}: {
  icon: typeof Phone;
  label: string;
  value?: string;
  href?: string;
  external?: boolean;
}) {
  const body = (
    <>
      <span className="bg-muted text-foreground flex size-8 shrink-0 items-center justify-center rounded-full">
        <Icon className="size-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="text-muted-foreground block text-xs">{label}</span>
        <span
          className={cn(
            "block truncate text-sm",
            !value && "text-muted-foreground",
          )}
        >
          {value ?? "Non indicato"}
        </span>
      </span>
      {href && (
        <ArrowUpRight className="text-muted-foreground size-4 shrink-0 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
      )}
    </>
  );

  return (
    <li>
      {href ? (
        <a
          href={href}
          target={external ? "_blank" : undefined}
          rel={external ? "noopener noreferrer" : undefined}
          className="group hover:bg-muted/60 flex items-center gap-3 rounded-lg px-1 py-2 transition-colors"
        >
          {body}
        </a>
      ) : (
        <div className="flex items-center gap-3 px-1 py-2 opacity-70">
          {body}
        </div>
      )}
    </li>
  );
}

/** Lo scheletro ha la forma della pagina: testata, tasti, numeri, contenuto. */
export function ClientPageSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true">
      <div className={cn("space-y-5 md:p-6", SURFACE)}>
        <div className="flex items-center gap-4">
          <Skeleton className="size-16 rounded-full md:size-20" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-4 w-36" />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 md:hidden">
          {["a", "b", "c"].map((key) => (
            <Skeleton key={key} className="mx-auto size-12 rounded-full" />
          ))}
        </div>
        <Skeleton className="h-16 w-full rounded-xl" />
      </div>
      <Skeleton className="h-10 w-full rounded-lg" />
      <Skeleton className="h-96 w-full rounded-2xl" />
    </div>
  );
}
