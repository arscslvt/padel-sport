"use client";

import { api } from "@padel-sport/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import { UserRound, X } from "lucide-react";
import { useEffect, useState } from "react";
import type { Control } from "react-hook-form";
import { FIELD_CLASS, Hint, StepHeader } from "@/components/booking/wizard-ui";
import { Button } from "@/components/ui/button";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { MAX_PLAYERS } from "@/lib/booking";
import type { BookingFormValues } from "@/lib/booking-form";
import { PARTNER_ROWS } from "@/lib/booking-form";

/**
 * La squadra: chi prenota più i suoi compagni.
 *
 * Il nome è obbligatorio per ogni giocatore che si indica, la mail no: serve
 * solo a mandargli il QR della prenotazione. Le righe si possono lasciare
 * vuote — è il caso in cui il club completa la squadra — a meno che la
 * struttura non pretenda la squadra al completo (`requireFull`, dalle
 * impostazioni della dashboard): allora vanno riempite tutte.
 *
 * Mentre si scrive il nome, compaiono i clienti del club che hanno accettato
 * di farsi trovare: sceglierne uno gli manda un invito su WhatsApp, e la
 * partita conta anche per lui nei punti. Chi non c'è resta un nome scritto.
 */

interface PickedPlayer {
  id: string;
  name: string;
}
export function SquadStep({
  step,
  totalSteps,
  control,
  bookerName,
  filledCount,
  requireFull,
  partners,
  onPick,
  onUnlink,
}: {
  step: number;
  totalSteps: number;
  control: Control<BookingFormValues>;
  bookerName: string;
  filledCount: number;
  /** La struttura accetta solo prenotazioni con tutti e quattro i giocatori. */
  requireFull: boolean;
  partners: BookingFormValues["partners"];
  onPick: (row: number, player: PickedPlayer) => void;
  onUnlink: (row: number) => void;
}) {
  const chosen = partners
    .map((partner) => partner.playerId)
    .filter((id): id is string => Boolean(id));
  const squadSize = 1 + filledCount;
  const missing = MAX_PLAYERS - squadSize;

  return (
    <div>
      <StepHeader
        step={step}
        total={totalSteps}
        title="Con chi giochi?"
        subtitle={
          requireFull
            ? `Servono i nomi di tutti e ${MAX_PLAYERS}. La mail è facoltativa: serve a mandare loro il QR della prenotazione.`
            : "Il nome serve a noi, la mail serve a loro: ci mandiamo il QR della prenotazione."
        }
      />

      <div className="border-border mb-4 flex items-center justify-between rounded-2xl border px-4 py-3">
        <div>
          <p className="text-sm font-medium">{bookerName || "Tu"}</p>
          <p className="text-muted-foreground text-sm">Prenoti tu</p>
        </div>
        <span className="text-muted-foreground text-sm tabular-nums">
          {squadSize}/{MAX_PLAYERS}
        </span>
      </div>

      <div className="flex flex-col gap-5">
        {PARTNER_ROWS.map((row) =>
          partners[row]?.playerId ? (
            <div key={row} className="space-y-2">
              <p className="text-sm font-medium">Giocatore {row + 2}</p>
              <div className="border-border bg-muted/50 flex min-h-11 items-center gap-3 rounded-xl border px-3">
                <UserRound className="text-muted-foreground size-4 shrink-0" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">
                    {partners[row].name}
                  </span>
                  <span className="text-muted-foreground block text-xs">
                    Riceve l&apos;invito su WhatsApp
                  </span>
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-8 rounded-full"
                  aria-label={`Togli ${partners[row].name}`}
                  onClick={() => onUnlink(row)}
                >
                  <X className="size-4" />
                </Button>
              </div>
            </div>
          ) : (
            <div
              key={row}
              className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]"
            >
              <FormField
                control={control}
                name={`partners.${row}.name`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Giocatore {row + 2}
                      {requireFull ? "" : " (facoltativo)"}
                    </FormLabel>
                    <PartnerSearch
                      term={field.value}
                      exclude={chosen}
                      onPick={(player) => onPick(row, player)}
                    >
                      {(handlers) => (
                        <FormControl>
                          <Input
                            autoComplete="off"
                            placeholder="Cerca o scrivi nome e cognome"
                            className={FIELD_CLASS}
                            {...field}
                            onFocus={handlers.onFocus}
                            onBlur={() => {
                              handlers.onBlur();
                              field.onBlur();
                            }}
                          />
                        </FormControl>
                      )}
                    </PartnerSearch>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={control}
                name={`partners.${row}.email`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email (facoltativa)</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        inputMode="email"
                        autoComplete="off"
                        placeholder="Per ricevere il QR"
                        className={FIELD_CLASS}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          ),
        )}
      </div>

      <Hint>
        {missing === 0
          ? "Siete al completo: la prenotazione è definitiva, non serve altro da parte nostra."
          : requireFull
            ? `Il campo si prenota solo in ${MAX_PLAYERS}: ${
                missing === 1
                  ? "manca ancora un giocatore"
                  : `mancano ancora ${missing} giocatori`
              }.`
            : `${
                missing === MAX_PLAYERS - 1
                  ? "Puoi anche non indicare nessuno"
                  : missing === 1
                    ? "Manca un giocatore"
                    : `Mancano ${missing} giocatori`
              }: prenoti lo stesso e ci pensiamo noi a cercare chi gioca al tuo livello.`}
      </Hint>

      <p className="text-muted-foreground mt-3 text-xs">
        Comunicando la mail di un compagno confermi di avere il suo consenso a
        ricevere la prenotazione. Nella ricerca compare solo chi ha scelto di
        farsi trovare dalla propria area personale.
      </p>
    </div>
  );
}

/** Quanto aspettare dopo l'ultimo tasto prima di cercare. */
const SEARCH_DELAY_MS = 250;

/**
 * I clienti che si possono invitare, sotto il campo del nome. La ricerca la
 * fa Convex, e restituisce solo chi si è fatto trovare.
 */
function PartnerSearch({
  term,
  exclude,
  onPick,
  children,
}: {
  term: string;
  exclude: string[];
  onPick: (player: PickedPlayer) => void;
  children: (handlers: {
    onFocus: () => void;
    onBlur: () => void;
  }) => React.ReactNode;
}) {
  const [focused, setFocused] = useState(false);
  const [debounced, setDebounced] = useState(term);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(term), SEARCH_DELAY_MS);
    return () => clearTimeout(timer);
  }, [term]);

  const query = debounced.trim();
  const results = useQuery(
    api.modules.openMatches.search.default,
    focused && query.length >= 2 ? { term: query } : "skip",
  );
  const options = (results ?? []).filter(
    (player) => !exclude.includes(player.id),
  );

  return (
    <div className="space-y-1.5">
      {children({
        onFocus: () => setFocused(true),
        onBlur: () => setFocused(false),
      })}
      {focused && options.length > 0 && (
        <ul className="border-border bg-background overflow-hidden rounded-xl border [&>*+*]:border-t">
          {options.map((player) => (
            <li key={player.id}>
              <button
                type="button"
                // Prima del blur del campo, che chiuderebbe l'elenco.
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  onPick({ id: player.id, name: player.name });
                  setFocused(false);
                }}
                className="hover:bg-muted/60 active:bg-muted flex min-h-11 w-full items-center justify-between gap-3 px-3 text-left"
              >
                <span className="truncate text-sm">{player.name}</span>
                <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
                  Livello {player.level.toFixed(1)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
