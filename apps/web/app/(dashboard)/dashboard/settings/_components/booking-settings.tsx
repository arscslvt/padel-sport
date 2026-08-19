"use client";

import { api } from "@padel-sport/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import { Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { MAX_PLAYERS, type OpeningWindow } from "@/lib/booking";

/**
 * Configurazione della prenotazione online.
 *
 * Due cose che fino a ieri stavano una nel codice e una solo nel dashboard di
 * Convex: i campi disponibili e le fasce in cui si può prenotare. Sono la
 * stessa impostazione vista da due lati — senza campi attivi non si prenota
 * niente, per quante ore si tengano aperte.
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
    <select
      aria-label={label}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="h-9 rounded-md border border-input bg-background px-2 text-sm"
    >
      {TIMES.map((time) => (
        <option key={time} value={time}>
          {time}
        </option>
      ))}
    </select>
  );
}

export function BookingSettings() {
  const settings = useQuery(api.modules.settings.booking.get, {});
  const courts = useQuery(api.modules.settings.booking.courts, {});

  const [windows, setWindows] = useState<OpeningWindow[]>([]);
  const [bookableDays, setBookableDays] = useState(7);
  const [membershipRequired, setMembershipRequired] = useState(false);
  const [fullSquadRequired, setFullSquadRequired] = useState(false);
  const [saving, setSaving] = useState(false);

  // La configurazione arriva dopo il primo render: la copiamo in locale una
  // volta sola, altrimenti ogni salvataggio riscriverebbe le modifiche aperte.
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    if (loaded || !settings) return;
    setWindows(settings.windows);
    setBookableDays(settings.bookableDays);
    setMembershipRequired(settings.membershipRequired);
    setFullSquadRequired(settings.fullSquadRequired);
    setLoaded(true);
  }, [settings, loaded]);

  const addWindow = (weekday: number) =>
    setWindows((current) => [
      ...current,
      { weekday, start: "09:00", end: "12:30" },
    ]);

  const removeWindow = (index: number) =>
    setWindows((current) =>
      current.filter((_, position) => position !== index),
    );

  const patchWindow = (index: number, patch: Partial<OpeningWindow>) =>
    setWindows((current) =>
      current.map((window, position) =>
        position === index ? { ...window, ...patch } : window,
      ),
    );

  const save = async () => {
    setSaving(true);
    try {
      const response = await fetch("/api/dashboard/booking-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          windows,
          bookableDays,
          membershipRequired,
          fullSquadRequired,
        }),
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        toast.error("Impostazioni non salvate", {
          description: payload?.error ?? "Riprova fra poco.",
        });
        return;
      }

      toast.success("Impostazioni aggiornate", {
        description: "Sito e app seguono già le nuove regole.",
      });
    } catch {
      toast.error("Impostazioni non salvate", {
        description: "Controlla la connessione e riprova.",
      });
    } finally {
      setSaving(false);
    }
  };

  const saveCourt = async (court: {
    courtId?: string;
    name: string;
    active: boolean;
  }) => {
    const response = await fetch("/api/dashboard/courts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(court),
    });
    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      toast.error("Campo non salvato", {
        description: payload?.error ?? "Riprova fra poco.",
      });
      return false;
    }

    toast.success("Campo aggiornato");
    return true;
  };

  const activeCourts = courts?.filter((court) => court.active).length ?? 0;

  return (
    <div className="space-y-10">
      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Campi</h2>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Quanti campi si possono prenotare in contemporanea. Un campo spento
            resta nello storico ma non viene più assegnato.
          </p>
        </div>

        {courts === undefined ? (
          <p className="text-sm text-muted-foreground">Carico i campi…</p>
        ) : (
          <div className="space-y-2">
            {courts.length === 0 && (
              <p className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
                Nessun campo configurato: online non risulta prenotabile nessuna
                fascia oraria. Aggiungine almeno uno.
              </p>
            )}

            {courts.map((court) => (
              <div
                key={court.id}
                className="flex items-center justify-between gap-4 rounded-md border p-3"
              >
                <div>
                  <p className="text-sm font-medium">{court.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {court.active ? "Prenotabile" : "Non prenotabile"}
                  </p>
                </div>
                <Switch
                  checked={court.active}
                  onCheckedChange={(active) =>
                    void saveCourt({
                      courtId: court.id,
                      name: court.name,
                      active,
                    })
                  }
                />
              </div>
            ))}

            <NewCourt onSave={saveCourt} count={courts.length} />

            <p className="text-xs text-muted-foreground">
              {activeCourts === 0
                ? "Nessun campo attivo."
                : `${activeCourts} ${activeCourts === 1 ? "campo prenotabile" : "campi prenotabili"} in contemporanea.`}
            </p>
          </div>
        )}
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Iscrizione al club</h2>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Chi può prenotare online.
          </p>
        </div>

        <label
          htmlFor="membershipRequired"
          className="flex max-w-2xl cursor-pointer items-start gap-3 rounded-lg border p-3.5"
        >
          <Checkbox
            id="membershipRequired"
            checked={membershipRequired}
            onCheckedChange={(checked) =>
              setMembershipRequired(Boolean(checked))
            }
            className="mt-0.5"
          />
          <span>
            <span className="block text-sm font-medium">
              Serve la tessera in corso per prenotare
            </span>
            <span className="block text-sm text-muted-foreground">
              Sito e app rifiutano la prenotazione a chi non ha l'iscrizione
              valida e pagata. Accendilo solo quando l'anagrafica è pronta: con
              i clienti ancora da inserire, si troverebbero tutti bloccati.
            </span>
          </span>
        </label>

        {membershipRequired && (
          <p className="max-w-2xl rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            Controlla in <strong>Clienti</strong> quante tessere risultano da
            pagare o scadute: quelle persone non riusciranno più a prenotare
            online finché non le rinnovi.
          </p>
        )}
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Composizione della squadra</h2>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Con quanti giocatori si può tenere un campo.
          </p>
        </div>

        <label
          htmlFor="fullSquadRequired"
          className="flex max-w-2xl cursor-pointer items-start gap-3 rounded-lg border p-3.5"
        >
          <Checkbox
            id="fullSquadRequired"
            checked={fullSquadRequired}
            onCheckedChange={(checked) =>
              setFullSquadRequired(Boolean(checked))
            }
            className="mt-0.5"
          />
          <span>
            <span className="block text-sm font-medium">
              Servono tutti e {MAX_PLAYERS} i giocatori per prenotare
            </span>
            <span className="block text-sm text-muted-foreground">
              Chi prenota dal sito deve indicare gli altri {MAX_PLAYERS - 1}{" "}
              giocatori: niente più campi tenuti da una persona sola, in attesa
              che li completiate voi. Vale anche per le partite private create
              dall'app; quelle aperte e di cerchia nascono apposta con i posti
              liberi e restano come sono.
            </span>
          </span>
        </label>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Giorni e orari</h2>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Le fasce in cui si accettano prenotazioni. Una partita dura un'ora e
            mezza e deve starci dentro per intero: con chiusura alle 21:30
            l'ultimo inizio è alle 20:00. Un giorno senza fasce è chiuso.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <label htmlFor="bookableDays" className="text-sm">
            Prenotabile fino a
          </label>
          <Input
            id="bookableDays"
            type="number"
            min={1}
            max={60}
            value={bookableDays}
            onChange={(event) => setBookableDays(Number(event.target.value))}
            className="h-9 w-20"
          />
          <span className="text-sm text-muted-foreground">
            giorni in anticipo
          </span>
        </div>

        <div className="space-y-3">
          {WEEKDAYS.map((day) => {
            const dayWindows = windows
              .map((window, index) => ({ window, index }))
              .filter((entry) => entry.window.weekday === day.value);

            return (
              <div key={day.value} className="rounded-md border p-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">{day.label}</p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => addWindow(day.value)}
                  >
                    <Plus className="size-4" />
                    Fascia
                  </Button>
                </div>

                {dayWindows.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Chiuso</p>
                ) : (
                  <div className="mt-2 space-y-2">
                    {dayWindows.map(({ window, index }) => (
                      <div key={index} className="flex items-center gap-2">
                        <TimeSelect
                          label={`Apertura ${day.label}`}
                          value={window.start}
                          onChange={(start) => patchWindow(index, { start })}
                        />
                        <span className="text-sm text-muted-foreground">–</span>
                        <TimeSelect
                          label={`Chiusura ${day.label}`}
                          value={window.end}
                          onChange={(end) => patchWindow(index, { end })}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label="Togli la fascia"
                          onClick={() => removeWindow(index)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <div className="flex items-center gap-3 border-t pt-6">
        <Button type="button" onClick={() => void save()} disabled={saving}>
          {saving ? "Salvataggio…" : "Salva impostazioni"}
        </Button>
        <p className="text-xs text-muted-foreground">
          Le spunte e le fasce si salvano insieme. I campi, invece, valgono
          subito.
        </p>
      </div>
    </div>
  );
}

function NewCourt({
  onSave,
  count,
}: {
  onSave: (court: { name: string; active: boolean }) => Promise<boolean>;
  count: number;
}) {
  const [name, setName] = useState("");

  return (
    <div className="flex items-center gap-2">
      <Input
        value={name}
        onChange={(event) => setName(event.target.value)}
        placeholder={`Es. Campo ${count + 1}`}
        className="h-9"
      />
      <Button
        type="button"
        variant="outline"
        disabled={name.trim().length < 2}
        onClick={async () => {
          if (await onSave({ name: name.trim(), active: true })) setName("");
        }}
      >
        <Plus className="size-4" />
        Aggiungi
      </Button>
    </div>
  );
}
