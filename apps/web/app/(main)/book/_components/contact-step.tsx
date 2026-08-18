"use client";

import type { Control } from "react-hook-form";
import { FIELD_CLASS, StepHeader } from "@/components/booking/wizard-ui";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { BookingFormValues } from "@/lib/booking-form";

/**
 * Recapito e note per la struttura.
 *
 * Il telefono è obbligatorio: è così che il club richiama chi prenota quando
 * la squadra è incompleta o serve spostare qualcosa, ed è il numero a cui
 * parte la conferma su WhatsApp.
 *
 * Il nome compare solo a chi non ha ancora un profilo giocatore: per tutti gli
 * altri la prenotazione porta il nome già salvato, e un campo modificabile che
 * non modifica niente sarebbe una bugia.
 */
export function ContactStep({
  step,
  totalSteps,
  control,
  askName,
  bookerName,
  email,
}: {
  step: number;
  totalSteps: number;
  control: Control<BookingFormValues>;
  askName: boolean;
  bookerName: string;
  email?: string;
}) {
  return (
    <div>
      <StepHeader
        step={step}
        total={totalSteps}
        title="Come ti contattiamo?"
        subtitle="Ci serve un numero per confermarti la prenotazione."
      />

      <div className="flex flex-col gap-5">
        {askName ? (
          <FormField
            control={control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nome e cognome</FormLabel>
                <FormControl>
                  <Input
                    autoComplete="name"
                    placeholder="Es. Mario Rossi"
                    className={FIELD_CLASS}
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  È il nome con cui risulterà la prenotazione.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        ) : (
          <div className="border-border rounded-2xl border px-4 py-3">
            <p className="text-muted-foreground text-xs tracking-wide uppercase">
              Prenoti come
            </p>
            <p className="mt-1 text-sm">{bookerName}</p>
            {email && <p className="text-muted-foreground text-sm">{email}</p>}
          </div>
        )}

        <FormField
          control={control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Telefono</FormLabel>
              <FormControl>
                <Input
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="Es. 333 123 4567"
                  className={FIELD_CLASS}
                  {...field}
                />
              </FormControl>
              <FormDescription>
                Se manca il prefisso usiamo +39.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Note alla struttura (facoltative)</FormLabel>
              <FormControl>
                <Textarea
                  rows={4}
                  placeholder="Es. serve il noleggio racchette, arriviamo dieci minuti prima…"
                  className="bg-background border-border rounded-xl"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                Le legge la segreteria del club insieme alla prenotazione.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  );
}
