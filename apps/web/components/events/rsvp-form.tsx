"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CalendarClock, Check, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

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
import {
  type EventRsvpValues,
  eventRsvpSchema,
  formatRsvpDeadline,
  guestOptions,
  guestsLabel,
  isRsvpClosed,
  seatsLabel,
  showsConfirmedCount,
} from "@/lib/event-rsvp";
import { getInfo } from "@/lib/info";
import type { EventRsvpFormBlock } from "@/sanity/types";

const FIELD_CLASS = "bg-background border-border h-11 rounded-xl";

const DEFAULT_SUCCESS =
  "Ci siamo: la tua presenza è registrata. Ti abbiamo mandato una mail di conferma.";

type Availability = { seatsTaken: number; seatsLeft: number | null };

type Props = {
  block: EventRsvpFormBlock;
  eventSlug: string;
};

/**
 * Il modulo di iscrizione che l'editor ha inserito nel corpo dell'articolo.
 *
 * I posti rimasti li chiede alla route al montaggio invece di riceverli dalla
 * pagina: la pagina è rigenerata ogni 60 secondi, e su un evento che si
 * riempie in fretta un conteggio vecchio di un minuto è peggio di nessuno.
 * Resta comunque un'indicazione — a decidere è il controllo transazionale
 * nella mutation Convex, che qui vediamo solo come messaggio d'errore.
 */
export function EventRsvpForm({ block, eventSlug }: Props) {
  const [availability, setAvailability] = useState<Availability | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  const options = guestOptions(block.maxGuests);
  const closedByDate = isRsvpClosed(block.closesAt);
  const soldOut = availability?.seatsLeft === 0;

  /*
   * Con una capienza il numero utile è quello che resta, e va detto sempre.
   * Senza, resta solo il conteggio degli iscritti, che parla a favore
   * dell'evento soltanto quando è già una piccola folla: sotto la soglia si
   * tace, non si scrive «2 posti già confermati».
   */
  const countLabel = !availability
    ? null
    : availability.seatsLeft !== null
      ? `${seatsLabel(availability.seatsLeft)} ancora disponibili`
      : showsConfirmedCount(availability.seatsTaken)
        ? `${seatsLabel(availability.seatsTaken)} già confermati`
        : null;

  const form = useForm<EventRsvpValues>({
    resolver: zodResolver(eventRsvpSchema),
    defaultValues: {
      slug: eventSlug,
      blockKey: block._key,
      name: "",
      email: "",
      guests: "0",
    },
  });

  useEffect(() => {
    if (closedByDate) return;

    const controller = new AbortController();

    fetch(
      `/api/events/rsvp?slug=${encodeURIComponent(eventSlug)}&key=${encodeURIComponent(block._key)}`,
      { signal: controller.signal },
    )
      .then((response) => (response.ok ? response.json() : null))
      .then((payload) => {
        if (payload) {
          setAvailability({
            seatsTaken: payload.seatsTaken ?? 0,
            seatsLeft: payload.seatsLeft ?? null,
          });
        }
      })
      // Senza conteggio il modulo funziona lo stesso: è un di più, non un requisito.
      .catch(() => {});

    return () => controller.abort();
  }, [eventSlug, block._key, closedByDate]);

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      const response = await fetch("/api/events/rsvp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        toast.error("Iscrizione non registrata", {
          description:
            payload?.error ?? "Riprova fra poco o scrivici direttamente.",
        });

        // Un 409 vuol dire posti esauriti o email già iscritta: in entrambi i
        // casi il conteggio che mostriamo è vecchio, conviene rinfrescarlo.
        if (response.status === 409 && typeof payload?.seatsLeft === "number") {
          setAvailability({
            seatsTaken: payload.seatsTaken ?? 0,
            seatsLeft: payload.seatsLeft,
          });
        }
        return;
      }

      setAvailability({
        seatsTaken: payload?.seatsTaken ?? 0,
        seatsLeft: payload?.seatsLeft ?? null,
      });
      setConfirmed(true);
      form.reset({
        slug: eventSlug,
        blockKey: block._key,
        name: "",
        email: "",
        guests: "0",
      });
    } catch {
      toast.error("Iscrizione non registrata", {
        description: "Controlla la connessione e riprova.",
      });
    }
  });

  return (
    <section className="not-prose bg-muted/40 border-border my-10 rounded-card border p-6 sm:p-8">
      <div className="flex flex-col gap-2">
        <span className="text-muted-foreground inline-flex items-center gap-2 text-[11px] font-medium tracking-wide uppercase">
          <Users className="size-3.5" />
          Iscrizioni
        </span>
        <h2 className="font-display text-2xl leading-tight tracking-tight sm:text-3xl">
          {block.heading || "Segnala la tua presenza"}
        </h2>
        {block.description && (
          <p className="text-muted-foreground text-pretty">
            {block.description}
          </p>
        )}

        <div className="text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
          {countLabel && <span>{countLabel}</span>}
          {block.closesAt && !closedByDate && (
            <span className="inline-flex items-center gap-1.5">
              <CalendarClock className="size-3.5" />
              Iscrizioni aperte fino al {formatRsvpDeadline(block.closesAt)}
            </span>
          )}
        </div>
      </div>

      {confirmed ? (
        <p className="border-border mt-6 flex items-start gap-3 border-t pt-6 text-sm">
          <Check className="mt-0.5 size-4 shrink-0" />
          {block.successMessage || DEFAULT_SUCCESS}
        </p>
      ) : closedByDate || soldOut ? (
        <p className="border-border text-muted-foreground mt-6 border-t pt-6 text-sm">
          {closedByDate
            ? "Le iscrizioni per questo evento sono chiuse."
            : "I posti disponibili sono esauriti. Scrivici: ti mettiamo in lista d'attesa."}
        </p>
      ) : (
        <Form {...form}>
          <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-4">
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
            </div>

            {options.length > 1 && (
              <FormField
                control={form.control}
                name="guests"
                render={({ field }) => (
                  <FormItem className="sm:max-w-xs">
                    <FormLabel>Quante persone vengono con te?</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className={`w-full ${FIELD_CLASS}`}>
                          <SelectValue placeholder="Scegli" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {options.map((count) => (
                          <SelectItem key={count} value={String(count)}>
                            {guestsLabel(count)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <Button
              type="submit"
              size="pill"
              disabled={form.formState.isSubmitting}
              className="mt-2 w-full sm:w-fit"
            >
              {form.formState.isSubmitting
                ? "Invio in corso…"
                : "Conferma la presenza"}
            </Button>

            <p className="text-muted-foreground text-xs">
              Usiamo nome ed email solo per organizzare questo evento. Puoi
              chiederne la cancellazione scrivendo a {getInfo("email")}.
            </p>
          </form>
        </Form>
      )}
    </section>
  );
}
