"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { ArrowLeft } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { useCourtAvailability } from "@/hooks/use-court-availability";
import { formatDayLong, formatSlotRange } from "@/lib/booking";
import {
  levelLabel,
  type MatchRequestValues,
  matchRequestSchema,
  missingPlayersLabel,
} from "@/lib/match-request";
import { ContactStep } from "./contact-step";
import { PlayersStep } from "./players-step";
import { RequestSent } from "./request-sent";
import { ScheduleStep } from "./schedule-step";
import { SummaryStep } from "./summary-step";

/**
 * «Cerco giocatori», un passo per volta.
 *
 * Era un modulo solo con otto campi aperti tutti insieme: chi non conosceva
 * già il flusso doveva decidere da dove cominciare. Ora l'ordine è quello
 * della domanda — chi cerchi, per quando, chi sei — e ogni schermata ne fa una.
 *
 * Niente è preselezionato, nemmeno il livello: quello che arriva al club è
 * quello che ha scelto chi scrive. La soglia — il tasto che fa comparire tutto
 * questo — sta un livello sopra, in `panel.tsx`.
 *
 * Giorni e orari sono quelli veri: `useCourtAvailability` è la stessa lettura
 * che alimenta /book, quindi qui non compaiono fasce in cui i campi sono già
 * tutti occupati. La richiesta però non prenota niente — il campo lo blocca il
 * club quando la squadra è al completo.
 */

const TOTAL_STEPS = 4;

function primaryLabel({
  step,
  hasMissing,
  hasLevel,
  hasTime,
  submitting,
}: {
  step: number;
  hasMissing: boolean;
  hasLevel: boolean;
  hasTime: boolean;
  submitting: boolean;
}) {
  if (submitting) return "Invio in corso…";

  if (step === 1) {
    if (!hasMissing) return "Scegli quanti ne cerchi";
    if (!hasLevel) return "Scegli il livello";
  }

  if (step === 2 && !hasTime) return "Scegli un orario";
  if (step === TOTAL_STEPS) return "Invia richiesta";

  return "Continua";
}

export function FindPlayersWizard({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState<{
    summary: string;
    notified: boolean;
  } | null>(null);

  const { days, slotsByDay, loading, noCourts } = useCourtAvailability();

  const form = useForm<MatchRequestValues>({
    resolver: zodResolver(matchRequestSchema),
    mode: "onTouched",
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      date: "",
      time: "",
      notes: "",
    },
  });

  const values = form.watch();

  // `missing` e `level` nascono senza valore: i tipi dello schema li danno per
  // sempre presenti, qui li riportiamo a come stanno davvero prima del passo 1.
  const missing = values.missing || undefined;
  const level = values.level || undefined;

  const dayIndex = values.date
    ? days.findIndex((day) => format(day.date, "yyyy-MM-dd") === values.date)
    : -1;

  // Se l'orario scelto viene prenotato da qualcun altro mentre si compila,
  // meglio dirlo subito che far partire una richiesta senza campo.
  useEffect(() => {
    if (loading || dayIndex < 0 || !values.time) return;

    const stillFree = slotsByDay[dayIndex].some(
      (slot) => slot.time === values.time,
    );

    if (!stillFree) {
      form.setValue("time", "");
      toast.info("Orario non più disponibile", {
        description: "Qualcuno ha appena prenotato: scegline un altro.",
      });
    }
  }, [loading, dayIndex, slotsByDay, values.time, form]);

  const selectDay = (index: number) => {
    const stillAvailable = slotsByDay[index].some(
      (slot) => slot.time === values.time,
    );

    form.setValue("date", format(days[index].date, "yyyy-MM-dd"), {
      shouldValidate: true,
    });
    if (!stillAvailable) form.setValue("time", "");
  };

  const send = form.handleSubmit(async (data) => {
    if (dayIndex < 0) return;

    setSubmitting(true);
    try {
      const response = await fetch("/api/match-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        toast.error("Richiesta non inviata", {
          description:
            payload?.error ?? "Riprova fra poco o chiamaci direttamente.",
        });
        return;
      }

      setSent({
        summary: `${missingPlayersLabel(Number(data.missing))} per ${formatDayLong(
          days[dayIndex].date,
        ).toLowerCase()}, ${formatSlotRange(data.time)} · livello ${levelLabel(
          data.level,
        ).toLowerCase()}`,
        notified: Boolean(payload?.notified),
      });
    } catch {
      toast.error("Richiesta non inviata", {
        description: "Controlla la connessione e riprova.",
      });
    } finally {
      setSubmitting(false);
    }
  });

  const goNext = async () => {
    if (step === 2) {
      const ok = await form.trigger(["date", "time"]);
      if (!ok) return;
    }

    if (step === 3) {
      const ok = await form.trigger(["name", "email", "phone"]);
      if (!ok) return;
    }

    if (step === TOTAL_STEPS) {
      await send();
      return;
    }

    setStep((current) => Math.min(current + 1, TOTAL_STEPS));
  };

  if (sent) {
    return (
      <RequestSent
        summary={sent.summary}
        notified={sent.notified}
        onReset={() => {
          form.reset();
          setSent(null);
          setStep(1);
        }}
      />
    );
  }

  return (
    <Form {...form}>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void goNext();
        }}
      >
        {step === 1 && (
          <PlayersStep
            step={1}
            totalSteps={TOTAL_STEPS}
            missing={missing}
            level={level}
            onSelectMissing={(next) => form.setValue("missing", next)}
            onSelectLevel={(next) => form.setValue("level", next)}
          />
        )}

        {step === 2 && (
          <ScheduleStep
            step={2}
            totalSteps={TOTAL_STEPS}
            days={days}
            slotsByDay={slotsByDay}
            dayIndex={dayIndex < 0 ? null : dayIndex}
            time={values.time || null}
            loading={loading}
            noCourts={noCourts}
            onSelectDay={selectDay}
            onSelectTime={(time) =>
              form.setValue("time", time, { shouldValidate: true })
            }
          />
        )}

        {step === 3 && (
          <ContactStep
            step={3}
            totalSteps={TOTAL_STEPS}
            control={form.control}
          />
        )}

        {step === TOTAL_STEPS && dayIndex >= 0 && missing && level && (
          <SummaryStep
            step={TOTAL_STEPS}
            totalSteps={TOTAL_STEPS}
            control={form.control}
            day={days[dayIndex]}
            time={values.time}
            missing={missing}
            level={level}
            name={values.name}
            email={values.email}
            phone={values.phone}
            onEdit={setStep}
          />
        )}

        <div className="mt-8 flex flex-col gap-2.5">
          <Button
            type="submit"
            size="pill-lg"
            disabled={
              submitting ||
              (step === 1 && (!missing || !level)) ||
              (step === 2 && !values.time)
            }
          >
            {primaryLabel({
              step,
              hasMissing: Boolean(missing),
              hasLevel: Boolean(level),
              hasTime: Boolean(values.time),
              submitting,
            })}
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="pill"
            disabled={submitting}
            onClick={() =>
              step === 1
                ? onClose()
                : setStep((current) => Math.max(1, current - 1))
            }
          >
            <ArrowLeft className="size-4" />
            {step === 1 ? "Annulla" : "Passo precedente"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
