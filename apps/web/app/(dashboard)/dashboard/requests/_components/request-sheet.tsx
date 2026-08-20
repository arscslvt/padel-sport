"use client";

import { format } from "date-fns";
import { it } from "date-fns/locale";
import { Mail, MessageSquare, Phone } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { levelLabel, missingPlayersLabel } from "@/lib/match-request";

import { MatchStatusBadge, SupportStatusBadge } from "./status-badge";
import {
  MATCH_STATUS_LABELS,
  MATCH_STATUSES,
  type MatchRequest,
  type MatchStatus,
  SUPPORT_STATUS_LABELS,
  SUPPORT_STATUSES,
  type SupportRequest,
  type SupportStatus,
} from "./types";

/** Quale richiesta è aperta, e da quale delle due code viene. */
export type Selection =
  | { kind: "support"; id: string }
  | { kind: "match"; id: string }
  | null;

function Field({
  icon,
  label,
  children,
}: {
  icon?: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
        {icon}
        {label}
      </p>
      <div className="text-sm">{children}</div>
    </div>
  );
}

/**
 * Il dettaglio di una richiesta, con i recapiti a portata di dito.
 *
 * Telefono e mail sono link veri: chi apre questa scheda l'ha quasi sempre
 * aperta per rispondere, e il passaggio dal copia-incolla è tempo perso allo
 * sportello.
 */
export function RequestSheet({
  selection,
  support,
  matches,
  onOpenChange,
  onChanged,
}: {
  selection: Selection;
  support: SupportRequest[];
  matches: MatchRequest[];
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

  const found = supportRequest ?? matchRequest;

  const updateStatus = async (status: SupportStatus | MatchStatus) => {
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
        }),
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        toast.error("Stato non aggiornato", {
          description: payload?.error ?? "Riprova fra poco.",
        });
        return;
      }

      toast.success("Stato aggiornato");
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
    <Sheet open={selection !== null} onOpenChange={onOpenChange}>
      <SheetContent className="w-full gap-0 overflow-y-auto sm:max-w-lg">
        {selection && !found ? (
          <SheetHeader>
            <SheetTitle>Richiesta non trovata</SheetTitle>
            <SheetDescription>
              Potrebbe essere stata cancellata, o il link è vecchio.
            </SheetDescription>
          </SheetHeader>
        ) : supportRequest ? (
          <>
            <SheetHeader>
              <SheetTitle className="flex flex-wrap items-center gap-2">
                {supportRequest.name}
                <SupportStatusBadge status={supportRequest.status} />
              </SheetTitle>
              <SheetDescription>
                Ricevuta il{" "}
                {format(supportRequest.createdAt, "d MMMM yyyy 'alle' HH:mm", {
                  locale: it,
                })}
                {supportRequest.memberId
                  ? ` · socio ${supportRequest.memberId}`
                  : ""}
              </SheetDescription>
            </SheetHeader>

            <div className="space-y-5 px-4 pb-6">
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

              <div className="space-y-2">
                <Label htmlFor="support-status">Stato</Label>
                <Select
                  value={supportRequest.status}
                  onValueChange={(value) =>
                    void updateStatus(value as SupportStatus)
                  }
                  disabled={saving}
                >
                  <SelectTrigger id="support-status" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SUPPORT_STATUSES.map((status) => (
                      <SelectItem key={status} value={status}>
                        {SUPPORT_STATUS_LABELS[status]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button asChild className="w-full">
                <a href={`mailto:${supportRequest.email}`}>
                  <Mail className="size-4" />
                  Rispondi via mail
                </a>
              </Button>
            </div>
          </>
        ) : matchRequest ? (
          <>
            <SheetHeader>
              <SheetTitle className="flex flex-wrap items-center gap-2">
                {matchRequest.name}
                <MatchStatusBadge status={matchRequest.status} />
              </SheetTitle>
              <SheetDescription>
                Cerca {missingPlayersLabel(matchRequest.missingPlayers)} per il{" "}
                {format(matchRequest.matchDate, "d MMMM yyyy 'alle' HH:mm", {
                  locale: it,
                })}
              </SheetDescription>
            </SheetHeader>

            <div className="space-y-5 px-4 pb-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field icon={<Phone className="size-3.5" />} label="Telefono">
                  <a
                    href={`tel:${matchRequest.phone}`}
                    className="hover:underline"
                  >
                    {matchRequest.phone}
                  </a>
                </Field>
                <Field icon={<Mail className="size-3.5" />} label="Email">
                  <a
                    href={`mailto:${matchRequest.email}`}
                    className="break-all hover:underline"
                  >
                    {matchRequest.email}
                  </a>
                </Field>
                <Field label="Livello">{levelLabel(matchRequest.level)}</Field>
                <Field label="Richiesta ricevuta">
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

              <div className="space-y-2">
                <Label htmlFor="match-status">Stato</Label>
                <Select
                  value={matchRequest.status}
                  onValueChange={(value) =>
                    void updateStatus(value as MatchStatus)
                  }
                  disabled={saving}
                >
                  <SelectTrigger id="match-status" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MATCH_STATUSES.map((status) => (
                      <SelectItem key={status} value={status}>
                        {MATCH_STATUS_LABELS[status]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button asChild className="w-full">
                <a href={`tel:${matchRequest.phone}`}>
                  <Phone className="size-4" />
                  Chiama {matchRequest.name}
                </a>
              </Button>
            </div>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
