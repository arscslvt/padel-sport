"use client";

import { format } from "date-fns";
import { it } from "date-fns/locale";
import { Gift, Loader2, Minus, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { POINTS_TERMS_LINK } from "@/lib/links";
import { pointsLabel, signedPoints } from "@/lib/points";
import { cn } from "@/lib/utils";

/**
 * Il conto punti nella scheda del cliente.
 *
 * In cima i preset, perché è il gesto di tutti i giorni: «ha vinto, +3» deve
 * essere un tocco solo. Sotto il movimento a mano, per quello che un preset
 * non prevede, e lo storico per rispondere a «da dove vengono questi punti?».
 */

interface Preset {
  id: string;
  label: string;
  points: number;
}

interface PointsDetail {
  /** Punti caricati che aspettano l'adesione del cliente. */
  pendingPoints: number;
  program: {
    state: "none" | "outdated" | "joined";
    acceptedAt?: number;
    via?: "online" | "desk";
  };
  balance: number;
  transactions: {
    id: string;
    delta: number;
    label: string;
    note?: string;
    balanceAfter: number;
    /** Caricato prima dell'adesione: non è ancora nel saldo. */
    pending: boolean;
    isRedemption: boolean;
    createdAt: number;
  }[];
  redemptions: {
    id: string;
    title: string;
    cost: number;
    code: string;
    state: "active" | "used" | "cancelled" | "expired";
    expiresAt?: number;
    createdAt: number;
  }[];
}

const REDEMPTION_LABELS = {
  active: "Da consegnare",
  used: "Consegnato",
  cancelled: "Annullato",
  expired: "Scaduto",
} as const;

export function PointsTab({
  playerId,
  hasEmail,
  onChanged,
}: {
  playerId: string;
  /** Senza indirizzo il cliente non riceve la mail: lo staff deve saperlo. */
  hasEmail: boolean;
  onChanged: () => void;
}) {
  const [detail, setDetail] = useState<PointsDetail | null>(null);
  const [presets, setPresets] = useState<Preset[] | null>(null);
  const [pending, setPending] = useState<string | null>(null);

  const [sign, setSign] = useState<1 | -1>(1);
  const [amount, setAmount] = useState("");
  const [label, setLabel] = useState("");

  const load = useCallback(async () => {
    const [points, presetList] = await Promise.all([
      fetch(`/api/dashboard/clients/${playerId}/points`)
        .then((response) => response.json())
        .catch(() => null),
      fetch("/api/dashboard/points/presets")
        .then((response) => response.json())
        .catch(() => null),
    ]);

    if (points?.points) setDetail(points.points);
    else toast.error(points?.error ?? "Punti non disponibili.");

    setPresets(presetList?.presets ?? []);
  }, [playerId]);

  useEffect(() => {
    void load();
  }, [load]);

  const submit = async (key: string, body: Record<string, unknown>) => {
    setPending(key);

    try {
      const response = await fetch(
        `/api/dashboard/clients/${playerId}/points`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
      );
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        toast.error("Punti non registrati", {
          description: payload?.error ?? "Riprova fra poco.",
        });
        return false;
      }

      if (payload.pending) {
        // Lo staff deve sapere che il cliente non li vede ancora: altrimenti
        // gli direbbe a voce «ti ho caricato i punti» e lui non li troverebbe.
        toast.warning("Punti in attesa", {
          description:
            "Il cliente non ha ancora aderito al programma: li riceverà quando accetta il regolamento. Fino ad allora nessuna mail.",
          duration: 8000,
        });
      } else {
        toast.success(`Saldo aggiornato: ${pointsLabel(payload.balance)}`, {
          description: hasEmail
            ? "Il cliente riceverà una mail con il movimento."
            : "Nessuna mail: la scheda non ha un indirizzo.",
        });
      }

      onChanged();
      await load();
      return true;
    } catch {
      toast.error("Punti non registrati", {
        description: "Controlla la connessione e riprova.",
      });
      return false;
    } finally {
      setPending(null);
    }
  };

  const submitManual = async () => {
    const points = Number(amount);

    if (!Number.isInteger(points) || points <= 0) {
      toast.error("Indica un numero intero di punti.");
      return;
    }
    if (label.trim().length < 2) {
      toast.error("Scrivi il motivo del movimento.");
      return;
    }

    const saved = await submit("manual", {
      delta: sign * points,
      label: label.trim(),
    });

    if (saved) {
      setAmount("");
      setLabel("");
    }
  };

  const closeRedemption = async (
    redemptionId: string,
    action: "used" | "cancel",
  ) => {
    setPending(redemptionId);

    try {
      const response = await fetch(
        `/api/dashboard/points/redemptions/${redemptionId}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action }),
        },
      );
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        toast.error("Riscatto non aggiornato", {
          description: payload?.error ?? "Riprova fra poco.",
        });
        return;
      }

      toast.success(
        action === "used" ? "Premio consegnato" : "Riscatto annullato",
        action === "cancel"
          ? { description: "I punti sono tornati sul saldo del cliente." }
          : undefined,
      );

      onChanged();
      await load();
    } catch {
      toast.error("Riscatto non aggiornato", {
        description: "Controlla la connessione e riprova.",
      });
    } finally {
      setPending(null);
    }
  };

  const recordDeskAdhesion = async () => {
    setPending("program");

    try {
      const response = await fetch(
        `/api/dashboard/clients/${playerId}/points/program`,
        { method: "POST" },
      );
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        toast.error("Adesione non registrata", {
          description: payload?.error ?? "Riprova fra poco.",
        });
        return;
      }

      toast.success("Adesione registrata", {
        description:
          payload?.points > 0
            ? `Accreditati ${pointsLabel(payload.points)} in attesa. Conserva il modulo firmato: è la prova dell'adesione.`
            : "Conserva il modulo firmato: è la prova dell'adesione.",
      });
      onChanged();
      await load();
    } catch {
      toast.error("Adesione non registrata", {
        description: "Controlla la connessione e riprova.",
      });
    } finally {
      setPending(null);
    }
  };

  /** Toglie un movimento in attesa caricato per sbaglio. */
  const removePending = async (transactionId: string) => {
    setPending(transactionId);

    try {
      const response = await fetch(
        `/api/dashboard/clients/${playerId}/points/${transactionId}`,
        { method: "DELETE" },
      );
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        toast.error("Movimento non annullato", {
          description: payload?.error ?? "Riprova fra poco.",
        });
        return;
      }

      toast.success("Movimento in attesa annullato");
      onChanged();
      await load();
    } catch {
      toast.error("Movimento non annullato", {
        description: "Controlla la connessione e riprova.",
      });
    } finally {
      setPending(null);
    }
  };

  /** Registrare un'adesione per conto di qualcuno richiede la sua firma: lo ricordiamo prima. */
  const confirmDeskAdhesion = () => {
    toast("Il cliente ha firmato il modulo di adesione?", {
      description: (
        <>
          Registra l'adesione solo se la persona ha letto e firmato il
          regolamento del programma punti. Il modulo cartaceo va conservato.
          <div className="mt-3 flex gap-2">
            <Button
              variant="outline"
              className="flex-1 bg-transparent"
              onClick={() => toast.dismiss()}
            >
              Annulla
            </Button>
            <Button
              className="flex-1"
              onClick={() => {
                toast.dismiss();
                void recordDeskAdhesion();
              }}
            >
              Sì, registra
            </Button>
          </div>
        </>
      ),
      duration: Number.POSITIVE_INFINITY,
    });
  };

  if (!detail || !presets) {
    return (
      <div className="space-y-3 pt-4">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-5 pt-4">
      <div className="flex items-end justify-between rounded-lg border bg-muted/20 p-3">
        <div>
          <p className="text-muted-foreground text-xs">Saldo</p>
          <p className="text-3xl font-semibold tabular-nums">
            {detail.balance}
            <span className="text-muted-foreground ml-1 text-sm font-normal">
              punti
            </span>
          </p>
          {detail.pendingPoints > 0 && (
            <p className="text-xs font-medium text-amber-700 tabular-nums">
              +{detail.pendingPoints} in attesa di adesione
            </p>
          )}
        </div>
        {!hasEmail && (
          <p className="text-muted-foreground max-w-[22ch] text-right text-xs">
            Senza email il cliente non riceve avvisi.
          </p>
        )}
      </div>

      {detail.program.state !== "joined" && (
        <ProgramNotice
          state={detail.program.state}
          busy={pending === "program"}
          disabled={pending !== null}
          onRecord={confirmDeskAdhesion}
        />
      )}

      <section className="space-y-2">
        <h3 className="text-sm font-semibold">Preset</h3>
        {presets.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            Nessun preset: li crei da Punti e premi.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {presets.map((preset) => (
              <Button
                key={preset.id}
                variant="outline"
                size="sm"
                disabled={pending !== null}
                onClick={() =>
                  void submit(`preset-${preset.id}`, {
                    presetId: preset.id,
                  })
                }
              >
                {pending === `preset-${preset.id}` ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : null}
                {preset.label}
                <span
                  className={cn(
                    "font-mono tabular-nums",
                    preset.points > 0 ? "text-emerald-600" : "text-destructive",
                  )}
                >
                  {signedPoints(preset.points)}
                </span>
              </Button>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3 rounded-lg border p-3">
        <h3 className="text-sm font-semibold">Movimento a mano</h3>

        <div className="grid grid-cols-[auto_1fr] gap-2">
          <div className="flex rounded-md border p-0.5">
            <Button
              type="button"
              size="icon"
              variant={sign === 1 ? "default" : "ghost"}
              className="size-8"
              aria-label="Aggiungi punti"
              aria-pressed={sign === 1}
              onClick={() => setSign(1)}
            >
              <Plus className="size-4" />
            </Button>
            <Button
              type="button"
              size="icon"
              variant={sign === -1 ? "default" : "ghost"}
              className="size-8"
              aria-label="Togli punti"
              aria-pressed={sign === -1}
              // A un conto non attivo non si tolgono punti: si annulla il
              // movimento in attesa sbagliato.
              disabled={detail.program.state !== "joined"}
              onClick={() => setSign(-1)}
            >
              <Minus className="size-4" />
            </Button>
          </div>
          <Input
            aria-label="Punti"
            type="number"
            inputMode="numeric"
            min={1}
            step={1}
            placeholder="Punti"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="points-label">Motivo</Label>
          <Input
            id="points-label"
            placeholder="Es. torneo sociale, correzione"
            value={label}
            onChange={(event) => setLabel(event.target.value)}
          />
        </div>

        <Button
          className="w-full"
          disabled={pending !== null}
          onClick={() => void submitManual()}
        >
          {pending === "manual" && <Loader2 className="size-4 animate-spin" />}
          {sign === 1 ? "Aggiungi punti" : "Togli punti"}
        </Button>
      </section>

      {detail.program.state === "joined" && detail.program.acceptedAt && (
        <p className="text-muted-foreground text-xs">
          Ha aderito al programma il{" "}
          {format(detail.program.acceptedAt, "d MMMM yyyy", { locale: it })}
          {detail.program.via === "desk"
            ? ", con modulo firmato allo sportello."
            : ", dalla sua area personale."}
        </p>
      )}

      {detail.redemptions.length > 0 && (
        <section className="space-y-2">
          <h3 className="text-sm font-semibold">Premi riscattati</h3>
          <ul className="space-y-2">
            {detail.redemptions.map((redemption) => (
              <li key={redemption.id} className="rounded-lg border p-3 text-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="flex items-center gap-1.5 font-medium">
                      <Gift className="size-4 shrink-0" />
                      <span className="truncate">{redemption.title}</span>
                    </p>
                    <p className="text-muted-foreground mt-0.5 text-xs">
                      Codice{" "}
                      <span className="font-mono text-foreground">
                        {redemption.code}
                      </span>{" "}
                      ·{" "}
                      {format(redemption.createdAt, "d MMM yyyy", {
                        locale: it,
                      })}
                      {redemption.expiresAt
                        ? ` · scade il ${format(redemption.expiresAt, "d MMM yyyy", { locale: it })}`
                        : ""}
                    </p>
                  </div>
                  <Badge variant="outline" className="shrink-0">
                    {REDEMPTION_LABELS[redemption.state]}
                  </Badge>
                </div>

                {(redemption.state === "active" ||
                  redemption.state === "expired") && (
                  <div className="mt-2 flex gap-2">
                    {redemption.state === "active" && (
                      <Button
                        size="sm"
                        disabled={pending !== null}
                        onClick={() =>
                          void closeRedemption(redemption.id, "used")
                        }
                      >
                        {pending === redemption.id && (
                          <Loader2 className="size-4 animate-spin" />
                        )}
                        Segna consegnato
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={pending !== null}
                      onClick={() =>
                        void closeRedemption(redemption.id, "cancel")
                      }
                    >
                      Annulla e restituisci
                    </Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="space-y-2">
        <h3 className="text-sm font-semibold">Movimenti</h3>
        {detail.transactions.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            Ancora nessun movimento: il saldo parte da zero.
          </p>
        ) : (
          <ul className="divide-y rounded-lg border text-sm">
            {detail.transactions.map((transaction) => (
              <li
                key={transaction.id}
                className="flex items-center justify-between gap-3 px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate">{transaction.label}</p>
                  <p className="text-muted-foreground text-xs">
                    {format(transaction.createdAt, "d MMM yyyy, HH:mm", {
                      locale: it,
                    })}
                    {transaction.note ? ` · ${transaction.note}` : ""}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p
                    className={cn(
                      "font-mono font-medium tabular-nums",
                      transaction.delta > 0
                        ? "text-emerald-600"
                        : "text-destructive",
                    )}
                  >
                    {signedPoints(transaction.delta)}
                  </p>
                  {transaction.pending ? (
                    <div className="flex items-center justify-end gap-1">
                      <span className="text-xs text-amber-700">in attesa</span>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="text-muted-foreground hover:text-destructive size-6"
                        aria-label={`Annulla ${transaction.label}`}
                        disabled={pending !== null}
                        onClick={() => void removePending(transaction.id)}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-xs tabular-nums">
                      saldo {transaction.balanceAfter}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

/**
 * L'avviso per chi non ha aderito. Lo staff può caricare lo stesso, ma deve
 * saperlo: quei punti restano in attesa finché il cliente non accetta il
 * regolamento. Chi ha un account aderisce dalla sua area personale; per gli
 * altri c'è il modulo firmato allo sportello.
 */
function ProgramNotice({
  state,
  busy,
  disabled,
  onRecord,
}: {
  state: "none" | "outdated";
  busy: boolean;
  disabled: boolean;
  onRecord: () => void;
}) {
  return (
    <section className="space-y-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
      <p className="font-medium">
        {state === "none"
          ? "Non ha ancora aderito al programma punti"
          : "Deve accettare il nuovo regolamento"}
      </p>
      <p className="text-xs leading-relaxed">
        {state === "none"
          ? "Puoi caricargli punti lo stesso: restano in attesa, senza mail, e li riceve tutti appena accetta il regolamento dalla sua area personale o firmando il modulo allo sportello."
          : "Il regolamento è cambiato dopo la sua adesione. I punti che ha restano suoi; quelli nuovi restano in attesa finché non accetta la nuova versione."}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" disabled={disabled} onClick={onRecord}>
          {busy && <Loader2 className="size-4 animate-spin" />}
          Registra adesione firmata
        </Button>
        <Button asChild size="sm" variant="ghost">
          <Link href={POINTS_TERMS_LINK} target="_blank">
            Leggi il regolamento
          </Link>
        </Button>
      </div>
    </section>
  );
}
