"use client";

import { api } from "@padel-sport/backend/convex/_generated/api";
import type { Id } from "@padel-sport/backend/convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { Flag } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useMediaQuery } from "usehooks-ts";

import { FIELD_CLASS } from "@/components/booking/wizard-ui";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
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
import { Textarea } from "@/components/ui/textarea";
import { formatClubDate, signedPoints } from "@/lib/points";
import { cn } from "@/lib/utils";

import type { Wallet } from "./types";

/**
 * Il modulo per chiedere allo staff conto di un movimento.
 *
 * Su telefono è un drawer dal basso, su schermo largo un pannello laterale:
 * l'elenco dei movimenti resta visibile accanto, ed è proprio quello che si
 * sta guardando mentre si scrive. La segnalazione finisce nelle Richieste del
 * gestionale (modules/pointReports).
 */

type Category = "wrong_points" | "missing_points" | "question";

const CATEGORIES: { value: Category; label: string }[] = [
  { value: "wrong_points", label: "Punti sbagliati" },
  { value: "missing_points", label: "Punti mancanti" },
  { value: "question", label: "Chiarimento" },
];

/** Select di Radix non accetta un valore vuoto: questo sta per «nessuno». */
const NO_TRANSACTION = "none";

/** Allineati a modules/pointReports/lib.ts: il server ha l'ultima parola. */
const MIN_MESSAGE = 10;
const MAX_MESSAGE = 1000;

type Transaction = Wallet["transactions"][number];

/**
 * I movimenti raggruppati per giorno, nell'ordine in cui arrivano (dal più
 * recente). La data diventa un'intestazione invece di ripetersi su ogni riga:
 * su telefono è lo spazio che serve al nome del movimento.
 */
function groupByDay(transactions: Transaction[]) {
  const groups: { day: string; items: Transaction[] }[] = [];
  for (const transaction of transactions) {
    const day = formatClubDate(transaction.createdAt);
    const last = groups.at(-1);
    if (last?.day === day) last.items.push(transaction);
    else groups.push({ day, items: [transaction] });
  }
  return groups;
}

/** Il messaggio dentro l'errore di Convex, senza lo stack che lo accompagna. */
function convexErrorMessage(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error);
  const match = raw.match(/Uncaught Error: (.*?)(?:\n| at )/);
  return match?.[1] ?? "Non siamo riusciti a inviare la segnalazione.";
}

function ReportForm({
  transactions,
  onSent,
}: {
  transactions: Wallet["transactions"];
  onSent: () => void;
}) {
  const createReport = useMutation(api.modules.pointReports.create.default);

  const [transactionId, setTransactionId] = useState(NO_TRANSACTION);
  const [category, setCategory] = useState<Category | "">("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const selected = transactions.find(
    (transaction) => transaction.id === transactionId,
  );

  const trimmed = message.trim();
  const ready = category !== "" && trimmed.length >= MIN_MESSAGE;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!ready || sending) return;

    setSending(true);
    try {
      await createReport({
        transactionId:
          transactionId === NO_TRANSACTION
            ? undefined
            : (transactionId as Id<"pointTransactions">),
        category,
        message: trimmed,
      });
      toast.success("Segnalazione inviata", {
        description: "Lo staff la controlla e ti risponde via mail o telefono.",
      });
      onSent();
    } catch (error) {
      toast.error("Segnalazione non inviata", {
        description: convexErrorMessage(error),
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-5 px-4 pb-6">
      <div className="space-y-2">
        <Label htmlFor="report-transaction">Movimento</Label>
        <Select value={transactionId} onValueChange={setTransactionId}>
          <SelectTrigger
            id="report-transaction"
            className={`${FIELD_CLASS} w-full`}
          >
            {/* Il campo chiuso mostra una riga sola: la voce del menu, con
              punti allineati a destra, lì non ci starebbe. */}
            <SelectValue>
              {selected
                ? `${selected.label} · ${signedPoints(selected.delta)}`
                : "Nessuno in particolare"}
            </SelectValue>
          </SelectTrigger>
          <SelectContent className="max-h-80 w-(--radix-select-trigger-width)">
            <SelectItem value={NO_TRANSACTION}>
              Nessuno in particolare
            </SelectItem>
            {groupByDay(transactions).map((group) => (
              <SelectGroup key={group.day}>
                <SelectSeparator />
                <SelectLabel>{group.day}</SelectLabel>
                {group.items.map((transaction) => (
                  <SelectItem
                    key={transaction.id}
                    value={transaction.id}
                    className="*:[span]:last:min-w-0 *:[span]:last:flex-1"
                  >
                    <span className="truncate">{transaction.label}</span>
                    <span
                      className={cn(
                        "ml-auto shrink-0 font-mono text-xs tabular-nums",
                        transaction.delta > 0
                          ? "text-emerald-700 dark:text-emerald-400"
                          : "text-muted-foreground",
                      )}
                    >
                      {signedPoints(transaction.delta)}
                    </span>
                  </SelectItem>
                ))}
              </SelectGroup>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="report-category">Motivo</Label>
        <Select
          value={category}
          onValueChange={(value) => setCategory(value as Category)}
        >
          <SelectTrigger
            id="report-category"
            className={`${FIELD_CLASS} w-full`}
          >
            <SelectValue placeholder="Scegli un motivo" />
          </SelectTrigger>
          <SelectContent>
            {CATEGORIES.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="report-message">Cosa è successo?</Label>
        <Textarea
          id="report-message"
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          maxLength={MAX_MESSAGE}
          placeholder="Es. sabato ho vinto la partita delle 18 ma non vedo i punti."
          className="bg-background border-border min-h-28 rounded-xl"
        />
      </div>

      <Button
        type="submit"
        size="pill"
        className="w-full"
        disabled={!ready || sending}
      >
        {sending ? "Invio in corso…" : "Invia segnalazione"}
      </Button>
    </form>
  );
}

const TITLE = "Segnala un problema";
const DESCRIPTION =
  "Punti che non tornano o un dubbio su un movimento? Scrivici e ti rispondiamo.";

export function ReportPoints({
  transactions,
  prominent = false,
}: {
  transactions: Wallet["transactions"];
  /** Bottone pieno, per la sezione Segnalazioni dove è l'azione principale. */
  prominent?: boolean;
}) {
  const [open, setOpen] = useState(false);
  // Primo render uguale su server e client: il pannello è chiuso, quindi
  // scegliere drawer o sheet un attimo dopo non si vede.
  const isDesktop = useMediaQuery("(min-width: 768px)", {
    initializeWithValue: false,
  });

  // Ogni apertura parte da un modulo vuoto: smontarlo alla chiusura basta.
  const form = open && (
    <ReportForm transactions={transactions} onSent={() => setOpen(false)} />
  );

  return (
    <>
      {prominent ? (
        <Button
          type="button"
          size="pill"
          onClick={() => setOpen(true)}
          className="active:scale-[0.97]"
        >
          <Flag className="size-4" />
          Nuova
        </Button>
      ) : (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setOpen(true)}
          className="text-muted-foreground hover:text-foreground"
        >
          <Flag className="size-3.5" />
          Segnala
        </Button>
      )}

      {isDesktop ? (
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetContent className="w-full overflow-y-auto sm:max-w-md">
            <SheetHeader>
              <SheetTitle className="font-heading text-xl">{TITLE}</SheetTitle>
              <SheetDescription>{DESCRIPTION}</SheetDescription>
            </SheetHeader>
            {form}
          </SheetContent>
        </Sheet>
      ) : (
        <Drawer open={open} onOpenChange={setOpen}>
          <DrawerContent>
            <DrawerHeader className="text-left">
              <DrawerTitle className="font-heading text-xl">
                {TITLE}
              </DrawerTitle>
              <DrawerDescription>{DESCRIPTION}</DrawerDescription>
            </DrawerHeader>
            <div className="overflow-y-auto">{form}</div>
          </DrawerContent>
        </Drawer>
      )}
    </>
  );
}
