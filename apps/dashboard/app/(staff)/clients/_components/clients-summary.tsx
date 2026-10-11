"use client";

import { cn } from "@/lib/utils";

import type { AccountFilter, ClientFilters, MembershipFilter } from "./filters";
import type { Client, MembershipState } from "./types";

/**
 * Il riepilogo in testa all'elenco clienti, in poche righe invece di tre
 * riquadri.
 *
 * Risponde a «come stanno i miei soci?» in un'occhiata: quanti sono e quanti
 * ne sono arrivati di recente, come si dividono le tessere (una barra sola,
 * in proporzione, perché è una distribuzione e non tre numeri slegati), e le
 * due cose che chiedono un'azione — chi non ha l'account, chi ha dati da
 * completare.
 *
 * La legenda è anche il filtro: toccare «Da pagare» mostra sotto chi deve
 * pagare, con lo stesso stato della barra dei filtri. Il colore non parla mai
 * da solo: ogni segmento ha la sua voce con etichetta e numero, e i testi
 * restano nei colori del testo.
 */

const RECENT_DAYS = 30;

const SEGMENTS: {
  state: MembershipState;
  label: string;
  /** Il colore del segmento e del pallino: i toni di stato del tema. */
  color: string;
}[] = [
  { state: "active", label: "In regola", color: "bg-success" },
  { state: "expiring", label: "In scadenza", color: "bg-warning" },
  { state: "unpaid", label: "Da pagare", color: "bg-danger" },
  { state: "expired", label: "Scadute", color: "bg-danger/60" },
  { state: "none", label: "Senza tessera", color: "bg-foreground/20" },
];

export function ClientsSummary({
  clients,
  filters,
  onFiltersChange,
}: {
  /** L'anagrafica intera, staff escluso: non l'elenco filtrato dalla ricerca. */
  clients: Client[];
  filters: ClientFilters;
  onFiltersChange: (filters: ClientFilters) => void;
}) {
  const total = clients.length;
  const since = Date.now() - RECENT_DAYS * 24 * 60 * 60 * 1000;
  const recent = clients.filter((client) => client.createdAt >= since).length;
  const noAccount = clients.filter(
    (client) => client.account.state === "none",
  ).length;
  const incomplete = clients.filter(
    (client) => client.missingFields.length > 0,
  ).length;

  const counts = SEGMENTS.map((segment) => ({
    ...segment,
    count: clients.filter((client) => client.membershipState === segment.state)
      .length,
  })).filter((segment) => segment.count > 0);

  const toggleMembership = (state: MembershipFilter) =>
    onFiltersChange({
      ...filters,
      membership: filters.membership === state ? "all" : state,
    });

  const toggleAccount = (account: AccountFilter) =>
    onFiltersChange({
      ...filters,
      account: filters.account === account ? "all" : account,
    });

  return (
    <section aria-label="Riepilogo clienti" className="space-y-3">
      <p className="flex items-baseline gap-2">
        <span className="text-2xl font-semibold tabular-nums">{total}</span>
        <span className="text-muted-foreground text-sm">
          {total === 1 ? "cliente" : "clienti"}
          {recent > 0 && (
            <>
              {" · "}
              <span className="text-foreground font-medium tabular-nums">
                +{recent}
              </span>{" "}
              negli ultimi {RECENT_DAYS} giorni
            </>
          )}
        </span>
      </p>

      {total > 0 && (
        <>
          {/* La barra: un segmento per stato, largo quanto la sua quota, con
              2px di stacco fra l'uno e l'altro. Il dettaglio sta nella
              legenda sotto; qui il passaggio del mouse lo ripete. */}
          <div
            role="img"
            aria-label={counts
              .map((segment) => `${segment.count} ${segment.label}`)
              .join(", ")}
            className="flex h-2.5 gap-0.5"
          >
            {counts.map((segment) => (
              <div
                key={segment.state}
                title={`${segment.label}: ${segment.count} (${Math.round((segment.count / total) * 100)}%)`}
                className={cn(
                  "min-w-1 rounded-[3px] transition-opacity",
                  segment.color,
                  filters.membership !== "all" &&
                    filters.membership !== segment.state &&
                    "opacity-30",
                )}
                style={{ flexGrow: segment.count, flexBasis: 0 }}
              />
            ))}
          </div>

          <div className="-mx-1 flex flex-wrap gap-x-1 gap-y-0.5">
            {counts.map((segment) => (
              <LegendButton
                key={segment.state}
                active={filters.membership === segment.state}
                onClick={() => toggleMembership(segment.state)}
              >
                <span
                  aria-hidden
                  className={cn("size-2 rounded-full", segment.color)}
                />
                <span className="text-foreground font-medium tabular-nums">
                  {segment.count}
                </span>
                {segment.label}
              </LegendButton>
            ))}
          </div>

          {(noAccount > 0 || incomplete > 0) && (
            <div className="text-muted-foreground -mx-1 flex flex-wrap items-center gap-x-1 text-sm">
              {noAccount > 0 && (
                <LegendButton
                  active={filters.account === "no-account"}
                  onClick={() => toggleAccount("no-account")}
                >
                  <span className="text-foreground font-medium tabular-nums">
                    {noAccount}
                  </span>
                  senza account
                </LegendButton>
              )}
              {incomplete > 0 && (
                <span className="px-1">
                  <span className="text-foreground font-medium tabular-nums">
                    {incomplete}
                  </span>{" "}
                  con dati da completare
                </span>
              )}
            </div>
          )}
        </>
      )}
    </section>
  );
}

/** Una voce della legenda che è anche un filtro: acceso quando è attivo. */
function LegendButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "text-muted-foreground flex min-h-8 items-center gap-1.5 rounded-full px-2 text-[13px] transition-colors",
        active ? "bg-foreground/[0.07] text-foreground" : "hover:bg-muted",
      )}
    >
      {children}
    </button>
  );
}
