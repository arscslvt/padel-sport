"use client";

import { api } from "@padel-sport/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import { ArrowRight, ChevronDown, Plus, Trash2 } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useId, useState } from "react";
import { toast } from "sonner";

import { ListGroup } from "@/app/_components/list";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import type { OpeningWindow } from "@/lib/booking";
import { cn } from "@/lib/utils";

import { ClosuresSettings } from "./closures-settings";
import { saveBookingSettings } from "./save-booking-settings";
import {
  SettingsSection,
  SettingsSkeleton,
  SettingsStack,
} from "./settings-section";

/**
 * Orari: le chiusure, la settimana tipo e quanto in anticipo si prenota.
 *
 * Le chiusure per date valgono subito (closures-settings.tsx). La settimana
 * invece si modifica e poi si salva: una settimana di fasce si sistema con
 * più ritocchi, e ognuno salvato da solo lascerebbe sito e app con orari a
 * metà. Finché non si tocca niente si vede quello che c'è sul server,
 * aggiornato dal vivo; al primo ritocco nasce una bozza, e la barra in basso
 * dice che c'è qualcosa da salvare.
 *
 * Ogni giorno della settimana ha il suo interruttore: spento, il giorno è
 * chiuso ma le sue fasce restano, e riaccendendolo tornano com'erano.
 */

const WEEKDAYS = [
  { value: 1, label: "Lunedì" },
  { value: 2, label: "Martedì" },
  { value: 3, label: "Mercoledì" },
  { value: 4, label: "Giovedì" },
  { value: 5, label: "Venerdì" },
  { value: 6, label: "Sabato" },
  { value: 0, label: "Domenica" },
];

/** Ogni mezz'ora, da 00:00 a 23:30: gli stessi scaglioni che accetta il backend. */
const TIMES = Array.from({ length: 48 }, (_, index) => {
  const hours = String(Math.floor(index / 2)).padStart(2, "0");
  return `${hours}:${index % 2 === 0 ? "00" : "30"}`;
});

interface Hours {
  windows: OpeningWindow[];
  closedWeekdays: number[];
  bookableDays: number;
}

export function HoursSettings() {
  const settings = useQuery(api.modules.settings.booking.get, {});
  const [draft, setDraft] = useState<Hours | null>(null);
  const [saving, setSaving] = useState(false);

  if (settings === undefined) {
    return (
      <SettingsStack>
        <SettingsSection title="Chiusure">
          <SettingsSkeleton rows={1} />
        </SettingsSection>
        <SettingsSection title="Giorni e orari">
          <SettingsSkeleton rows={7} />
        </SettingsSection>
        <SettingsSection title="Anticipo">
          <SettingsSkeleton rows={1} />
        </SettingsSection>
      </SettingsStack>
    );
  }

  const saved: Hours = {
    windows: settings.windows,
    closedWeekdays: settings.closedWeekdays,
    bookableDays: settings.bookableDays,
  };
  const hours = draft ?? saved;
  const dirty =
    draft !== null && JSON.stringify(draft) !== JSON.stringify(saved);

  const edit = (change: (current: Hours) => Hours) =>
    setDraft((current) => change(current ?? saved));

  const patchWindow = (index: number, patch: Partial<OpeningWindow>) =>
    edit((current) => ({
      ...current,
      windows: current.windows.map((window, position) =>
        position === index ? { ...window, ...patch } : window,
      ),
    }));

  const save = async () => {
    setSaving(true);
    const result = await saveBookingSettings(hours);
    setSaving(false);

    if (!result.ok) {
      toast.error("Impossibile salvare gli orari", {
        description: result.error,
      });
      return;
    }

    setDraft(null);
    toast.success("Orari aggiornati", {
      description: "Sito e app seguono già i nuovi orari.",
    });
  };

  return (
    <SettingsStack>
      <ClosuresSettings closures={settings.closures} />

      <SettingsSection
        title="Giorni e orari"
        description="Una partita dura un'ora e mezza e deve stare tutta nella fascia. Con chiusura alle 21:30, l'ultimo inizio è alle 20:00. Un giorno spento resta chiuso, e riaccendendolo tornano le sue fasce."
      >
        <ListGroup>
          {WEEKDAYS.map((day) => (
            <DayRow
              key={day.value}
              label={day.label}
              open={!hours.closedWeekdays.includes(day.value)}
              onOpenChange={(open) =>
                edit((current) => {
                  const closedWeekdays = open
                    ? current.closedWeekdays.filter(
                        (weekday) => weekday !== day.value,
                      )
                    : [...current.closedWeekdays, day.value].sort(
                        (a, b) => a - b,
                      );
                  // Riacceso senza fasce sarebbe aperto solo a parole: gli
                  // si dà la prima, da sistemare.
                  const empty = !current.windows.some(
                    (window) => window.weekday === day.value,
                  );
                  return {
                    ...current,
                    closedWeekdays,
                    windows:
                      open && empty
                        ? [
                            ...current.windows,
                            {
                              weekday: day.value,
                              start: "09:00",
                              end: "12:30",
                            },
                          ]
                        : current.windows,
                  };
                })
              }
              windows={hours.windows
                .map((window, index) => ({ window, index }))
                .filter((entry) => entry.window.weekday === day.value)}
              onAdd={() =>
                edit((current) => ({
                  ...current,
                  windows: [
                    ...current.windows,
                    { weekday: day.value, start: "09:00", end: "12:30" },
                  ],
                }))
              }
              onPatch={patchWindow}
              onRemove={(index) =>
                edit((current) => ({
                  ...current,
                  windows: current.windows.filter(
                    (_, position) => position !== index,
                  ),
                }))
              }
            />
          ))}
        </ListGroup>
      </SettingsSection>

      <SettingsSection
        title="Anticipo"
        description="Quanti giorni prima si può prenotare dal sito e dall'app."
      >
        <ListGroup>
          <label
            htmlFor="bookableDays"
            className="flex min-h-14 items-center gap-3 px-4 py-2.5"
          >
            <span className="flex-1 text-[15px]">Prenotabile fino a</span>
            <Input
              id="bookableDays"
              type="number"
              inputMode="numeric"
              min={1}
              max={60}
              value={hours.bookableDays}
              onChange={(event) =>
                edit((current) => ({
                  ...current,
                  bookableDays: Number(event.target.value),
                }))
              }
              className="h-9 w-16 text-right tabular-nums"
            />
            <span className="text-muted-foreground text-[15px]">
              giorni prima
            </span>
          </label>
        </ListGroup>
      </SettingsSection>

      <AnimatePresence>
        {dirty && (
          <SaveBar
            saving={saving}
            onSave={() => void save()}
            onDiscard={() => setDraft(null)}
          />
        )}
      </AnimatePresence>
    </SettingsStack>
  );
}

/**
 * Un giorno: l'interruttore con il nome, le sue fasce, il tasto per
 * aggiungerne una. Da telefono le fasce vanno sotto il nome; da sm in su
 * stanno sulla stessa riga, e i giorni si leggono come una tabella.
 *
 * Spento, il giorno si fa grigio e le fasce diventano una riga di testo:
 * sono conservate, non modificabili, e tornano riaccendendolo.
 */
function DayRow({
  label,
  open,
  onOpenChange,
  windows,
  onAdd,
  onPatch,
  onRemove,
}: {
  label: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  windows: { window: OpeningWindow; index: number }[];
  onAdd: () => void;
  onPatch: (index: number, patch: Partial<OpeningWindow>) => void;
  onRemove: (index: number) => void;
}) {
  const switchId = useId();

  return (
    <div className="grid grid-cols-[1fr_auto] items-start gap-x-3 gap-y-1 px-4 py-2.5 sm:grid-cols-[8.5rem_1fr_auto]">
      <label
        htmlFor={switchId}
        className="col-start-1 row-start-1 flex h-9 cursor-pointer items-center gap-2.5"
      >
        <Switch id={switchId} checked={open} onCheckedChange={onOpenChange} />
        <span
          className={cn(
            "text-[15px] transition-colors duration-200",
            !open && "text-muted-foreground",
          )}
        >
          {label}
        </span>
      </label>

      <div className="col-span-2 row-start-2 space-y-2 sm:col-span-1 sm:col-start-2 sm:row-start-1">
        {!open ? (
          <p className="text-muted-foreground text-[13px] leading-9 max-sm:leading-normal max-sm:pb-1">
            Chiuso
            {windows.length > 0 &&
              ` · ${windows
                .map(({ window }) => `${window.start}-${window.end}`)
                .join(", ")}`}
          </p>
        ) : windows.length === 0 ? (
          <p className="text-muted-foreground text-[13px] leading-9 max-sm:leading-normal max-sm:pb-1">
            Chiuso, nessuna fascia
          </p>
        ) : (
          windows.map(({ window, index }) => (
            <div key={index} className="settings-enter flex items-center gap-2">
              <TimeSelect
                label={`Apertura ${label}`}
                value={window.start}
                onChange={(start) => onPatch(index, { start })}
              />
              <ArrowRight
                aria-hidden
                className="text-muted-foreground size-3.5 shrink-0"
              />
              <TimeSelect
                label={`Chiusura ${label}`}
                value={window.end}
                onChange={(end) => onPatch(index, { end })}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={`Togli la fascia ${window.start}-${window.end} di ${label}`}
                onClick={() => onRemove(index)}
                className="text-muted-foreground hover:text-danger ml-auto size-9 shrink-0"
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          ))
        )}
      </div>

      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={onAdd}
        aria-label={`Aggiungi una fascia a ${label}`}
        // Spento non si aggiunge niente, ma il posto resta: la riga non salta.
        className={cn(
          "col-start-2 row-start-1 h-9 sm:col-start-3",
          !open && "invisible",
        )}
      >
        <Plus className="size-4" />
        Fascia
      </Button>
    </div>
  );
}

/**
 * Un orario a scaglioni di mezz'ora. Nativo: da telefono apre la ruota di
 * sistema. La freccia però è la nostra, la stessa della `Select` di shadcn:
 * quella del browser si attacca al bordo destro ignorando il padding, e in
 * Safari e Chrome ogni campo l'avrebbe disegnata a modo suo.
 */
function TimeSelect({
  value,
  onChange,
  label,
}: {
  value: string;
  onChange: (value: string) => void;
  label: string;
}) {
  return (
    <span className="relative inline-flex">
      <select
        aria-label={label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="border-input dark:bg-input/30 focus-visible:border-ring focus-visible:ring-ring/50 h-9 appearance-none rounded-md border bg-transparent py-0 pr-8 pl-3 text-base tabular-nums outline-none focus-visible:ring-[3px] md:text-sm"
      >
        {TIMES.map((time) => (
          <option key={time} value={time}>
            {time}
          </option>
        ))}
      </select>
      <ChevronDown
        aria-hidden
        className="pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2 opacity-50"
      />
    </span>
  );
}

/**
 * «Modifiche non salvate», in basso finché c'è una bozza. Resta in vista
 * mentre si scorre la settimana (è `sticky`), sopra la barra in basso del
 * telefono e allineata ai controlli su desktop. Entra dal basso, da dove
 * arriva il pollice, ed esce dalla stessa parte: è uno stato che compare e
 * sparisce, non un pannello che si apre.
 */
function SaveBar({
  saving,
  onSave,
  onDiscard,
}: {
  saving: boolean;
  onSave: () => void;
  onDiscard: () => void;
}) {
  const reduce = useReducedMotion();
  const hidden = reduce
    ? { opacity: 0 }
    : { opacity: 0, transform: "translateY(12px) scale(0.98)" };

  return (
    <motion.div
      initial={hidden}
      animate={
        reduce
          ? { opacity: 1 }
          : { opacity: 1, transform: "translateY(0px) scale(1)" }
      }
      exit={hidden}
      transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
      className="sticky bottom-(--dock-clearance) z-30 md:bottom-6 lg:grid lg:grid-cols-[minmax(0,15rem)_minmax(0,1fr)] lg:gap-x-12"
    >
      <div className="dashboard-material bg-background/80 supports-[backdrop-filter]:bg-background/70 flex items-center gap-1.5 rounded-full border p-1.5 pl-4 shadow-[0_8px_30px_-12px_oklch(0.2_0_0/0.3)] backdrop-blur-xl backdrop-saturate-150 lg:col-start-2 lg:max-w-xl">
        <p className="min-w-0 flex-1 truncate text-[13px] font-medium">
          Modifiche non salvate
        </p>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onDiscard}
          disabled={saving}
          className="h-9 rounded-full px-3.5"
        >
          Annulla
        </Button>
        <Button
          type="button"
          size="sm"
          onClick={onSave}
          disabled={saving}
          className="h-9 rounded-full px-4"
        >
          {saving ? "Salvo…" : "Salva"}
        </Button>
      </div>
    </motion.div>
  );
}
