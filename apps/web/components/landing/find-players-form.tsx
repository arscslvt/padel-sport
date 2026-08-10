"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const LEVELS = [
  { value: "principiante", label: "Principiante" },
  { value: "intermedio", label: "Intermedio" },
  { value: "avanzato", label: "Avanzato" },
] as const;

const MISSING_PLAYERS = ["1", "2", "3"] as const;

const requestSchema = z.object({
  name: z.string().trim().min(2, "Inserisci il tuo nome."),
  phone: z
    .string()
    .trim()
    .regex(/^\+?[0-9\s]{8,20}$/, "Inserisci un numero di telefono valido."),
  date: z.string().min(1, "Scegli una data."),
  time: z.string().min(1, "Scegli un orario."),
  level: z.enum(LEVELS.map((level) => level.value)),
  missing: z.enum(MISSING_PLAYERS),
});

type RequestValues = z.infer<typeof requestSchema>;

/** Su superficie grigia i campi hanno bisogno di fondo pieno per non sparirci dentro. */
const FIELD_CLASS = "bg-background border-border h-11 rounded-xl";

export function FindPlayersForm() {
  const form = useForm<RequestValues>({
    resolver: zodResolver(requestSchema),
    defaultValues: {
      name: "",
      phone: "",
      date: "",
      time: "",
      level: "intermedio",
      missing: "1",
    },
  });

  const onSubmit = form.handleSubmit(async () => {
    // TODO: collegare la richiesta al backend (partite aperte su Convex).
    await new Promise((resolve) => setTimeout(resolve, 700));
    toast.success("Richiesta inviata", {
      description: "Ti avvisiamo appena il match è al completo.",
    });
    form.reset();
  });

  return (
    <Form {...form}>
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
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
            control={form.control}
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
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="date"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Data</FormLabel>
                <FormControl>
                  <Input type="date" className={FIELD_CLASS} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="time"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Orario</FormLabel>
                <FormControl>
                  <Input type="time" className={FIELD_CLASS} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="level"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Livello di gioco</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger className={`w-full ${FIELD_CLASS}`}>
                      <SelectValue placeholder="Seleziona livello" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {LEVELS.map((level) => (
                      <SelectItem key={level.value} value={level.value}>
                        {level.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="missing"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Giocatori mancanti</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger className={`w-full ${FIELD_CLASS}`}>
                      <SelectValue placeholder="Quanti ne cerchi?" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {MISSING_PLAYERS.map((count) => (
                      <SelectItem key={count} value={count}>
                        {count === "1" ? "1 giocatore" : `${count} giocatori`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <Button
          type="submit"
          size="pill"
          disabled={form.formState.isSubmitting}
          className="mt-2 w-full sm:w-fit"
        >
          {form.formState.isSubmitting ? "Invio in corso…" : "Invia richiesta"}
        </Button>
      </form>
    </Form>
  );
}
