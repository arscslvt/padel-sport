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

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { DURATION, EASE } from "@/lib/motion";
import { cn } from "@/lib/utils";

import { AccountBadge } from "./account-badge";
import { MembershipBadge } from "./membership-badge";
import type { ClientDetail, Membership, MembershipState } from "./types";

/**
 * La scheda del cliente a tutta pagina.
 *
 * Il pannello laterale serve a una correzione al volo; questa pagina a quando
 * con una persona c'è da lavorare: la si legge prima di tutto in testa — chi è,
 * se è in regola, quanti punti ha — e le linguette restano il posto dove si
 * modifica. A destra quello che serve per contattarla e i consensi che ha
 * dato, perché prima di scriverle è la prima cosa da sapere.
 *
 * Il movimento è solo l'ingresso, in sequenza: testata, contenuto, colonna.
 * Una pagina di lavoro non deve muoversi mentre ci si lavora.
 */

const MEMBERSHIP_SUMMARY: Record<
  MembershipState,
  { label: string; tone: string }
> = {
  active: { label: "Attiva", tone: "text-green-700" },
  expiring: { label: "In scadenza", tone: "text-amber-700" },
  unpaid: { label: "Da pagare", tone: "text-red-700" },
  expired: { label: "Scaduta", tone: "text-red-700" },
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

  return (
    <div className="space-y-6">
      <motion.header
        {...rise(0)}
        className="bg-card overflow-hidden rounded-2xl border"
      >
        <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:p-6">
          <Avatar className="size-16 shrink-0 text-lg sm:size-20 sm:text-xl">
            {client.avatarUrl && <AvatarImage src={client.avatarUrl} />}
            <AvatarFallback>
              {client.name.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>

          <div className="min-w-0 flex-1 space-y-2">
            <div>
              <h1 className="truncate text-2xl font-semibold tracking-tight sm:text-3xl">
                {client.name}
              </h1>
              <p className="text-muted-foreground truncate text-sm">
                {[client.email, client.phone].filter(Boolean).join(" · ") ||
                  "Nessun recapito"}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <MembershipBadge
                state={client.membershipState}
                until={
                  current
                    ? format(current.endsAt, "d MMM yyyy", { locale: it })
                    : undefined
                }
              />
              <AccountBadge state={client.account.state} />
              {client.code && (
                <Badge variant="outline" className="font-mono">
                  #{client.code}
                </Badge>
              )}
              {client.isStaff && <Badge variant="secondary">Staff</Badge>}
            </div>
          </div>
        </div>

        {/* Le righe di separazione sono lo sfondo che passa fra le celle:
            funzionano uguali a due e a quattro colonne, senza contare chi sta
            in fondo o a destra. */}
        <dl className="bg-border grid grid-cols-2 gap-px border-t sm:grid-cols-4">
          <Stat label="Saldo punti">
            <span className="text-2xl font-semibold tabular-nums">
              {client.points}
            </span>
            <span className="text-muted-foreground ml-1 text-xs">punti</span>
          </Stat>
          <Stat label="Tessera">
            <span className={cn("font-medium", membership.tone)}>
              {membership.label}
            </span>
            {current && client.membershipState !== "none" && (
              <span className="text-muted-foreground block text-xs">
                fino al {format(current.endsAt, "d MMM yyyy", { locale: it })}
              </span>
            )}
          </Stat>
          <Stat label="Livello">
            <span className="text-2xl font-semibold tabular-nums">
              {client.level.toFixed(1)}
            </span>
          </Stat>
          <Stat label="Cliente dal">
            <span className="inline-block font-medium first-letter:uppercase">
              {format(client.createdAt, "MMMM yyyy", { locale: it })}
            </span>
          </Stat>
        </dl>
      </motion.header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
        <motion.section
          {...rise(0.06)}
          className="bg-card min-w-0 overflow-hidden rounded-2xl border"
        >
          {children}
        </motion.section>

        <motion.aside {...rise(0.12)} className="space-y-4 lg:sticky lg:top-6">
          <SideCard title="Contatti">
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
          </SideCard>

          <SideCard
            title="Consensi"
            hint={
              client.consents
                ? `Aggiornati il ${format(client.consents.updatedAt, "d MMM yyyy", { locale: it })}`
                : "Mai raccolti: li dà la persona attivando l'account."
            }
          >
            {client.consents && (
              <ul className="space-y-2 text-sm">
                {Object.entries(CONSENT_LABELS).map(([key, label]) => {
                  const given =
                    client.consents?.[key as keyof typeof CONSENT_LABELS];

                  return (
                    <li key={key} className="flex items-center gap-2.5">
                      <span
                        className={cn(
                          "flex size-5 shrink-0 items-center justify-center rounded-full",
                          given
                            ? "bg-green-100 text-green-800"
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
          </SideCard>

          {client.clubNotes && (
            <SideCard
              title="Note del club"
              icon={StickyNote}
              hint="Le vede solo lo staff. Si modificano in Anagrafica."
            >
              <p className="line-clamp-6 text-sm leading-relaxed whitespace-pre-line">
                {client.clubNotes}
              </p>
            </SideCard>
          )}
        </motion.aside>
      </div>
    </div>
  );
}

function Stat({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="bg-card px-5 py-4 sm:px-6">
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className="mt-1">{children}</dd>
    </div>
  );
}

function SideCard({
  title,
  hint,
  icon: Icon,
  children,
}: {
  title: string;
  hint?: string;
  icon?: typeof Phone;
  children?: ReactNode;
}) {
  return (
    <section className="bg-card rounded-2xl border p-4">
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

/** Lo scheletro ha la forma della pagina: testata, contenuto, colonna. */
export function ClientPageSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true">
      <Skeleton className="h-52 w-full rounded-2xl" />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <Skeleton className="h-[32rem] w-full rounded-2xl" />
        <div className="space-y-4">
          <Skeleton className="h-48 w-full rounded-2xl" />
          <Skeleton className="h-36 w-full rounded-2xl" />
        </div>
      </div>
    </div>
  );
}
