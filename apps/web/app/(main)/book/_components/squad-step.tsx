"use client";

import type { Control } from "react-hook-form";
import { FIELD_CLASS, Hint, StepHeader } from "@/components/booking/wizard-ui";
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
 */
export function SquadStep({
  step,
  totalSteps,
  control,
  bookerName,
  filledCount,
  requireFull,
}: {
  step: number;
  totalSteps: number;
  control: Control<BookingFormValues>;
  bookerName: string;
  filledCount: number;
  /** La struttura accetta solo prenotazioni con tutti e quattro i giocatori. */
  requireFull: boolean;
}) {
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
        {PARTNER_ROWS.map((row) => (
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
                  <FormControl>
                    <Input
                      autoComplete="off"
                      placeholder="Nome e cognome"
                      className={FIELD_CLASS}
                      {...field}
                    />
                  </FormControl>
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
        ))}
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
        ricevere la prenotazione.
      </p>
    </div>
  );
}
