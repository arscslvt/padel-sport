"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { format, parse, startOfDay } from "date-fns";
import { it } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  LEVELS,
  MATCH_TIME_SLOTS,
  type MatchRequestValues,
  MISSING_PLAYERS,
  matchRequestSchema,
} from "@/lib/match-request";
import { cn } from "@/lib/utils";

/** Su superficie grigia i campi hanno bisogno di fondo pieno per non sparirci dentro. */
const FIELD_CLASS = "bg-background border-border h-11 rounded-xl";

export function FindPlayersForm() {
  const form = useForm<MatchRequestValues>({
    resolver: zodResolver(matchRequestSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      date: "",
      time: "",
      level: "intermedio",
      missing: "1",
      notes: "",
    },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      const response = await fetch("/api/match-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        toast.error("Richiesta non inviata", {
          description:
            payload?.error ?? "Riprova fra poco o chiamaci direttamente.",
        });
        return;
      }

      toast.success("Richiesta inviata", {
        description: payload?.notified
          ? "Ti abbiamo mandato una copia via email. Ti avvisiamo appena il match è al completo."
          : "Ti avvisiamo appena il match è al completo.",
      });
      form.reset();
    } catch {
      toast.error("Richiesta non inviata", {
        description: "Controlla la connessione e riprova.",
      });
    }
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
            render={({ field }) => {
              const selected = field.value
                ? parse(field.value, "yyyy-MM-dd", new Date())
                : undefined;

              return (
                <FormItem>
                  <FormLabel>Data</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          type="button"
                          variant="outline"
                          className={cn(
                            FIELD_CLASS,
                            "w-full justify-start px-3 font-normal",
                            !selected && "text-muted-foreground",
                          )}
                        >
                          <CalendarIcon className="text-muted-foreground size-4" />
                          {selected
                            ? format(selected, "d MMMM yyyy", { locale: it })
                            : "Scegli una data"}
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        locale={it}
                        selected={selected}
                        onSelect={(next) =>
                          field.onChange(next ? format(next, "yyyy-MM-dd") : "")
                        }
                        disabled={{ before: startOfDay(new Date()) }}
                        autoFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              );
            }}
          />

          <FormField
            control={form.control}
            name="time"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Orario</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger className={`w-full ${FIELD_CLASS}`}>
                      <SelectValue placeholder="Scegli un orario" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {MATCH_TIME_SLOTS.map((slot) => (
                      <SelectItem key={slot} value={slot}>
                        {slot}
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

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Note{" "}
                <span className="text-muted-foreground font-normal">
                  (facoltative)
                </span>
              </FormLabel>
              <FormControl>
                <Textarea
                  rows={3}
                  placeholder="Qualcosa che dovremmo sapere?"
                  className="bg-background border-border min-h-24 rounded-xl"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

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
