"use client";

import {
  SOCIAL_POST_KINDS,
  type SocialMode,
  type SocialPostKind,
} from "@padel-sport/backend/convex/modules/social/lib";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

/**
 * Le impostazioni dei contenuti social.
 *
 * Lettura via `fetch` e non con `useQuery`, al contrario della configurazione
 * delle prenotazioni: quella è pubblica per necessità — chi prenota deve vedere
 * gli orari — questa no, e l'indirizzo del deployment Convex sta nel bundle del
 * sito.
 */

/** Cosa fa ogni trigger, detto a chi deve decidere se tenerlo acceso. */
const KIND_DESCRIPTIONS: Record<
  SocialPostKind,
  { name: string; what: string }
> = {
  tournament_result: {
    name: "Risultati di torneo",
    what: "A fine partita, per quarti, semifinali e finali. Nomina le squadre.",
  },
  courts_tomorrow: {
    name: "Campi liberi domani",
    what: "Una storia la sera, con le fasce ancora aperte per l'indomani.",
  },
  tip: {
    name: "Consigli tecnici",
    what: "L'unico contenuto che l'IA scrive da capo ogni volta. Passa sempre dalla tua approvazione.",
  },
  event_announce: {
    name: "Nuovo evento",
    what: "Quando pubblichi un evento sul sito: un post e una storia.",
  },
  event_reminder: {
    name: "Promemoria evento",
    what: "Una storia due giorni prima dell'evento.",
  },
  open_match: {
    name: "Partite che cercano giocatori",
    what: "Quando una prenotazione resta aperta. Senza nomi.",
  },
  player_request: {
    name: "Richieste dal sito",
    what: "Quando qualcuno cerca compagni dal modulo. Senza nomi né recapiti.",
  },
};

/** Cosa vuol dire ciascuna modalità, detto a chi deve sceglierla. */
const MODE_LABELS: Record<SocialMode, { name: string; what: string }> = {
  manual: {
    name: "Manuale",
    what: "Il sistema non produce niente per questa categoria: te ne occupi tu.",
  },
  review: {
    name: "Con approvazione",
    what: "Il contenuto si scrive e aspetta il tuo via libera in dashboard.",
  },
  auto: {
    name: "Autonomo",
    what: "Il contenuto si scrive ed esce da solo.",
  },
};

const MODES: SocialMode[] = ["manual", "review", "auto"];

interface Settings {
  enabled: boolean;
  modes: Record<SocialPostKind, SocialMode>;
  maxPerDay: number;
  tone: string;
  avoid: string;
  baseHashtags: string[];
}

export function SocialSettings() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/dashboard/social/settings");
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        toast.error("Impostazioni non caricate", {
          description: payload?.error ?? "Riprova fra poco.",
        });
        return;
      }

      setSettings(payload);
    } catch {
      toast.error("Impostazioni non caricate", {
        description: "Controlla la connessione e riprova.",
      });
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async () => {
    if (!settings) return;
    setSaving(true);

    try {
      const response = await fetch("/api/dashboard/social/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...settings,
          // La tabella tiene le modalità come coppie: Convex non accetta
          // chiavi letterali nei dizionari.
          modes: SOCIAL_POST_KINDS.map((kind) => ({
            kind,
            mode: settings.modes[kind],
          })),
        }),
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        toast.error("Impostazioni non salvate", {
          description: payload?.error ?? "Riprova fra poco.",
        });
        return;
      }

      toast.success("Impostazioni aggiornate");
      await load();
    } catch {
      toast.error("Impostazioni non salvate", {
        description: "Controlla la connessione e riprova.",
      });
    } finally {
      setSaving(false);
    }
  };

  if (!settings) {
    return (
      <div className="space-y-3">
        {[0, 1, 2].map((row) => (
          <Skeleton key={row} className="h-24 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  const patch = (change: Partial<Settings>) =>
    setSettings({ ...settings, ...change });

  const setMode = (kind: SocialPostKind, mode: SocialMode) =>
    patch({ modes: { ...settings.modes, [kind]: mode } });

  return (
    <div className="max-w-3xl space-y-8">
      <section className="rounded-lg border bg-white p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <Label htmlFor="enabled" className="text-base">
              Pubblicazione attiva
            </Label>
            <p className="text-sm text-muted-foreground">
              L'interruttore generale. Da spento non viene generato né
              pubblicato niente, e nessun contenuto resta in sospeso: i trigger
              non lasciano traccia. È il modo di fermare tutto senza aspettare
              un rilascio.
            </p>
          </div>
          <Switch
            id="enabled"
            checked={settings.enabled}
            onCheckedChange={(on) => patch({ enabled: on })}
          />
        </div>
      </section>

      <section className="space-y-3">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold">Cosa si pubblica</h2>
          <p className="text-sm text-muted-foreground">
            Spegnere un trigger non cancella niente di già uscito: smette solo
            di produrne di nuovi.
          </p>
        </div>

        <div className="overflow-hidden rounded-lg border">
          <ul className="divide-y bg-white">
            {SOCIAL_POST_KINDS.map((kind) => {
              const info = KIND_DESCRIPTIONS[kind];
              const mode = settings.modes[kind];

              return (
                <li
                  key={kind}
                  className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-start sm:justify-between"
                >
                  <div className="min-w-0 space-y-0.5">
                    <p className="font-medium text-sm">{info.name}</p>
                    <p className="text-xs text-muted-foreground">{info.what}</p>
                  </div>

                  <div className="shrink-0 space-y-1 sm:w-52 sm:text-right">
                    <Select
                      value={mode}
                      onValueChange={(next) =>
                        setMode(kind, next as SocialMode)
                      }
                    >
                      <SelectTrigger
                        className="w-full"
                        aria-label={`Modalità per ${info.name}`}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {MODES.map((option) => (
                          <SelectItem key={option} value={option}>
                            {MODE_LABELS[option].name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground sm:text-right">
                      {MODE_LABELS[mode].what}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      <section className="space-y-4">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold">Come suona</h2>
          <p className="text-sm text-muted-foreground">
            Queste righe finiscono nelle istruzioni al modello quando scrive gli
            template e i consigli. Cambiarle non riscrive i template già
            approvati: vale da lì in avanti.
          </p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="tone">Voce del circolo</Label>
          <Textarea
            id="tone"
            rows={3}
            value={settings.tone}
            onChange={(event) => patch({ tone: event.target.value })}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="avoid">Da evitare</Label>
          <Textarea
            id="avoid"
            rows={2}
            value={settings.avoid}
            onChange={(event) => patch({ avoid: event.target.value })}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="hashtags">Hashtag di base</Label>
          <Input
            id="hashtags"
            value={settings.baseHashtags.join(" ")}
            onChange={(event) =>
              patch({
                baseHashtags: event.target.value
                  .split(/[\s,]+/)
                  .map((tag) => tag.trim())
                  .filter(Boolean),
              })
            }
          />
          <p className="text-xs text-muted-foreground">
            Separati da spazi. Il modello parte da questi e ne aggiunge al
            massimo tre pertinenti al contenuto.
          </p>
        </div>
      </section>

      <section className="space-y-2">
        <Label htmlFor="maxPerDay">Massimo di contenuti al giorno</Label>
        <Input
          id="maxPerDay"
          type="number"
          min={1}
          max={10}
          className="w-24"
          value={settings.maxPerDay}
          onChange={(event) =>
            patch({ maxPerDay: Number(event.target.value) || 1 })
          }
        />
        <p className="max-w-xl text-xs text-muted-foreground">
          Non è il ritmo previsto: è il tetto oltre il quale qualcosa è andato
          storto. Una giornata di torneo, senza, riempirebbe il profilo. Quello
          che sfora resta registrato come saltato, con il motivo.
        </p>
      </section>

      <Button onClick={() => void save()} disabled={saving}>
        {saving ? "Salvataggio…" : "Salva"}
      </Button>
    </div>
  );
}
