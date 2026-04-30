"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useAction, useMutation, useQuery } from "convex/react";
import { endOfMonth, format, startOfDay, startOfMonth } from "date-fns";
import {
  CalendarDays,
  CalendarIcon,
  CircleCheckBig,
  Clock3,
  Euro,
  Plus,
  UsersRound,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
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
import { Calendar } from "@/components/ui/calendar";
import { api } from "@/convex/_generated/api";
import { cn } from "@/lib/utils";

const LEVELS = ["principiante", "intermedio", "avanzato"] as const;

const SLOT_INTERVAL_MINUTES = 30;
const MATCH_DURATION_MINUTES = 90;
const PLAY_WINDOWS = [
  { start: "09:00", end: "12:30" },
  { start: "14:30", end: "21:30" },
] as const;

const MATCH_DURATION_MS = MATCH_DURATION_MINUTES * 60 * 1000;

const bookingFormSchema = z.object({
  players: z
    .array(
      z.object({
        name: z
          .string()
          .trim()
          .min(3, "Inserisci nome e cognome completo del giocatore."),
      }),
    )
    .min(1, "Aggiungi almeno un giocatore."),
  phone: z
    .string()
    .transform((value) => value.trim())
    .refine(
      (value) => /^\+?[0-9\s]{8,20}$/.test(value),
      "Inserisci un numero di telefono valido.",
    ),
  bookingDate: z.date({ error: "Seleziona la data della prenotazione." }),
  bookingTime: z
    .string()
    .transform((value) => value.trim())
    .refine(
      (value) => /^([01]\d|2[0-3]):(00|30)$/.test(value),
      "Seleziona un orario valido.",
    ),
  level: z.enum(LEVELS, {
    error: "Seleziona il livello di gioco.",
  }),
});

type BookingFormValues = z.infer<typeof bookingFormSchema>;

function toMinutes(time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function getDayKey(date: Date) {
  return format(date, "yyyy-MM-dd");
}

function combineDateAndTime(date: Date, time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  const next = new Date(date);
  next.setHours(hours, minutes, 0, 0);
  return next.getTime();
}

function getDailySlotTimes() {
  const slots: string[] = [];

  for (const window of PLAY_WINDOWS) {
    const startMinutes = toMinutes(window.start);
    const endMinutes = toMinutes(window.end);

    for (
      let current = startMinutes;
      current + MATCH_DURATION_MINUTES <= endMinutes;
      current += SLOT_INTERVAL_MINUTES
    ) {
      const hours = String(Math.floor(current / 60)).padStart(2, "0");
      const minutes = String(current % 60).padStart(2, "0");
      slots.push(`${hours}:${minutes}`);
    }
  }

  return slots;
}

const DAILY_SLOTS = getDailySlotTimes();

export default function BookPage() {
  const createBooking = useMutation(api.bookings.create.default);
  const [bookingCompleted, setBookingCompleted] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState(new Date());

  const rangeFrom = useMemo(() => {
    const monthStart = startOfDay(startOfMonth(visibleMonth));
    return monthStart.getTime();
  }, [visibleMonth]);

  const rangeTo = useMemo(() => {
    const monthEnd = endOfMonth(visibleMonth);
    const end = new Date(monthEnd);
    end.setHours(23, 59, 59, 999);
    return end.getTime();
  }, [visibleMonth]);

  const bookingsInRange = useQuery(api.bookings.listRange.default, {
    from: rangeFrom,
    to: rangeTo,
  });

  const activeSlots = useQuery(api.slots.listActive.default);

  const form = useForm<BookingFormValues>({
    resolver: zodResolver(bookingFormSchema),
    defaultValues: {
      players: [],
      phone: "",
      bookingDate: undefined,
      bookingTime: "",
      level: "intermedio",
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "players",
  });

  const selectedDate = form.watch("bookingDate");
  const selectedTime = form.watch("bookingTime");

  // Garantisce che ci sia sempre almeno un campo giocatore
  useEffect(() => {
    if (fields.length === 0) {
      append({ name: "" });
    }
  }, [fields.length, append]);

  const bookingsByDay = useMemo(() => {
    const map = new Map<
      string,
      Array<{ bookingDate: number; slot?: string }>
    >();

    for (const booking of bookingsInRange ?? []) {
      const key = getDayKey(new Date(booking.bookingDate));

      if (!map.has(key)) {
        map.set(key, []);
      }

      map.get(key)?.push({
        bookingDate: booking.bookingDate,
        slot: booking.slot,
      });
    }

    return map;
  }, [bookingsInRange]);

  const getAvailableSlots = useCallback(
    (date?: Date) => {
      if (!date) {
        return [];
      }

      const dayBookings = bookingsByDay.get(getDayKey(date)) ?? [];
      const activeSlotCount = activeSlots?.length ?? 0;

      if (activeSlotCount === 0) {
        return [];
      }

      return DAILY_SLOTS.filter((slot) => {
        const candidateStart = combineDateAndTime(date, slot);
        const candidateEnd = candidateStart + MATCH_DURATION_MS;

        if (candidateStart <= Date.now()) {
          return false;
        }

        const overlappingBookings = dayBookings.filter((booking) => {
          const bookingEnd = booking.bookingDate + MATCH_DURATION_MS;

          return (
            booking.bookingDate < candidateEnd && bookingEnd > candidateStart
          );
        });

        if (overlappingBookings.some((booking) => !booking.slot)) {
          return false;
        }

        const occupiedSlots = overlappingBookings.length;

        return occupiedSlots < activeSlotCount;
      });
    },
    [activeSlots, bookingsByDay],
  );

  const availableSlots = useMemo(
    () => getAvailableSlots(selectedDate),
    [selectedDate, getAvailableSlots],
  );

  useEffect(() => {
    if (!selectedTime) {
      return;
    }

    if (!availableSlots.includes(selectedTime)) {
      form.setValue("bookingTime", "", { shouldValidate: true });
    }
  }, [availableSlots, form, selectedTime]);

  const playersArray = form.watch("players");

  const totalPlayers = useMemo(() => {
    return playersArray.filter((player) => player.name?.trim().length > 0)
      .length;
  }, [playersArray]);

  const bookForAll = useMemo(() => {
    const validPlayers = playersArray.filter(
      (player) => player.name?.trim().length > 0,
    );
    return validPlayers.length === 4;
  }, [playersArray]);

  const onSubmit = form.handleSubmit(async (values) => {
    const players = values.players.filter(
      (player) => player.name?.trim().length > 0,
    );

    const bookingDate = combineDateAndTime(
      values.bookingDate,
      values.bookingTime,
    );

    if (!getAvailableSlots(values.bookingDate).includes(values.bookingTime)) {
      toast.error("Orario non disponibile", {
        description:
          "Lo slot selezionato non e piu libero. Seleziona un altro orario.",
      });
      return;
    }

    try {
      await createBooking({
        booking: {
          bookedBy: players[0].name,
          phone: values.phone,
          players: players.map((p) => p.name),
          bookingDate,
          level: values.level,
          bookForAll,
        },
      });

      setBookingCompleted(true);
      form.reset({
        players: [{ name: "" }],
        phone: "",
        bookingDate: undefined,
        bookingTime: "",
        level: "intermedio",
      });

      toast.success("Richiesta prenotazione inviata", {
        description:
          "La prenotazione non e ancora confermata. Riceverai un messaggio dalla struttura se lo slot sara disponibile.",
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Errore durante la prenotazione.";
      toast.error("Impossibile completare la prenotazione", {
        description: errorMessage,
      });
    }
  });

  return (
    <section className="isolate min-h-[75vh] px-4 pt-4 py-b-14 text-white md:px-8">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_5%_20%,rgba(16,185,129,0.24),transparent_28%),radial-gradient(circle_at_95%_0%,rgba(16,185,129,0.16),transparent_24%),linear-gradient(180deg,rgba(6,78,59,0.16),rgba(2,6,23,0.92))]" />

      <div className="mx-auto grid w-full max-w-6xl gap-6 md:gap-12 lg:grid-cols-[1.1fr_1fr]">
        <Form {...form}>
          <form className="space-y-5" onSubmit={onSubmit}>
            <h2 className="font-heading text-2xl text-white md:text-3xl">
              Prenota il tuo campo
            </h2>
            <p className="text-emerald-50/80">
              Inserisci i nomi dei giocatori. Puoi aggiungere più giocatori
              usando il pulsante "Aggiungi giocatore".
            </p>

            <div className="space-y-3">
              {fields.map((field, index) => (
                <FormField
                  key={field.id}
                  control={form.control}
                  name={`players.${index}`}
                  render={({ field: fieldProps }) => (
                    <FormItem>
                      <FormLabel>
                        {index === 0
                          ? "Nome e cognome giocatore"
                          : `Giocatore ${index + 1}`}
                      </FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            placeholder="Es. Mario Rossi"
                            autoComplete="off"
                            value={fieldProps.value?.name ?? ""}
                            onChange={(e) =>
                              fieldProps.onChange({
                                ...(fieldProps.value ?? {}),
                                name: e.target.value,
                              })
                            }
                            onBlur={fieldProps.onBlur}
                            name={fieldProps.name}
                            ref={fieldProps.ref}
                          />
                          {index > 0 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="absolute size-6 rounded-full right-1.5 top-1/2 -translate-y-1/2 opacity-50 hover:opacity-100"
                              onClick={() => remove(index)}
                            >
                              <X className="size-4" />
                            </Button>
                          )}
                        </div>
                      </FormControl>
                      {index === 0 && (
                        <FormDescription>
                          Inserisci il tuo nome completo (colui che prenota).
                        </FormDescription>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ))}
            </div>

            {form.watch("players").length < 4 && (
              <Button
                type="button"
                variant="outline"
                onClick={() => append({ name: "" })}
                className="border-emerald-200/20 hover:bg-emerald-900/20"
              >
                <Plus />
                Aggiungi giocatore
              </Button>
            )}

            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Numero di telefono</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Es. +39 333 1234567"
                      autoComplete="tel"
                      inputMode="tel"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Ti contatteremo per confermare o meno la disponibilita dello
                    slot richiesto.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <FormField
                control={form.control}
                name="bookingDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data di prenotazione</FormLabel>
                    <FormControl>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start bg-transparent text-left font-normal text-white hover:bg-emerald-900/20 hover:text-white",
                              !field.value && "text-white/65",
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {field.value ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>Seleziona una data</span>
                            )}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={(nextDate) => {
                              field.onChange(nextDate);
                              form.setValue("bookingTime", "", {
                                shouldValidate: true,
                              });
                            }}
                            month={visibleMonth}
                            onMonthChange={setVisibleMonth}
                            disabled={(date) =>
                              date < startOfDay(new Date()) ||
                              getAvailableSlots(date).length === 0
                            }
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="bookingTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Orario</FormLabel>
                    <FormControl>
                      <Select
                        value={field.value}
                        onValueChange={(value) => {
                          form.setValue("bookingTime", value, {
                            shouldDirty: true,
                            shouldTouch: true,
                            shouldValidate: true,
                          });
                        }}
                        disabled={!selectedDate || availableSlots.length === 0}
                      >
                        <SelectTrigger className="w-full min-w-0 bg-transparent text-white">
                          <SelectValue
                            placeholder={
                              selectedDate
                                ? "Seleziona un orario"
                                : "Scegli prima la data"
                            }
                          />
                        </SelectTrigger>
                        <SelectContent
                          position="popper"
                          side="bottom"
                          align="start"
                          sideOffset={6}
                        >
                          {availableSlots.map((slot) => (
                            <SelectItem key={slot} value={slot}>
                              {slot}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
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
                    <FormControl>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <SelectTrigger className="w-full min-w-0 bg-transparent text-white">
                          <SelectValue placeholder="Seleziona livello" />
                        </SelectTrigger>
                        <SelectContent>
                          {LEVELS.map((level) => (
                            <SelectItem key={level} value={level}>
                              {level.charAt(0).toUpperCase() + level.slice(1)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormDescription>
                      Indica il livello di gioco dei tuoi giocatori.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Button
              type="submit"
              className="h-11 w-full rounded-full bg-emerald-400 font-heading text-emerald-950 hover:bg-emerald-300"
              disabled={form.formState.isSubmitting}
            >
              {form.formState.isSubmitting
                ? "Invio prenotazione..."
                : "Conferma prenotazione"}
            </Button>
          </form>
        </Form>

        <div className="space-y-4">
          <Alert className="border-emerald-200/20 bg-emerald-900/20 text-white">
            <Euro className="text-emerald-300" />
            <AlertTitle>Costo accesso campo</AlertTitle>
            <AlertDescription>
              L&apos;accesso al campo costa 7 euro per giocatore.
            </AlertDescription>
          </Alert>

          <Alert className="border-emerald-200/20 bg-emerald-900/20 text-white">
            <CircleCheckBig className="text-emerald-300" />
            <AlertTitle>Pagamento in struttura</AlertTitle>
            <AlertDescription>
              Dopo la prenotazione, il pagamento verra effettuato direttamente
              in struttura.
            </AlertDescription>
          </Alert>

          <Card className="border-emerald-200/15 bg-emerald-950/35 text-white shadow-lg shadow-black/25">
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2 text-emerald-100">
                <UsersRound className="size-4" />
                <p>
                  Giocatori attuali nel modulo: <strong>{totalPlayers}</strong>
                </p>
              </div>
              <div className="flex items-center gap-2 text-emerald-100">
                <CalendarDays className="size-4" />
                <p>Le prenotazioni sono gestite in ordine di ricezione.</p>
              </div>
              <div className="flex items-center gap-2 text-emerald-100">
                <Clock3 className="size-4" />
                <p>Ogni partita dura 1h 30m e gli slot sono ogni 30 minuti.</p>
              </div>
            </CardContent>
          </Card>

          {bookingCompleted ? (
            <Alert className="border-emerald-200/20 bg-emerald-500/15 text-white">
              <CircleCheckBig className="text-emerald-300" />
              <AlertTitle>Richiesta ricevuta (non confermata)</AlertTitle>
              <AlertDescription>
                Riceverai un messaggio dalla struttura se lo slot richiesto sara
                disponibile. Il pagamento avverra in struttura solo dopo
                conferma.
              </AlertDescription>
            </Alert>
          ) : null}
        </div>
      </div>
    </section>
  );
}
