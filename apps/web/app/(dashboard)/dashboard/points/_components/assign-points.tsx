"use client";

import {
  ChevronRight,
  Coins,
  Loader2,
  Minus,
  Plus,
  Search,
  Snowflake,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { SheetHeader } from "@/app/(dashboard)/_components/sheet-header";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ResponsiveDrawer,
  ResponsiveDrawerContent,
} from "@/components/ui/responsive-drawer";
import { cn } from "@/lib/utils";

import { PointsBadge } from "../../clients/_components/points-badge";
import type { Client } from "../../clients/_components/types";

/**
 * «Assegna punti»: il gesto più frequente della pagina, a un tocco da
 * qualunque punto.
 *
 * Da telefono è un pulsante fluttuante sopra la barra in basso, dove arriva
 * il pollice; da desktop un pulsante nell'intestazione. Apre un pannello che
 * segue il gesto allo sportello: si cerca la persona, se ne vede il saldo, si
 * tocca il preset («Partita vinta +3») e i punti sono caricati. L'importo a
 * mano c'è, ma sta sotto e chiede il motivo: è l'eccezione, e il cliente lo
 * leggerà nella mail. Per tutto il resto — storico, premi, adesione — c'è la
 * scheda punti completa del cliente.
 */

interface Preset {
  id: string;
  label: string;
  points: number;
}

interface Wallet {
  balance: number;
  pendingPoints: number;
  program: { state: "none" | "outdated" | "joined" };
  frozen: boolean;
}

/** Quanti clienti mostrare prima di aver scritto qualcosa. */
const LIST_LIMIT = 40;

function signed(points: number) {
  return points > 0 ? `+${points}` : String(points);
}

export function AssignPoints() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button className="hidden md:inline-flex" onClick={() => setOpen(true)}>
        <Coins className="size-4" />
        Assegna punti
      </Button>

      {/* Sopra la barra in basso: la sua altezza più il suo margine, più aria. */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="bg-foreground text-background fixed right-4 bottom-[calc(max(0.5rem,env(safe-area-inset-bottom))+4.75rem)] z-30 flex h-12 items-center gap-2 rounded-full pr-5 pl-4 text-[15px] font-medium shadow-[0_10px_30px_-10px_oklch(0.2_0_0/0.5)] transition-transform active:scale-95 md:hidden"
      >
        <Coins className="size-5" />
        Assegna punti
      </button>

      <ResponsiveDrawer open={open} setOpen={setOpen}>
        <ResponsiveDrawerContent className="sm:max-w-md md:max-h-[90dvh] md:overflow-y-auto">
          {open && <Panel />}
        </ResponsiveDrawerContent>
      </ResponsiveDrawer>
    </>
  );
}

function Panel() {
  const [clients, setClients] = useState<Client[] | null>(null);
  const [presets, setPresets] = useState<Preset[]>([]);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Client | null>(null);

  useEffect(() => {
    fetch("/api/dashboard/clients?staff=1")
      .then((response) => (response.ok ? response.json() : null))
      .then((payload) => setClients(payload?.clients ?? []))
      .catch(() => setClients([]));
    fetch("/api/dashboard/points/presets")
      .then((response) => (response.ok ? response.json() : null))
      .then((payload) => setPresets(payload?.presets ?? []))
      .catch(() => {});
  }, []);

  const results = useMemo(() => {
    if (!clients) return [];
    const needle = query.trim().toLowerCase();
    const digits = needle.replace(/\D/g, "");
    const matches = needle
      ? clients.filter(
          (client) =>
            client.name.toLowerCase().includes(needle) ||
            client.email?.toLowerCase().includes(needle) ||
            client.code?.toLowerCase().includes(needle) ||
            (digits.length >= 3 &&
              client.phone?.replace(/\D/g, "").includes(digits)),
        )
      : clients;
    return [...matches]
      .sort((a, b) => a.name.localeCompare(b.name, "it"))
      .slice(0, LIST_LIMIT);
  }, [clients, query]);

  if (selected) {
    return (
      <ClientWallet
        client={selected}
        presets={presets}
        onBack={() => setSelected(null)}
      />
    );
  }

  return (
    <>
      <SheetHeader
        title="Assegna punti"
        description="Cerca il cliente: poi un tocco sul preset, o un importo a mano."
      />
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))] md:px-0 md:pb-0">
        <div className="relative">
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2" />
          <Input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Nome, telefono, email o codice"
            className="bg-card h-12 rounded-xl pl-10 text-base md:h-10 md:text-sm"
          />
        </div>

        {clients === null ? (
          <div className="text-muted-foreground flex h-24 items-center justify-center gap-2 text-sm">
            <Loader2 className="size-4 animate-spin" />
            Carico i clienti
          </div>
        ) : results.length === 0 ? (
          <p className="text-muted-foreground px-1 py-6 text-center text-sm">
            Nessun cliente trovato.
          </p>
        ) : (
          <ul className="bg-card overflow-hidden rounded-2xl border [&>*+*]:border-t">
            {results.map((client) => (
              <li key={client.id}>
                <button
                  type="button"
                  onClick={() => setSelected(client)}
                  className="active:bg-muted/80 md:hover:bg-muted/50 flex min-h-14 w-full items-center gap-3 px-4 py-2.5 text-left transition-colors"
                >
                  <Avatar className="size-9 shrink-0">
                    {client.avatarUrl && <AvatarImage src={client.avatarUrl} />}
                    <AvatarFallback className="text-xs">
                      {client.name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px]">
                      {client.name}
                    </span>
                    <span className="text-muted-foreground block truncate text-[13px]">
                      {client.phone ?? client.email ?? "Nessun recapito"}
                    </span>
                  </span>
                  <PointsBadge
                    points={client.points}
                    frozen={Boolean(client.suspension)}
                  />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}

/** Il conto di una persona e i modi di caricarle punti. */
function ClientWallet({
  client,
  presets,
  onBack,
}: {
  client: Client;
  presets: Preset[];
  onBack: () => void;
}) {
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [sign, setSign] = useState<1 | -1>(1);
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");

  useEffect(() => {
    fetch(`/api/dashboard/clients/${client.id}/points`)
      .then((response) => (response.ok ? response.json() : null))
      .then((payload) => payload?.points && setWallet(payload.points))
      .catch(() => {});
  }, [client.id]);

  const joined = wallet?.program.state === "joined";
  const frozen = wallet?.frozen ?? Boolean(client.suspension);
  const firstName = client.firstName ?? client.name.split(" ")[0];

  const submit = async (
    key: string,
    body: Record<string, unknown>,
    delta: number,
  ) => {
    setBusy(key);
    try {
      const response = await fetch(
        `/api/dashboard/clients/${client.id}/points`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
      );
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        toast.error("Punti non assegnati", {
          description: payload?.error ?? "Riprova fra poco.",
        });
        return false;
      }

      if (payload?.pending) {
        setWallet((current) =>
          current
            ? { ...current, pendingPoints: current.pendingPoints + delta }
            : current,
        );
        toast.success(`${signed(delta)} punti in attesa`, {
          description: `${firstName} li riceve quando aderisce al programma.`,
        });
      } else {
        setWallet((current) =>
          current ? { ...current, balance: payload.balance } : current,
        );
        toast.success(`${signed(delta)} punti a ${firstName}`, {
          description: `Nuovo saldo: ${payload.balance} punti.`,
        });
      }
      return true;
    } catch {
      toast.error("Punti non assegnati", {
        description: "Controlla la connessione e riprova.",
      });
      return false;
    } finally {
      setBusy(null);
    }
  };

  const manualPoints = Number.parseInt(amount, 10);
  const manualValid =
    Number.isInteger(manualPoints) &&
    manualPoints > 0 &&
    reason.trim().length >= 2;

  const submitManual = async () => {
    const delta = sign * manualPoints;
    const done = await submit("manual", { delta, label: reason.trim() }, delta);
    if (done) {
      setAmount("");
      setReason("");
    }
  };

  return (
    <>
      <SheetHeader title="Assegna punti" />
      <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))] md:px-0 md:pb-0">
        {/* Chi, e quanto ha: la prima cosa da controllare prima di caricare. */}
        <section className="space-y-3">
          <div className="flex items-center gap-3">
            <Avatar className="size-11 shrink-0">
              {client.avatarUrl && <AvatarImage src={client.avatarUrl} />}
              <AvatarFallback>
                {client.name.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[17px] font-semibold">
                {client.name}
              </p>
              <p className="text-muted-foreground truncate text-[13px]">
                {client.phone ?? client.email ?? "Nessun recapito"}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="shrink-0"
              onClick={onBack}
            >
              Cambia
            </Button>
          </div>

          <div className="bg-muted/70 rounded-2xl px-4 py-3.5">
            <p className="text-muted-foreground text-xs">Saldo</p>
            <p className="mt-1 flex items-baseline gap-1.5">
              {wallet ? (
                <span className="text-3xl leading-none font-semibold tabular-nums">
                  {wallet.balance}
                </span>
              ) : (
                <Loader2 className="text-muted-foreground size-5 animate-spin" />
              )}
              <span className="text-muted-foreground text-sm">punti</span>
            </p>
            {wallet && wallet.pendingPoints > 0 && (
              <p className="text-warning-foreground mt-1.5 text-xs">
                +{wallet.pendingPoints} in attesa di adesione al programma
              </p>
            )}
            {wallet && !joined && !frozen && (
              <p className="text-muted-foreground mt-1.5 text-xs leading-relaxed">
                Non ha ancora aderito al programma: i punti restano in attesa
                finché non accetta il regolamento.
              </p>
            )}
          </div>
        </section>

        {frozen ? (
          <div className="border-danger-border bg-danger-subtle text-danger-foreground flex items-start gap-2.5 rounded-xl border p-3 text-sm">
            <Snowflake className="mt-0.5 size-4 shrink-0" />
            <p>
              L'account è sospeso: i punti sono congelati fino alla
              riattivazione.
            </p>
          </div>
        ) : (
          <>
            {presets.length > 0 && (
              <section className="space-y-2.5">
                <h3 className="text-sm font-semibold">Preset</h3>
                <div className="grid grid-cols-2 gap-2">
                  {presets.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      disabled={busy !== null || (!joined && preset.points < 0)}
                      onClick={() =>
                        void submit(
                          preset.id,
                          { presetId: preset.id },
                          preset.points,
                        )
                      }
                      className="bg-card flex min-h-16 flex-col items-start justify-center gap-0.5 rounded-xl border px-3.5 py-2.5 text-left transition-[background-color,transform] active:scale-[0.97] disabled:opacity-40 md:hover:bg-muted/50"
                    >
                      <span
                        className={cn(
                          "flex items-center gap-1.5 text-lg leading-none font-semibold tabular-nums",
                          preset.points > 0
                            ? "text-success-foreground"
                            : "text-danger-foreground",
                        )}
                      >
                        {busy === preset.id && (
                          <Loader2 className="size-4 animate-spin" />
                        )}
                        {signed(preset.points)}
                      </span>
                      <span className="w-full truncate text-[13px]">
                        {preset.label}
                      </span>
                    </button>
                  ))}
                </div>
              </section>
            )}

            <section className="space-y-3">
              <h3 className="text-sm font-semibold">Importo a mano</h3>
              <div className="grid grid-cols-[auto_1fr] gap-2">
                <fieldset className="bg-muted flex rounded-xl p-1">
                  <legend className="sr-only">Aggiungi o togli</legend>
                  <button
                    type="button"
                    aria-label="Aggiungi punti"
                    aria-pressed={sign === 1}
                    onClick={() => setSign(1)}
                    className={cn(
                      "flex size-10 items-center justify-center rounded-lg transition-colors",
                      sign === 1 && "bg-background shadow-xs",
                    )}
                  >
                    <Plus className="size-4" />
                  </button>
                  <button
                    type="button"
                    aria-label="Togli punti"
                    aria-pressed={sign === -1}
                    // A un conto non attivo non si tolgono punti (lib.ts).
                    disabled={!joined}
                    onClick={() => setSign(-1)}
                    className={cn(
                      "flex size-10 items-center justify-center rounded-lg transition-colors disabled:opacity-40",
                      sign === -1 && "bg-background shadow-xs",
                    )}
                  >
                    <Minus className="size-4" />
                  </button>
                </fieldset>
                <Input
                  aria-label="Punti"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  step={1}
                  placeholder="Punti"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  className="bg-card h-12 rounded-xl text-base tabular-nums"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="assign-reason" className="font-normal">
                  Motivo{" "}
                  <span className="text-muted-foreground">
                    (lo legge il cliente)
                  </span>
                </Label>
                <Input
                  id="assign-reason"
                  value={reason}
                  maxLength={80}
                  placeholder="Es. torneo sociale, correzione"
                  onChange={(event) => setReason(event.target.value)}
                  className="bg-card h-12 rounded-xl text-base"
                />
              </div>
              <Button
                className="h-12 w-full rounded-xl"
                disabled={!manualValid || busy !== null}
                onClick={() => void submitManual()}
              >
                {busy === "manual" && (
                  <Loader2 className="size-4 animate-spin" />
                )}
                {manualValid
                  ? `${sign === 1 ? "Aggiungi" : "Togli"} ${manualPoints} punti`
                  : "Indica punti e motivo"}
              </Button>
            </section>
          </>
        )}

        <Link
          href={`/dashboard/clients/${client.id}?tab=points&from=points`}
          className="active:bg-muted/80 md:hover:bg-muted/50 bg-card flex min-h-14 items-center gap-3 rounded-2xl border px-4 text-[15px] transition-colors"
        >
          <span className="flex-1">
            Scheda punti completa
            <span className="text-muted-foreground block text-[13px]">
              Storico, premi riscattati, adesione
            </span>
          </span>
          <ChevronRight className="text-muted-foreground size-4" />
        </Link>
      </div>
    </>
  );
}
