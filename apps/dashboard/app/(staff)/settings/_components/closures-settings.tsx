"use client";

import {
  type Closure,
  closureHoursLabel,
  closureLength,
  localDayKey,
} from "@padel-sport/backend/convex/modules/settings/schedule";
import { CalendarOff, Loader2, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { toast } from "sonner";

import { ListGroup, ListRow } from "@/app/_components/list";
import { SheetHeader } from "@/app/_components/sheet-header";
import { StatusBadge } from "@/app/_components/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ResponsiveDrawer,
  ResponsiveDrawerContent,
  ResponsiveDrawerFooter,
} from "@/components/ui/responsive-drawer";
import { cn } from "@/lib/utils";

import { SettingsSection } from "./settings-section";

/**
 * Le chiusure del club per date: Natale, Ferragosto, una manutenzione, una
 * giornata di pioggia. Quelle di poche ore, proposte dal meteo in agenda,
 * stanno qui con le altre e si riaprono allo stesso modo. È la cosa che in Orari si tocca più spesso e con più
 * fretta, per questo sta in cima.
 *
 * Valgono subito, come i campi: non passano dalla barra «Modifiche non
 * salvate», che riguarda la settimana tipo. Le passate spariscono da sole;
 * quella in corso lo dice. Aggiungerne una non tocca le prenotazioni già
 * prese in quei giorni: lo staff le trova in agenda e decide lui, avvisando
 * i clienti.
 */

async function request(method: "POST" | "DELETE", body: object) {
  const response = await fetch("/api/dashboard/closures", {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(payload?.error ?? "Riprova fra poco.");
  return payload;
}

/** "AAAA-MM-GG" a mezzogiorno locale: lontano da ogni cambio d'ora. */
function noon(day: string): Date {
  return new Date(`${day}T12:00:00`);
}

function formatDay(day: string, options: Intl.DateTimeFormatOptions): string {
  const date = noon(day);
  const withYear =
    date.getFullYear() !== new Date().getFullYear()
      ? { year: "numeric" as const }
      : {};
  return date.toLocaleDateString("it-IT", { ...options, ...withYear });
}

/** «Giovedì 25 dicembre», o «Dal 14 al 16 agosto», o «Dal 30 dicembre al 2 gennaio». */
export function closureTitle(closure: Closure): string {
  if (closure.from === closure.to) {
    const label = formatDay(closure.from, {
      weekday: "long",
      day: "numeric",
      month: "long",
    });
    return label.charAt(0).toUpperCase() + label.slice(1);
  }

  const from = noon(closure.from);
  const to = noon(closure.to);
  const sameMonth =
    from.getMonth() === to.getMonth() &&
    from.getFullYear() === to.getFullYear();

  return sameMonth
    ? `Dal ${from.getDate()} al ${formatDay(closure.to, { day: "numeric", month: "long" })}`
    : `Dal ${formatDay(closure.from, { day: "numeric", month: "long" })} al ${formatDay(closure.to, { day: "numeric", month: "long" })}`;
}

/** Una chiusura si riconosce da date e ore: lo stesso giorno può averne più d'una. */
function closureKey(closure: Closure): string {
  return `${closure.from}_${closure.to}_${closure.start ?? ""}_${closure.end ?? ""}`;
}

export function ClosuresSettings({
  closures,
}: {
  closures: readonly Closure[];
}) {
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);

  const today = localDayKey(new Date());
  const upcoming = closures.filter((closure) => closure.to >= today);

  const remove = async (closure: Closure) => {
    const key = closureKey(closure);
    setRemoving(key);
    try {
      await request("DELETE", {
        from: closure.from,
        to: closure.to,
        start: closure.start,
        end: closure.end,
      });
      toast.success("Chiusura tolta", {
        description:
          "Sito e app accettano di nuovo prenotazioni in quei giorni.",
      });
    } catch (error) {
      toast.error("Impossibile togliere la chiusura", {
        description:
          error instanceof Error ? error.message : "Riprova fra poco.",
      });
    } finally {
      setRemoving(null);
    }
  };

  return (
    <SettingsSection
      title="Chiusure"
      description="Valgono subito. In quei giorni sito e app non accettano prenotazioni, e passata l'ultima data il club riapre da solo."
    >
      <ListGroup>
        {upcoming.map((closure) => {
          const key = closureKey(closure);
          const days = closureLength(closure);
          const ongoing = closure.from <= today;
          const hours = closureHoursLabel(closure);

          return (
            <ListRow
              key={key}
              leading={<CalendarOff className="size-5" />}
              title={closureTitle(closure)}
              subtitle={
                hours
                  ? `${hours.charAt(0).toUpperCase()}${hours.slice(1)}${closure.reason ? `, ${closure.reason.toLowerCase()}` : ""}`
                  : (closure.reason ??
                    (days === 1 ? "Tutto il giorno" : `${days} giorni`))
              }
              trailing={
                <span className="flex items-center gap-1">
                  {ongoing && (
                    <StatusBadge tone="warning">In corso</StatusBadge>
                  )}
                  <button
                    type="button"
                    aria-label={`Riapri: ${closureTitle(closure)}`}
                    disabled={removing !== null}
                    onClick={() => void remove(closure)}
                    className="text-muted-foreground hover:bg-danger-subtle hover:text-danger flex size-10 items-center justify-center rounded-full transition-colors disabled:opacity-50"
                  >
                    {removing === key ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Trash2 className="size-4" />
                    )}
                  </button>
                </span>
              }
            />
          );
        })}
        <ListRow
          leading={<Plus className="size-5" />}
          title="Aggiungi chiusura"
          onClick={() => setAdding(true)}
          aria-haspopup="dialog"
          aria-expanded={adding}
        />
      </ListGroup>

      <NewClosure open={adding} onOpenChange={setAdding} today={today} />
    </SettingsSection>
  );
}

/**
 * Il modulo di una chiusura: le date, con «Oggi» e «Domani» a un tocco per
 * le chiusure improvvise, e un motivo facoltativo che leggono staff e
 * clienti. Il secondo giorno segue il primo finché non lo si sposta.
 */
function NewClosure({
  open,
  onOpenChange,
  today,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  today: string;
}) {
  const router = useRouter();
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  const tomorrow = localDayKey(new Date(noon(today).getTime() + 86_400_000));
  const valid = Boolean(from && to) && from >= today && to >= from;

  const reset = () => {
    setFrom(today);
    setTo(today);
    setReason("");
  };

  const pick = (day: string) => {
    setFrom(day);
    setTo(day);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!valid || saving) return;

    setSaving(true);
    try {
      const { affected } = (await request("POST", {
        from,
        to,
        reason: reason.trim() || undefined,
      })) as { affected: number };

      onOpenChange(false);
      reset();

      if (affected > 0) {
        toast.warning("Chiusura aggiunta", {
          description: `${affected} ${affected === 1 ? "prenotazione resta" : "prenotazioni restano"} in agenda in quei giorni. Annullale tu, avvisando i clienti.`,
          duration: 10_000,
          action: { label: "Agenda", onClick: () => router.push("/") },
        });
      } else {
        toast.success("Chiusura aggiunta", {
          description: "Sito e app non accettano prenotazioni in quei giorni.",
        });
      }
    } catch (error) {
      toast.error("Impossibile aggiungere la chiusura", {
        description:
          error instanceof Error ? error.message : "Riprova fra poco.",
      });
    } finally {
      setSaving(false);
    }
  };

  const shortcut = (day: string, label: string) => (
    <button
      type="button"
      aria-pressed={from === day && to === day}
      onClick={() => pick(day)}
      className={cn(
        "h-9 rounded-full border px-4 text-sm transition-[background-color,color,transform] duration-150 active:scale-95",
        from === day && to === day
          ? "bg-primary text-primary-foreground border-primary"
          : "bg-card",
      )}
    >
      {label}
    </button>
  );

  return (
    <ResponsiveDrawer open={open} setOpen={onOpenChange}>
      <ResponsiveDrawerContent className="sm:max-w-md">
        <SheetHeader
          title="Nuova chiusura"
          description="In questi giorni sito e app non accettano prenotazioni."
        />
        <form
          id="new-closure"
          onSubmit={(event) => void submit(event)}
          className="space-y-5 px-4 md:px-0"
        >
          <div className="flex gap-2">
            {shortcut(today, "Oggi")}
            {shortcut(tomorrow, "Domani")}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="closure-from" className="text-sm font-medium">
                Dal
              </Label>
              <Input
                id="closure-from"
                type="date"
                min={today}
                value={from}
                onChange={(event) => {
                  const next = event.target.value;
                  setFrom(next);
                  if (to < next) setTo(next);
                }}
                className="bg-card h-11 rounded-xl text-base md:h-10 md:text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="closure-to" className="text-sm font-medium">
                Al
              </Label>
              <Input
                id="closure-to"
                type="date"
                min={from || today}
                value={to}
                onChange={(event) => setTo(event.target.value)}
                className="bg-card h-11 rounded-xl text-base md:h-10 md:text-sm"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="closure-reason" className="text-sm font-medium">
              Motivo
            </Label>
            <Input
              id="closure-reason"
              value={reason}
              maxLength={60}
              placeholder="Facoltativo, es. Natale"
              onChange={(event) => setReason(event.target.value)}
              className="bg-card h-11 rounded-xl text-base md:h-10 md:text-sm"
            />
            <p className="text-muted-foreground px-1 text-xs">
              Lo leggono lo staff e chi prova a prenotare.
            </p>
          </div>
        </form>
        <ResponsiveDrawerFooter className="flex flex-col-reverse gap-2 pb-[calc(1rem+env(safe-area-inset-bottom))] md:flex-row md:justify-end md:pb-0">
          <Button
            type="button"
            variant="ghost"
            className="h-11 md:h-9"
            onClick={() => onOpenChange(false)}
          >
            Annulla
          </Button>
          <Button
            type="submit"
            form="new-closure"
            className="h-11 md:h-9"
            disabled={!valid || saving}
          >
            {saving && <Loader2 className="size-4 animate-spin" />}
            Aggiungi chiusura
          </Button>
        </ResponsiveDrawerFooter>
      </ResponsiveDrawerContent>
    </ResponsiveDrawer>
  );
}
