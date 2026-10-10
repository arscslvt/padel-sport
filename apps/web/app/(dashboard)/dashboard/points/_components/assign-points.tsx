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
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { SlotText } from "slot-text/react";
import "slot-text/style.css";
import { toast } from "sonner";

import { SheetHeader } from "@/app/(dashboard)/_components/sheet-header";
import { useFloatingAction } from "@/app/(dashboard)/_providers/floating-action.provider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

  // Da telefono il pulsante fluttua sopra la barra in basso: lo disegna il
  // layout, che lo fa entrare e uscire da dietro la barra al cambio di pagina.
  useFloatingAction({
    key: "assign-points",
    label: "Assegna punti",
    icon: Coins,
    onClick: () => setOpen(true),
  });

  return (
    <>
      <Button className="hidden md:inline-flex" onClick={() => setOpen(true)}>
        <Coins className="size-4" />
        Assegna punti
      </Button>

      <ResponsiveDrawer open={open} setOpen={setOpen}>
        {/* Da telefono alto e fisso: ricerca e cliente hanno la stessa altezza,
            il pannello non salta fra un passaggio e l'altro e il contenuto
            scorre dentro. `dvh` è l'altezza davvero visibile su Safari. */}
        <ResponsiveDrawerContent className="bg-background data-[vaul-drawer-direction=bottom]:h-[88dvh] data-[vaul-drawer-direction=bottom]:max-h-[88dvh] sm:max-w-md md:max-h-[90dvh] md:overflow-y-auto">
          {open && <Panel onDone={() => setOpen(false)} />}
        </ResponsiveDrawerContent>
      </ResponsiveDrawer>
    </>
  );
}

function Panel({ onDone }: { onDone: () => void }) {
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
        onDone={onDone}
      />
    );
  }

  return (
    <>
      <SheetHeader
        title="Assegna punti"
        description="Cerca il cliente: poi un tocco sul preset, o un importo a mano."
      />
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 pt-1 pb-[calc(1.5rem+env(safe-area-inset-bottom))] md:-mx-1 md:px-1 md:pb-0">
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

/**
 * Il conto di una persona e i modi di caricarle punti.
 *
 * Un asse solo, il margine sinistro, e una gerarchia sola: chi è e quanto ha
 * (il saldo a destra, sulla stessa riga del nome), poi i preset a tutta riga
 * — un tocco e i punti sono caricati — e l'importo a mano solo se lo si
 * chiede. Il manuale è l'eccezione: tenerlo sempre aperto metteva quattro
 * controlli fra l'operatore e il gesto di tutti i giorni.
 */
function ClientWallet({
  client,
  presets,
  onBack,
  onDone,
}: {
  client: Client;
  presets: Preset[];
  onBack: () => void;
  /** Punti assegnati: il pannello ha finito, e la conferma resta nel toast. */
  onDone: () => void;
}) {
  const reduce = useReducedMotion();
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [manualOpen, setManualOpen] = useState(false);
  const [sign, setSign] = useState<1 | -1>(1);
  const [amount, setAmount] = useState(1);
  const [reason, setReason] = useState("");
  /** Assegnati: il saldo sta rotolando, poi il pannello si chiude. */
  const [closing, setClosing] = useState(false);
  const [direction, setDirection] = useState<"up" | "down">("up");
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Un pannello chiuso prima del tempo non deve chiudersi di nuovo dopo.
  useEffect(
    () => () => {
      if (closeTimer.current) clearTimeout(closeTimer.current);
    },
    [],
  );

  /**
   * Il saldo che cambia rotola come un contatore: in su quando si dà, in giù
   * quando si toglie. Con «riduci movimento» il numero cambia e basta.
   */
  const roll = reduce
    ? { direction, duration: 0, stagger: 0 }
    : { direction, duration: 420, stagger: 60 };

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

      // Prima il saldo si aggiorna sotto gli occhi di chi l'ha toccato, poi
      // il pannello si chiude: un'assegnazione è un gesto concluso, e il
      // toast ne resta il riepilogo.
      setDirection(delta > 0 ? "up" : "down");
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
      setClosing(true);
      closeTimer.current = setTimeout(onDone, reduce ? 500 : 1200);
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

  const reasonValid = reason.trim().length >= 2;

  const submitManual = async () => {
    const delta = sign * amount;
    await submit("manual", { delta, label: reason.trim() }, delta);
  };

  return (
    <>
      {/* Secondo passaggio del pannello: il titolo è la persona, e la freccia
          a sinistra torna alla ricerca. */}
      <SheetHeader
        title={client.name}
        back={{ label: "Cambia cliente", onClick: onBack }}
      />
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pt-1 pb-[calc(1.5rem+env(safe-area-inset-bottom))] md:-mx-1 md:px-1 md:pb-0">
        {/* Il recapito e il saldo, sulla stessa riga: il saldo si legge senza
            cercarlo, allineato a destra come un importo. */}
        <div className="flex items-center gap-3 pb-4">
          <Avatar className="size-11 shrink-0">
            {client.avatarUrl && <AvatarImage src={client.avatarUrl} />}
            <AvatarFallback className="bg-foreground/[0.07]">
              {client.name.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="text-muted-foreground truncate text-[13px]">
              {client.phone ?? client.email ?? "Nessun recapito"}
            </p>
            {client.code && (
              <p className="text-muted-foreground truncate text-[13px] tabular-nums">
                #{client.code}
              </p>
            )}
          </div>
          <div className="shrink-0 text-right">
            {wallet ? (
              <p className="text-2xl leading-none font-semibold tabular-nums">
                {/* Le cifre animate sono pezzi separati: lo screen reader
                    legge la copia intera, e il toast annuncia il cambio. */}
                <span className="sr-only">{wallet.balance}</span>
                <SlotText
                  aria-hidden
                  text={String(wallet.balance)}
                  options={roll}
                />
              </p>
            ) : (
              <Loader2 className="text-muted-foreground ml-auto size-5 animate-spin" />
            )}
            <p className="text-muted-foreground mt-1 text-xs">punti</p>
          </div>
        </div>

        {wallet && (wallet.pendingPoints > 0 || !joined) && !frozen && (
          <p className="text-warning-foreground -mt-1 pb-4 text-xs leading-relaxed">
            {wallet.pendingPoints > 0 && (
              <>
                <SlotText
                  text={`+${wallet.pendingPoints}`}
                  options={roll}
                  className="font-medium tabular-nums"
                />{" "}
                in attesa.{" "}
              </>
            )}
            {!joined &&
              "Non ha ancora aderito al programma: i punti restano in attesa finché non accetta il regolamento."}
          </p>
        )}

        <div className="border-t pt-4">
          {frozen ? (
            <div className="border-danger-border bg-danger-subtle text-danger-foreground flex items-start gap-2.5 rounded-xl border p-3 text-sm">
              <Snowflake className="mt-0.5 size-4 shrink-0" />
              <p>
                L'account è sospeso: i punti sono congelati fino alla
                riattivazione.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {/* I preset a tutta riga: il numero davanti, grande, perché è
                  quello che si sta per dare; la causale accanto. */}
              {presets.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  disabled={
                    busy !== null || closing || (!joined && preset.points < 0)
                  }
                  onClick={() =>
                    void submit(
                      preset.id,
                      { presetId: preset.id },
                      preset.points,
                    )
                  }
                  className="bg-card flex min-h-14 w-full items-center gap-4 rounded-xl border px-4 text-left transition-[background-color,transform] active:scale-[0.98] disabled:opacity-40 md:hover:bg-muted/50"
                >
                  <span
                    className={cn(
                      "w-10 shrink-0 text-lg font-semibold tabular-nums",
                      preset.points > 0
                        ? "text-success-foreground"
                        : "text-danger-foreground",
                    )}
                  >
                    {signed(preset.points)}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-[15px]">
                    {preset.label}
                  </span>
                  {busy === preset.id && (
                    <Loader2 className="text-muted-foreground size-4 animate-spin" />
                  )}
                </button>
              ))}

              <AnimatePresence initial={false} mode="wait">
                {manualOpen ? (
                  <motion.section
                    key="manual"
                    aria-label="Altro importo"
                    initial={
                      reduce ? { opacity: 0 } : { opacity: 0, height: 0 }
                    }
                    animate={{ opacity: 1, height: "auto" }}
                    exit={reduce ? { opacity: 0 } : { opacity: 0, height: 0 }}
                    transition={{ type: "spring", bounce: 0, duration: 0.35 }}
                    className="overflow-hidden"
                  >
                    <div className="space-y-3 pt-3">
                      <fieldset className="bg-foreground/[0.06] grid grid-cols-2 gap-1 rounded-xl p-1">
                        <legend className="sr-only">Aggiungi o togli</legend>
                        {(
                          [
                            [1, "Aggiungi"],
                            [-1, "Togli"],
                          ] as const
                        ).map(([value, label]) => (
                          <button
                            key={label}
                            type="button"
                            aria-pressed={sign === value}
                            // A un conto non attivo non si tolgono punti (lib.ts).
                            disabled={value === -1 && !joined}
                            onClick={() => setSign(value)}
                            className={cn(
                              "min-h-10 rounded-lg text-sm transition-colors disabled:opacity-40",
                              sign === value
                                ? "bg-background font-medium shadow-xs"
                                : "text-muted-foreground",
                            )}
                          >
                            {label}
                          </button>
                        ))}
                      </fieldset>

                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          className="size-12 shrink-0 rounded-xl"
                          aria-label="Un punto in meno"
                          disabled={amount <= 1}
                          onClick={() => setAmount((value) => value - 1)}
                        >
                          <Minus className="size-4" />
                        </Button>
                        <Input
                          aria-label="Punti"
                          type="number"
                          inputMode="numeric"
                          min={1}
                          max={1000}
                          value={amount}
                          onChange={(event) =>
                            setAmount(
                              Math.min(
                                1000,
                                Math.max(1, Number(event.target.value) || 1),
                              ),
                            )
                          }
                          className="bg-card h-12 rounded-xl text-center text-xl font-semibold tabular-nums"
                        />
                        <Button
                          variant="outline"
                          size="icon"
                          className="size-12 shrink-0 rounded-xl"
                          aria-label="Un punto in più"
                          disabled={amount >= 1000}
                          onClick={() => setAmount((value) => value + 1)}
                        >
                          <Plus className="size-4" />
                        </Button>
                      </div>

                      <Input
                        aria-label="Motivo"
                        value={reason}
                        maxLength={80}
                        placeholder="Motivo, lo legge il cliente"
                        onChange={(event) => setReason(event.target.value)}
                        className="bg-card h-12 rounded-xl text-base"
                      />

                      <div className="grid grid-cols-[auto_1fr] gap-2">
                        <Button
                          variant="ghost"
                          className="h-12 rounded-xl"
                          onClick={() => setManualOpen(false)}
                        >
                          Annulla
                        </Button>
                        <Button
                          className="h-12 rounded-xl"
                          disabled={!reasonValid || busy !== null || closing}
                          onClick={() => void submitManual()}
                        >
                          {busy === "manual" && (
                            <Loader2 className="size-4 animate-spin" />
                          )}
                          {sign === 1 ? "Aggiungi" : "Togli"} {amount}{" "}
                          {amount === 1 ? "punto" : "punti"}
                        </Button>
                      </div>
                    </div>
                  </motion.section>
                ) : (
                  <motion.div
                    key="toggle"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                  >
                    <button
                      type="button"
                      onClick={() => setManualOpen(true)}
                      className="text-foreground hover:bg-muted/60 flex min-h-12 w-full items-center gap-2 rounded-xl px-4 text-[15px] font-medium transition-colors"
                    >
                      <Plus className="size-4" />
                      Altro importo
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>

        <Link
          href={`/dashboard/clients/${client.id}?tab=points&from=points`}
          className="text-muted-foreground hover:text-foreground mt-4 inline-flex min-h-10 items-center gap-0.5 text-sm transition-colors"
        >
          Apri la scheda punti di {firstName}
          <ChevronRight className="size-4" />
        </Link>
      </div>
    </>
  );
}
