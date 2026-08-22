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
import type { MatchRequestValues } from "@/lib/match-request";

/**
 * I recapiti, chiesti per ultimi fra i dati veri: chi è arrivato fin qui ha
 * già scelto quando gioca, e lasciare nome e numero non è più un modulo da
 * riempire ma l'ultimo passo di una cosa quasi fatta.
 */
export function ContactStep({
  step,
  totalSteps,
  control,
}: {
  step: number;
  totalSteps: number;
  control: Control<MatchRequestValues>;
}) {
  return (
    <div>
      <StepHeader
        step={step}
        total={totalSteps}
        title="Come ti contattiamo?"
        subtitle="Ti scriviamo appena troviamo chi gioca con te."
      />

      <div className="flex flex-col gap-5">
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
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  placeholder="Es. mario.rossi@email.com"
                  className={FIELD_CLASS}
                  {...field}
                />
              </FormControl>
              <FormDescription>
                Ci mandiamo la copia della richiesta.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

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
                  placeholder="Es. +39 333 1234567"
                  className={FIELD_CLASS}
                  {...field}
                />
              </FormControl>
              <FormDescription>
                È il numero a cui ti chiamiamo se il match si completa.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  );
}
