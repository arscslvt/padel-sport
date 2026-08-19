"use client";

import { useAuth, useClerk, useUser } from "@clerk/nextjs";
import { zodResolver } from "@hookform/resolvers/zod";
import { api } from "@padel-sport/backend/convex/_generated/api";
import { useAction, useMutation, useQuery } from "convex/react";
import { format } from "date-fns";
import { ArrowLeft } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { VerifyStep } from "@/components/booking/verify-step";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import {
  availableSlots,
  BOOKABLE_DAYS,
  bookableDays,
  combineDateAndTime,
  DEFAULT_WINDOWS,
  occupiedCourts,
  overlappingBlocks,
  overlappingBookings,
} from "@/lib/booking";
import {
  type BookingFormValues,
  bookingFormSchema,
  filledPartners,
  PARTNER_SLOTS,
} from "@/lib/booking-form";
import { findLevelRangeIndex, LEVEL_RANGES } from "@/lib/levels";
import { BookingOutcome } from "./booking-outcome";
import { ContactStep } from "./contact-step";
import { LevelStep } from "./level-step";
import { ScheduleStep } from "./schedule-step";
import { SquadStep } from "./squad-step";
import { SummaryStep } from "./summary-step";

/**
 * Wizard di prenotazione del sito.
 *
 * Le regole sono quelle dell'app (lib/booking.ts, allineato a
 * apps/mobile/lib/booking.ts) e la prenotazione passa dalla stessa mutation:
 * `modules/openMatches/create`. La differenza è chi la usa — qui i compagni
 * sono nomi scritti a mano, non giocatori da invitare — e come si entra: non
 * un login, ma una mail da confermare con un codice.
 *
 * La partita nasce privata: i posti liberi non finiscono fra le partite aperte
 * dell'app, li riempie il club.
 */

const TOTAL_STEPS = 5;

/** Il messaggio dentro l'errore di Convex, senza lo stack che lo accompagna. */
function convexErrorMessage(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error);
  const match = raw.match(/Uncaught Error: (.*?)(?:\n| at )/);
  return match?.[1] ?? "Non siamo riusciti a completare la prenotazione.";
}

function primaryLabel(step: number, hasTime: boolean, submitting: boolean) {
  if (submitting) return "Prenotazione in corso…";
  if (step === 1) return hasTime ? "Continua" : "Scegli un orario";
  if (step === TOTAL_STEPS) return "Conferma prenotazione";
  return "Continua";
}

export function BookingWizard() {
  const { isLoaded: authLoaded, isSignedIn } = useAuth();
  const { user } = useUser();
  const { signOut } = useClerk();

  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [outcome, setOutcome] = useState<{
    code: string;
    squadSize: number;
  } | null>(null);

  const player = useQuery(
    api.modules.openMatches.players.me,
    isSignedIn ? {} : "skip",
  );
  const createBooking = useMutation(api.modules.openMatches.create.default);
  const upsertProfile = useMutation(
    api.modules.openMatches.players.upsertProfile,
  );

  // Giorni e fasce arrivano dalla configurazione della struttura: finché non è
  // stata letta usiamo i valori storici, così la griglia non resta vuota.
  const settings = useQuery(api.modules.settings.booking.get, {});
  const windows = settings?.windows ?? DEFAULT_WINDOWS;

  // Il club può pretendere la squadra al completo: finché la configurazione
  // non è arrivata restiamo sul comportamento storico (si prenota anche da
  // soli), tanto la parola definitiva è del server.
  const fullSquadRequired = settings?.fullSquadRequired ?? false;

  const days = useMemo(
    () => bookableDays(settings?.bookableDays ?? BOOKABLE_DAYS),
    [settings?.bookableDays],
  );

  const range = useMemo(() => {
    const from = days[0].date.getTime();
    const last = new Date(days[days.length - 1].date);
    last.setHours(23, 59, 59, 999);
    return { from, to: last.getTime() };
  }, [days]);

  const availability = useQuery(api.bookings.availability.default, range);
  const courts = useQuery(api.slots.listActive.default);
  const availabilityLoading =
    availability === undefined || courts === undefined;

  // Le prenotazioni prese su SumUp arrivano qui da un calendario condiviso,
  // riletto ogni cinque minuti da un cron. Chiedere una rilettura appena si
  // apre la pagina accorcia a pochi secondi la finestra in cui i due sistemi
  // possono offrire lo stesso campo. Se fallisce, restano i dati dell'ultimo
  // giro riuscito: la griglia si mostra comunque.
  const refreshExternal = useAction(api.modules.courtCalendar.pull.refresh);
  useEffect(() => {
    void refreshExternal({}).catch(() => undefined);
  }, [refreshExternal]);

  const form = useForm<BookingFormValues>({
    resolver: zodResolver(bookingFormSchema),
    mode: "onTouched",
    defaultValues: {
      day: "",
      time: "",
      levelIndex: 1,
      partners: Array.from({ length: PARTNER_SLOTS }, () => ({
        name: "",
        email: "",
      })),
      name: "",
      phone: "",
      notes: "",
    },
  });

  const values = form.watch();
  const dayIndex = values.day
    ? days.findIndex((day) => format(day.date, "yyyy-MM-dd") === values.day)
    : -1;

  /**
   * Orari proponibili giorno per giorno: alle finestre di apertura togliamo
   * quelli già passati e quelli in cui tutti i campi attivi sono occupati.
   * Il controllo definitivo resta lato Convex, alla conferma.
   */
  const slotsByDay = useMemo(() => {
    return days.map((day) => {
      const slots = availableSlots(day.date, windows);
      if (availabilityLoading) return slots;

      return slots.filter((slot) => {
        const start = combineDateAndTime(day.date, slot.time);
        const overlapping = overlappingBookings(availability.busy, start);

        // Una prenotazione senza campo assegnato (righe vecchie) li blocca tutti.
        if (overlapping.some((booking) => !booking.slot)) return false;

        // Ogni appuntamento esterno toglie un campo: non sappiamo quale, ma
        // sappiamo che uno è occupato.
        const blocked = overlappingBlocks(availability.blocks, start);

        // Si contano i campi, non le prenotazioni: due gruppi uniti dalla
        // struttura ne occupano uno in due.
        return occupiedCourts(overlapping) + blocked.length < courts.length;
      });
    });
  }, [days, windows, availability, courts, availabilityLoading]);

  // Il livello del profilo suggerisce la fascia, finché non la si tocca.
  const [levelTouched, setLevelTouched] = useState(false);
  useEffect(() => {
    if (levelTouched || !player) return;
    form.setValue("levelIndex", findLevelRangeIndex(player.level));
  }, [player, levelTouched, form]);

  /**
   * Il recapito che il club ha già: prima quello della scheda cliente, poi
   * quello dell'account.
   */
  const knownPhone = player?.phone ?? user?.primaryPhoneNumber?.phoneNumber;

  // Nome e telefono arrivano da quello che il club sa già: chi prenota non
  // deve riscriverli. Il telefono però non sparisce dentro un campo — il passo
  // lo mostra e chiede conferma (contact-step.tsx), perché un numero vecchio
  // manda a vuoto la telefonata proprio quando serviva.
  useEffect(() => {
    if (!user) return;
    if (!form.getValues("name")) {
      form.setValue("name", player?.name ?? user.fullName ?? "");
    }
    if (!form.getValues("phone") && knownPhone) {
      form.setValue("phone", knownPhone);
    }
  }, [user, player, knownPhone, form]);

  // Se lo slot scelto sparisce mentre si compila, meglio dirlo subito.
  useEffect(() => {
    if (availabilityLoading || dayIndex < 0 || !values.time) return;
    const stillFree = slotsByDay[dayIndex].some(
      (slot) => slot.time === values.time,
    );
    if (!stillFree) {
      form.setValue("time", "");
      toast.info("Orario non più disponibile", {
        description: "Qualcuno ha appena prenotato: scegline un altro.",
      });
    }
  }, [availabilityLoading, dayIndex, slotsByDay, values.time, form]);

  if (!authLoaded || (isSignedIn && player === undefined)) {
    return (
      <p className="text-muted-foreground py-10 text-sm">Un attimo solo…</p>
    );
  }

  if (!isSignedIn) {
    return <VerifyStep />;
  }

  if (outcome) {
    return <BookingOutcome code={outcome.code} squadSize={outcome.squadSize} />;
  }

  const partners = filledPartners(values.partners);
  const askName = player === null;
  const bookerName = player?.name ?? values.name.trim();
  const email = user?.primaryEmailAddress?.emailAddress;

  const selectDay = (index: number) => {
    const day = days[index];
    const stillAvailable = slotsByDay[index].some(
      (slot) => slot.time === values.time,
    );

    form.setValue("day", format(day.date, "yyyy-MM-dd"), {
      shouldValidate: true,
    });
    if (!stillAvailable) form.setValue("time", "");
  };

  const goNext = async () => {
    if (step === 1) {
      const ok = await form.trigger(["day", "time"]);
      if (!ok) return;
    }

    if (step === 3) {
      const ok = await form.trigger("partners");
      if (!ok) return;

      // Squadra al completo, quando la struttura la pretende. Il controllo
      // vero è in Convex (modules/openMatches/create.ts): qui si evita solo di
      // farsi tutto il wizard per sentirselo dire alla conferma.
      if (fullSquadRequired && partners.length < PARTNER_SLOTS) {
        for (const [row, partner] of values.partners.entries()) {
          if (partner.name.trim().length > 0) continue;

          form.setError(`partners.${row}.name`, {
            message: "Serve anche il nome di questo giocatore.",
          });
        }
        return;
      }
    }

    if (step === 4) {
      const ok = await form.trigger(["phone", "notes"]);
      if (!ok) return;

      if (askName && form.getValues("name").trim().length < 3) {
        form.setError("name", {
          message: "Inserisci nome e cognome.",
        });
        return;
      }
    }

    if (step === TOTAL_STEPS) {
      await confirm();
      return;
    }

    setStep((current) => Math.min(current + 1, TOTAL_STEPS));
  };

  const confirm = async () => {
    if (submitting || dayIndex < 0) return;

    const level = LEVEL_RANGES[values.levelIndex];
    const bookingDate = combineDateAndTime(days[dayIndex].date, values.time);

    setSubmitting(true);
    try {
      // Chi arriva dal sito senza aver mai usato l'app non ha un profilo
      // giocatore: senza, la mutation non lo riconoscerebbe.
      if (!player) {
        await upsertProfile({
          name: values.name.trim(),
          level: level.level,
        });
      }

      const { matchId, code } = await createBooking({
        bookingDate,
        levelMin: level.min,
        levelMax: level.max,
        visibility: "private",
        guests: partners,
        notes: values.notes?.trim() || undefined,
        phone: values.phone,
        origin: "web",
      });

      setOutcome({ code, squadSize: 1 + partners.length });

      // Le mail non devono poter far fallire una prenotazione già scritta.
      void fetch("/api/bookings/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matchId }),
      }).catch(() => undefined);
    } catch (error) {
      const message = convexErrorMessage(error);
      toast.error("Prenotazione non riuscita", { description: message });

      // Se il campo è stato preso nel frattempo, si riparte dagli orari.
      if (message.toLowerCase().includes("disponibil")) {
        form.setValue("time", "");
        setStep(1);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void goNext();
        }}
      >
        {step === 1 && (
          <ScheduleStep
            step={1}
            totalSteps={TOTAL_STEPS}
            days={days}
            slotsByDay={slotsByDay}
            dayIndex={dayIndex < 0 ? null : dayIndex}
            time={values.time || null}
            loading={availabilityLoading}
            noCourts={!availabilityLoading && courts.length === 0}
            onSelectDay={selectDay}
            onSelectTime={(time) =>
              form.setValue("time", time, { shouldValidate: true })
            }
          />
        )}

        {step === 2 && (
          <LevelStep
            step={2}
            totalSteps={TOTAL_STEPS}
            levelIndex={values.levelIndex}
            playerLevel={player?.level}
            onSelect={(index) => {
              setLevelTouched(true);
              form.setValue("levelIndex", index);
            }}
          />
        )}

        {step === 3 && (
          <SquadStep
            step={3}
            totalSteps={TOTAL_STEPS}
            control={form.control}
            bookerName={bookerName}
            filledCount={partners.length}
            requireFull={fullSquadRequired}
          />
        )}

        {step === 4 && (
          <ContactStep
            step={4}
            totalSteps={TOTAL_STEPS}
            control={form.control}
            askName={askName}
            bookerName={bookerName}
            email={email}
            knownPhone={knownPhone}
            onUseKnownPhone={() => {
              if (knownPhone) form.setValue("phone", knownPhone);
            }}
          />
        )}

        {step === TOTAL_STEPS && dayIndex >= 0 && (
          <SummaryStep
            step={TOTAL_STEPS}
            totalSteps={TOTAL_STEPS}
            day={days[dayIndex]}
            time={values.time}
            levelIndex={values.levelIndex}
            bookerName={bookerName}
            phone={values.phone}
            notes={values.notes?.trim() || undefined}
            partners={partners}
            onEdit={setStep}
          />
        )}

        <div className="mt-8 flex flex-col gap-2.5">
          <Button
            type="submit"
            size="pill-lg"
            disabled={submitting || (step === 1 && !values.time)}
          >
            {primaryLabel(step, Boolean(values.time), submitting)}
          </Button>

          {step > 1 && (
            <Button
              type="button"
              variant="ghost"
              size="pill"
              disabled={submitting}
              onClick={() => setStep((current) => Math.max(1, current - 1))}
            >
              <ArrowLeft className="size-4" />
              Passo precedente
            </Button>
          )}
        </div>

        {email && (
          <p className="text-muted-foreground mt-6 text-center text-xs">
            Prenoti con {email} ·{" "}
            <button
              type="button"
              className="hover:text-foreground underline underline-offset-4"
              onClick={() => void signOut()}
            >
              non sei tu?
            </button>
          </p>
        )}
      </form>
    </Form>
  );
}
