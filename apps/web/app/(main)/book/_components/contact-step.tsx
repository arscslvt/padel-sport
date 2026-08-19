"use client";

import { Check, Pencil } from "lucide-react";
import { useState } from "react";
import type { Control } from "react-hook-form";
import { FIELD_CLASS, StepHeader } from "@/components/booking/wizard-ui";
import { Button } from "@/components/ui/button";
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
 *
 * Quando il club ha già un recapito lo **propone** invece di scriverlo nel
 * campo: un numero che compare da solo in un modulo si conferma senza
 * guardarlo, e se nel frattempo è cambiato la telefonata va a vuoto proprio nel
 * momento in cui serviva — quando manca un giocatore o il campo si sposta.
 */
export function ContactStep({
  step,
  totalSteps,
  control,
  askName,
  bookerName,
  email,
  knownPhone,
  onUseKnownPhone,
}: {
  step: number;
  totalSteps: number;
  control: Control<BookingFormValues>;
  askName: boolean;
  bookerName: string;
  email?: string;
  /** Il recapito già registrato, se il club ne ha uno. */
  knownPhone?: string;
  onUseKnownPhone: () => void;
}) {
  // Scrivere un altro numero è una scelta esplicita: da lì il riquadro non
  // ricompare da solo, o si riscriverebbe sopra a quello appena digitato.
  const [editing, setEditing] = useState(false);

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

              {!editing && knownPhone && field.value === knownPhone ? (
                <>
                  <div className="border-border rounded-2xl border px-4 py-3">
                    <div className="flex items-start gap-2.5">
                      <Check className="mt-0.5 size-4 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm">{knownPhone}</p>
                        <p className="text-muted-foreground text-xs">
                          È il numero che risulta al club: lo usiamo per questa
                          prenotazione.
                        </p>
                      </div>
                    </div>

                    <Button
                      type="button"
                      size="pill"
                      variant="outline"
                      className="mt-3"
                      onClick={() => {
                        field.onChange("");
                        setEditing(true);
                      }}
                    >
                      <Pencil className="size-4" />
                      Usane un altro
                    </Button>
                  </div>
                  <FormMessage />
                </>
              ) : (
                <>
                  <FormControl>
                    <Input
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel"
                      placeholder="Es. 333 123 4567"
                      className={FIELD_CLASS}
                      autoFocus={editing}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Se manca il prefisso usiamo +39.
                    {knownPhone && (
                      <>
                        {" "}
                        <button
                          type="button"
                          className="hover:text-foreground underline underline-offset-4"
                          onClick={() => {
                            onUseKnownPhone();
                            setEditing(false);
                          }}
                        >
                          Torna a {knownPhone}
                        </button>
                      </>
                    )}
                  </FormDescription>
                  <FormMessage />
                </>
              )}
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
