"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "convex/react";
import { endOfMonth, format, startOfDay, startOfMonth } from "date-fns";
import {
  CalendarDays,
  CalendarIcon,
  CircleCheckBig,
  Clock3,
  Euro,
  UsersRound,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Label } from "@/components/ui/label";
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

const bookingFormSchema = z
  .object({
    player1: z.string().min(3, "Inserisci nome e cognome del giocatore."),
    phone: z
      .string()
      .transform((value) => value.trim())
      .refine(
        (value) => /^\+?[0-9\s]{8,20}$/.test(value),
        "Inserisci un numero di telefono valido.",
      ),
    player2: z.string().optional(),
    player3: z.string().optional(),
    player4: z.string().optional(),
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
    bookForAll: z.boolean(),
  })
  .superRefine((values, ctx) => {
    if (!values.bookForAll) {
      return;
    }

    const players = [
      values.player1,
      values.player2,
      values.player3,
      values.player4,
    ];

    for (const [index, player] of players.entries()) {
      if (!player || player.trim().length < 3) {
        ctx.addIssue({
          code: "custom",
          path: [`player${index + 1}`],
          message: "Se prenoti per tutti, inserisci tutti e 4 i nomi completi.",
        });
      }
    }
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

  const form = useForm<BookingFormValues>({
    resolver: zodResolver(bookingFormSchema),
    defaultValues: {
      player1: "",
      phone: "",
      player2: "",
      player3: "",
      player4: "",
      bookingDate: undefined,
      bookingTime: "",
      level: "intermedio",
      bookForAll: false,
    },
  });

  const bookForAll = form.watch("bookForAll");
  const selectedDate = form.watch("bookingDate");
  const selectedTime = form.watch("bookingTime");

  useEffect(() => {
    if (bookForAll) {
      return;
    }

    form.setValue("player2", "", { shouldDirty: true, shouldValidate: true });
    form.setValue("player3", "", { shouldDirty: true, shouldValidate: true });
    form.setValue("player4", "", { shouldDirty: true, shouldValidate: true });
  }, [bookForAll, form]);

  const bookingsByDay = useMemo(() => {
    const map = new Map<string, number[]>();

    for (const booking of bookingsInRange ?? []) {
      const start = booking.bookingDate;
      const key = getDayKey(new Date(start));

      if (!map.has(key)) {
        map.set(key, []);
      }

      map.get(key)?.push(start);
    }

    return map;
  }, [bookingsInRange]);

  const getAvailableSlots = useCallback(
    (date?: Date) => {
      if (!date) {
        return [];
      }

      const dayBookings = bookingsByDay.get(getDayKey(date)) ?? [];

      return DAILY_SLOTS.filter((slot) => {
        const candidateStart = combineDateAndTime(date, slot);
        const candidateEnd = candidateStart + MATCH_DURATION_MS;

        if (candidateStart <= Date.now()) {
          return false;
        }

        return !dayBookings.some((bookingStart) => {
          const bookingEnd = bookingStart + MATCH_DURATION_MS;
          return bookingStart < candidateEnd && bookingEnd > candidateStart;
        });
      });
    },
    [bookingsByDay],
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

  const totalPlayers = useMemo(() => {
    if (bookForAll) {
      return 4;
    }

    const optionalPlayers = [
      form.watch("player2"),
      form.watch("player3"),
      form.watch("player4"),
    ]
      .map((name) => name?.trim() ?? "")
      .filter(Boolean).length;

    return 1 + optionalPlayers;
  }, [bookForAll, form]);

  const onSubmit = form.handleSubmit(async (values) => {
    const players = [
      values.player1,
      values.player2,
      values.player3,
      values.player4,
    ]
      .map((name) => name?.trim() ?? "")
      .filter(Boolean);

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
          bookedBy: values.player1.trim(),
          phone: values.phone,
          players,
          bookingDate,
          level: values.level,
          bookForAll: values.bookForAll,
        },
      });

      setBookingCompleted(true);
      form.reset({
        player1: "",
        phone: "",
        player2: "",
        player3: "",
        player4: "",
        bookingDate: undefined,
        bookingTime: "",
        level: "intermedio",
        bookForAll: false,
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

      <div className="mx-auto grid w-full max-w-5xl gap-6 lg:grid-cols-[1.1fr_1fr]">
        <Form {...form}>
          <form className="space-y-5" onSubmit={onSubmit}>
            <h2 className="font-heading text-2xl text-white md:text-3xl">
              Prenota il tuo campo
            </h2>
            <p className="text-emerald-50/80">
              Inserisci i dati del giocatore. Se prenoti per la squadra
              completa, compila tutti e 4 i nomi.
            </p>
            <FormField
              control={form.control}
              name="player1"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome e cognome giocatore</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Es. Mario Rossi"
                      autoComplete="name"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Questo campo e sempre obbligatorio.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

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

            <FormField
              control={form.control}
              name="bookForAll"
              render={({ field }) => (
                <FormItem className="rounded-lg border border-emerald-200/20 bg-emerald-900/15 p-3">
                  <div className="flex items-center gap-3">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={(checked) =>
                          field.onChange(Boolean(checked))
                        }
                        className="border-emerald-200/50 data-[state=checked]:bg-emerald-400 data-[state=checked]:text-emerald-950"
                      />
                    </FormControl>
                    <Label>Prenoto per tutti e 4 i giocatori</Label>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {bookForAll ? (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <FormField
                  control={form.control}
                  name="player2"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Giocatore 2</FormLabel>
                      <FormControl>
                        <Input placeholder="Nome e cognome" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="player3"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Giocatore 3</FormLabel>
                      <FormControl>
                        <Input placeholder="Nome e cognome" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="player4"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Giocatore 4</FormLabel>
                      <FormControl>
                        <Input placeholder="Nome e cognome" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            ) : null}

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
                      {form.watch("bookForAll")
                        ? "Indica il livello medio del gruppo."
                        : "Indica il tuo livello di gioco. Verrà usato per abbinarti a giocatori di livello simile."}
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
