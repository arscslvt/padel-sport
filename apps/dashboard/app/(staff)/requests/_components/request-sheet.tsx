"use client";

import { format } from "date-fns";
import { it } from "date-fns/locale";
import { Coins, Mail, MessageSquare, Phone, UserRound } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

import { SheetHeader } from "@/app/_components/sheet-header";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  ResponsiveDrawer,
  ResponsiveDrawerContent,
  ResponsiveDrawerFooter,
} from "@/components/ui/responsive-drawer";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { levelLabel, missingPlayersLabel } from "@/lib/match-request";
import { cn } from "@/lib/utils";

import { MatchStatusBadge, SupportStatusBadge } from "./status-badge";
import {
  MATCH_STATUS_LABELS,
  MATCH_STATUSES,
  type MatchRequest,
  type MatchStatus,
  type PointReport,
  REPORT_CATEGORY_LABELS,
  SUPPORT_STATUS_LABELS,
  SUPPORT_STATUSES,
  type SupportRequest,
  type SupportStatus,
} from "./types";

/** Quale richiesta è aperta, e da quale coda viene. */
export type Selection =
  | { kind: "support"; id: string }
  | { kind: "match"; id: string }
  | { kind: "report"; id: string }
  | null;

function signedPoints(delta: number) {
  return delta > 0 ? `+${delta}` : `${delta}`;
}

function Field({
  icon,
  label,
  className,
  children,
}: {
  icon?: React.ReactNode;
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("min-w-0 space-y-1", className)}>
      <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
        {icon}
        {label}
      </p>
      <div className="text-sm">{children}</div>
    </div>
  );
}

/** Il contenuto che scorre fra intestazione e azioni, come nell'agenda. */
function Body({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 pt-1 pb-2 md:-mx-1 md:px-1">
      {children}
    </div>
  );
}

/** Le azioni in fondo, sopra la barra di sistema del telefono. */
function Footer({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <ResponsiveDrawerFooter
      className={cn(
        "grid gap-2 pb-[calc(1rem+env(safe-area-inset-bottom))] md:pb-0",
        className,
      )}
    >
      {children}
    </ResponsiveDrawerFooter>
  );
}

function StatusField<Status extends string>({
  id,
  value,
  statuses,
  labels,
  disabled,
  hint,
  onChange,
}: {
  id: string;
  value: Status;
  statuses: Status[];
  labels: Record<Status, string>;
  disabled: boolean;
  hint?: string;
  onChange: (status: Status) => void;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>Stato</Label>
      <Select
        value={value}
        onValueChange={(next) => onChange(next as Status)}
        disabled={disabled}
      >
        <SelectTrigger id={id} className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {statuses.map((status) => (
            <SelectItem key={status} value={status}>
              {labels[status]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {hint && <p className="text-muted-foreground text-xs">{hint}</p>}
    </div>
  );
}

/**
 * Il dettaglio di una richiesta, con i recapiti a portata di dito.
 *
 * Da telefono è un drawer dal basso, da desktop una finestra: lo stesso
 * `ResponsiveDrawer` della scheda prenotazione nell'agenda.
 *
 * Telefono e mail sono link veri: chi apre questa scheda l'ha quasi sempre
 * aperta per rispondere, e il passaggio dal copia-incolla è tempo perso allo
 * sportello.
 */
export function RequestSheet({
  selection,
  support,
  matches,
  reports,
  onOpenChange,
  onChanged,
}: {
  selection: Selection;
  support: SupportRequest[];
  matches: MatchRequest[];
  reports: PointReport[];
  onOpenChange: (open: boolean) => void;
  /** Ricarica le liste: senza reattività, vanno richieste di nuovo. */
  onChanged: () => void;
}) {
  const [saving, setSaving] = useState(false);

  const supportRequest =
    selection?.kind === "support"
      ? support.find((request) => request._id === selection.id)
      : undefined;

  const matchRequest =
    selection?.kind === "match"
      ? matches.find((request) => request._id === selection.id)
      : undefined;

  const report =
    selection?.kind === "report"
      ? reports.find((row) => row._id === selection.id)
      : undefined;

  const found = supportRequest ?? matchRequest ?? report;

  /**
   * Chiudere una segnalazione manda una mail al cliente: prima di salvare si
   * passa da qui, per scrivergli cosa abbiamo trovato.
   */
  const [resolving, setResolving] = useState(false);
  const [reply, setReply] = useState("");

  // Ogni richiesta aperta riparte senza una chiusura a metà della precedente.
  const [openedId, setOpenedId] = useState(selection?.id);
  if (openedId !== selection?.id) {
    setOpenedId(selection?.id);
    setResolving(false);
    setReply("");
  }

  const updateStatus = async (
    status: SupportStatus | MatchStatus,
    replyText?: string,
  ) => {
    if (!selection) return;

    setSaving(true);
    try {
      const response = await fetch("/api/dashboard/requests", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: selection.kind,
          requestId: selection.id,
          status,
          ...(replyText?.trim() ? { reply: replyText.trim() } : {}),
        }),
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        toast.error("Stato non aggiornato", {
          description: payload?.error ?? "Riprova fra poco.",
        });
        return;
      }

      toast.success("Stato aggiornato", {
        description: payload?.notified
          ? "Il cliente riceve una mail con il nuovo stato."
          : undefined,
      });
      setResolving(false);
      setReply("");
      onChanged();
    } catch {
      toast.error("Stato non aggiornato", {
        description: "Controlla la connessione e riprova.",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <ResponsiveDrawer open={selection !== null} setOpen={onOpenChange}>
      <ResponsiveDrawerContent className="sm:max-w-md md:max-h-[90dvh] md:overflow-y-auto">
        {selection && !found ? (
          <SheetHeader
            title="Richiesta non trovata"
            description="Potrebbe essere stata cancellata, o il link è vecchio."
          />
        ) : supportRequest ? (
          <>
            <SheetHeader
              title={supportRequest.name}
              description={`Ricevuta il ${format(supportRequest.createdAt, "d MMMM yyyy 'alle' HH:mm", { locale: it })}${supportRequest.memberId ? ` · socio ${supportRequest.memberId}` : ""}`}
            />

            <Body>
              <SupportStatusBadge
                status={supportRequest.status}
                className="w-fit"
              />

              <div className="grid gap-4 sm:grid-cols-2">
                <Field icon={<Phone className="size-3.5" />} label="Telefono">
                  <a
                    href={`tel:${supportRequest.phone}`}
                    className="hover:underline"
                  >
                    {supportRequest.phone}
                  </a>
                </Field>
                <Field icon={<Mail className="size-3.5" />} label="Email">
                  <a
                    href={`mailto:${supportRequest.email}`}
                    className="break-all hover:underline"
                  >
                    {supportRequest.email}
                  </a>
                </Field>
              </div>

              <Field
                icon={<MessageSquare className="size-3.5" />}
                label="Messaggio"
              >
                <p className="bg-muted/40 rounded-lg border p-3 whitespace-pre-wrap">
                  {supportRequest.message}
                </p>
              </Field>

              <StatusField
                id="support-status"
                value={supportRequest.status}
                statuses={SUPPORT_STATUSES}
                labels={SUPPORT_STATUS_LABELS}
                disabled={saving}
                onChange={(status) => void updateStatus(status)}
              />
            </Body>

            <Footer>
              <Button asChild className="h-12 rounded-xl">
                <a href={`mailto:${supportRequest.email}`}>
                  <Mail className="size-4" />
                  Rispondi via mail
                </a>
              </Button>
            </Footer>
          </>
        ) : matchRequest ? (
          <>
            <SheetHeader
              title={matchRequest.name}
              description={`Cerca ${missingPlayersLabel(matchRequest.missingPlayers)} per il ${format(matchRequest.matchDate, "d MMMM yyyy 'alle' HH:mm", { locale: it })}`}
            />

            <Body>
              <MatchStatusBadge
                status={matchRequest.status}
                className="w-fit"
              />

              <div className="grid grid-cols-2 gap-4">
                <Field icon={<Phone className="size-3.5" />} label="Telefono">
                  <a
                    href={`tel:${matchRequest.phone}`}
                    className="hover:underline"
                  >
                    {matchRequest.phone}
                  </a>
                </Field>
                <Field label="Livello">{levelLabel(matchRequest.level)}</Field>
                <Field
                  icon={<Mail className="size-3.5" />}
                  label="Email"
                  className="col-span-2"
                >
                  <a
                    href={`mailto:${matchRequest.email}`}
                    className="break-all hover:underline"
                  >
                    {matchRequest.email}
                  </a>
                </Field>
                <Field label="Richiesta ricevuta" className="col-span-2">
                  {format(matchRequest.createdAt, "d MMM yyyy, HH:mm", {
                    locale: it,
                  })}
                </Field>
              </div>

              {matchRequest.notes && (
                <Field
                  icon={<MessageSquare className="size-3.5" />}
                  label="Note"
                >
                  <p className="bg-muted/40 rounded-lg border p-3 whitespace-pre-wrap">
                    {matchRequest.notes}
                  </p>
                </Field>
              )}

              <StatusField
                id="match-status"
                value={matchRequest.status}
                statuses={MATCH_STATUSES}
                labels={MATCH_STATUS_LABELS}
                disabled={saving}
                onChange={(status) => void updateStatus(status)}
              />
            </Body>

            <Footer>
              <Button asChild className="h-12 rounded-xl">
                <a href={`tel:${matchRequest.phone}`}>
                  <Phone className="size-4" />
                  Chiama {matchRequest.name}
                </a>
              </Button>
            </Footer>
          </>
        ) : report ? (
          <>
            <SheetHeader
              title={report.player?.name ?? "Cliente rimosso"}
              description={`${REPORT_CATEGORY_LABELS[report.category]} · ricevuta il ${format(report.createdAt, "d MMMM yyyy 'alle' HH:mm", { locale: it })}`}
            />

            <Body>
              <SupportStatusBadge status={report.status} className="w-fit" />

              {report.player && (
                <div className="grid grid-cols-2 gap-4">
                  {report.player.phone && (
                    <Field
                      icon={<Phone className="size-3.5" />}
                      label="Telefono"
                    >
                      <a
                        href={`tel:${report.player.phone}`}
                        className="hover:underline"
                      >
                        {report.player.phone}
                      </a>
                    </Field>
                  )}
                  <Field label="Saldo attuale">
                    {report.player.points} punti
                  </Field>
                  {report.player.email && (
                    <Field
                      icon={<Mail className="size-3.5" />}
                      label="Email"
                      className="col-span-2"
                    >
                      <a
                        href={`mailto:${report.player.email}`}
                        className="break-all hover:underline"
                      >
                        {report.player.email}
                      </a>
                    </Field>
                  )}
                </div>
              )}

              <Field icon={<Coins className="size-3.5" />} label="Movimento">
                {report.transaction ? (
                  <div className="bg-muted/40 flex items-baseline justify-between gap-3 rounded-lg border p-3">
                    <div className="min-w-0">
                      <p className="truncate">{report.transaction.label}</p>
                      <p className="text-muted-foreground text-xs">
                        {format(report.transaction.createdAt, "d MMM yyyy", {
                          locale: it,
                        })}
                        {report.transaction.note
                          ? ` · ${report.transaction.note}`
                          : ""}
                      </p>
                    </div>
                    <span className="shrink-0 font-mono tabular-nums">
                      {signedPoints(report.transaction.delta)}
                    </span>
                  </div>
                ) : (
                  <p className="text-muted-foreground">
                    Nessun movimento indicato
                  </p>
                )}
              </Field>

              <Field
                icon={<MessageSquare className="size-3.5" />}
                label="Messaggio"
              >
                <p className="bg-muted/40 rounded-lg border p-3 whitespace-pre-wrap">
                  {report.message}
                </p>
              </Field>

              {report.status === "resolved" && report.staffReply && (
                <Field
                  icon={<Mail className="size-3.5" />}
                  label="Risposta inviata"
                >
                  <p className="bg-muted/40 rounded-lg border p-3 whitespace-pre-wrap">
                    {report.staffReply}
                  </p>
                </Field>
              )}

              <StatusField
                id="report-status"
                value={resolving ? "resolved" : report.status}
                statuses={SUPPORT_STATUSES}
                labels={SUPPORT_STATUS_LABELS}
                disabled={saving}
                hint="In carico e Risolta avvisano il cliente via mail."
                onChange={(status) => {
                  if (status === "resolved" && report.status !== "resolved") {
                    setResolving(true);
                    return;
                  }
                  setResolving(false);
                  void updateStatus(status);
                }}
              />

              {resolving && (
                <div className="space-y-3 rounded-lg border p-3">
                  <div className="space-y-2">
                    <Label htmlFor="report-reply">
                      Risposta per il cliente
                    </Label>
                    <Textarea
                      id="report-reply"
                      value={reply}
                      onChange={(event) => setReply(event.target.value)}
                      maxLength={1000}
                      placeholder="Es. Hai ragione: abbiamo aggiunto il punto che mancava."
                      className="min-h-24"
                    />
                    <p className="text-muted-foreground text-xs">
                      Facoltativa: la legge nella mail insieme al saldo
                      aggiornato.
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      disabled={saving}
                      onClick={() => {
                        setResolving(false);
                        setReply("");
                      }}
                    >
                      Annulla
                    </Button>
                    <Button
                      type="button"
                      disabled={saving}
                      onClick={() => void updateStatus("resolved", reply)}
                    >
                      Risolvi e avvisa
                    </Button>
                  </div>
                </div>
              )}
            </Body>

            {report.player && (
              <Footer
                className={report.player.email ? "grid-cols-2" : undefined}
              >
                {report.player.email && (
                  <Button asChild variant="outline" className="h-12 rounded-xl">
                    <a href={`mailto:${report.player.email}`}>
                      <Mail className="size-4" />
                      Rispondi
                    </a>
                  </Button>
                )}
                {/* I punti si correggono dalla scheda: è lì che passa ogni
                  movimento, con la sua mail al cliente. */}
                <Button asChild className="h-12 rounded-xl">
                  <Link
                    href={`/clients?client=${encodeURIComponent(report.player.id)}`}
                  >
                    <UserRound className="size-4" />
                    Scheda cliente
                  </Link>
                </Button>
              </Footer>
            )}
          </>
        ) : null}
      </ResponsiveDrawerContent>
    </ResponsiveDrawer>
  );
}
