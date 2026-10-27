"use client";

import {
  CheckIcon,
  WarningCircleIcon,
  XIcon,
} from "@phosphor-icons/react/dist/ssr";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useSearchParams } from "next/navigation";
import { type FormEvent, Suspense, useEffect, useId, useState } from "react";

import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioPill } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import {
  COURT_RANGES,
  type DemoRequestErrors,
  demoRequestSchema,
  fieldErrors,
} from "@/lib/demo-request";
import { BLUR, DURATION, EASE_OUT } from "@/lib/motion";
import {
  choiceLabel,
  PLAN_CHOICES,
  type PlanChoice,
  PROMO,
  TRIAL,
} from "@/lib/plans";

type Status = "idle" | "sending" | "sent" | "error";

const swap = {
  initial: { opacity: 0, filter: BLUR.soft, transform: "translateY(6px)" },
  animate: { opacity: 1, filter: BLUR.none, transform: "translateY(0px)" },
  exit: { opacity: 0, filter: BLUR.soft, transform: "translateY(-6px)" },
  transition: { duration: DURATION.ui, ease: EASE_OUT },
} as const;

/**
 * Il modulo della demo.
 *
 * Le etichette stanno sopra i campi, gli errori sotto, in parole: niente
 * campi rossi senza spiegazione. Si valida all'invio, poi ogni campo si
 * corregge mentre lo si riscrive. Il tasto dice cosa sta succedendo senza
 * cambiare misura, e a invio riuscito il modulo lascia il posto alla
 * conferma con lo stesso velo di blur dei componenti di prodotto.
 */
export function DemoForm() {
  const id = useId();
  const reduce = useReducedMotion();
  const [status, setStatus] = useState<Status>("idle");
  const [errors, setErrors] = useState<DemoRequestErrors>({});
  const [courts, setCourts] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [plan, setPlan] = useState<PlanChoice | null>(null);
  const [promoCode, setPromoCode] = useState("");
  // Il tasto dice cosa succede: con la prova scelta la si inizia, altrimenti
  // si chiede la demo. Le due cose sono lo stesso modulo.
  const submitLabel =
    plan === TRIAL.id ? "Inizia la prova gratuita" : "Richiedi una demo";

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const values = {
      name: String(form.get("name") ?? ""),
      club: String(form.get("club") ?? ""),
      city: String(form.get("city") ?? ""),
      email: String(form.get("email") ?? ""),
      phone: String(form.get("phone") ?? ""),
      courts: courts ?? "",
      message: String(form.get("message") ?? ""),
      website: String(form.get("website") ?? ""),
      plan: plan ?? undefined,
      promoCode: promoCode.trim() || undefined,
    };

    const parsed = demoRequestSchema.safeParse(values);
    if (!parsed.success) {
      const next = fieldErrors(parsed.error);
      setErrors(next);
      // Il fuoco va sul primo campo sbagliato: chi usa la tastiera o uno
      // screen reader arriva dritto a cosa correggere.
      const first = Object.keys(next)[0];
      event.currentTarget
        .querySelector<HTMLElement>(
          `[name="${first}"], [data-field="${first}"] [role="radio"]`,
        )
        ?.focus();
      return;
    }

    setErrors({});
    setStatus("sending");
    try {
      const response = await fetch("/api/demo-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      if (!response.ok) throw new Error(String(response.status));
      setEmail(parsed.data.email);
      setStatus("sent");
    } catch {
      setStatus("error");
    }
  }

  const clear = (name: keyof DemoRequestErrors) => {
    if (errors[name]) setErrors(({ [name]: _, ...rest }) => rest);
  };

  return (
    <>
      {/* Il piano arriva nell'indirizzo (`/?plan=complete#demo`), anche
          quando ci si arriva da un tasto della stessa pagina: per questo si
          ascolta l'indirizzo invece di leggerlo una volta sola. Sta in un
          Suspense suo, così il modulo resta nella pagina statica. */}
      <Suspense fallback={null}>
        <PlanFromUrl onPlan={setPlan} onCode={setPromoCode} />
      </Suspense>
      <AnimatePresence mode="popLayout" initial={false}>
        {status === "sent" ? (
          <motion.div
            key="sent"
            aria-live="polite"
            initial={
              reduce
                ? { opacity: 0 }
                : { opacity: 0, filter: BLUR.reveal, transform: "scale(0.97)" }
            }
            animate={{ opacity: 1, filter: BLUR.none, transform: "scale(1)" }}
            transition={{ duration: 0.6, ease: EASE_OUT }}
            className="flex min-h-[20rem] flex-col items-start justify-center sm:concentric sm:min-h-[28rem] sm:border sm:border-border sm:bg-card [--inner:1.5rem] [--pad:1.5rem]"
          >
            <motion.span
              initial={reduce ? false : { opacity: 0, transform: "scale(0.6)" }}
              animate={{ opacity: 1, transform: "scale(1)" }}
              transition={{
                type: "spring",
                duration: 0.5,
                bounce: 0.3,
                delay: 0.15,
              }}
              className="grid size-12 place-content-center rounded-full bg-primary text-primary-foreground"
            >
              <CheckIcon aria-hidden weight="bold" className="size-6" />
            </motion.span>
            <p className="mt-6 font-display text-[2.4rem] leading-tight">
              Richiesta inviata.
            </p>
            <p className="mt-2 max-w-[36ch] text-[15px] leading-relaxed text-muted-foreground">
              Ti scriviamo a {email} per fissare la demo.
            </p>
          </motion.div>
        ) : (
          <motion.form
            key="form"
            noValidate
            onSubmit={onSubmit}
            exit={{
              opacity: 0,
              filter: BLUR.soft,
              transform: "scale(0.98)",
              transition: { duration: 0.22 },
            }}
            // Da telefono il modulo poggia sulla banda verde, senza una scheda
            // sua, come sul sito del club. Da sm è una scheda di raggio 48:
            // il tasto d'invio e la pillola del piano (raggio 24) ne occupano
            // gli angoli a 24px dai lati.
            className="sm:concentric sm:border sm:border-border sm:bg-card [--inner:1.5rem] [--pad:1.5rem]"
          >
            <AnimatePresence initial={false}>
              {plan && (
                <motion.div
                  key="plan"
                  {...swap}
                  className="mb-6 flex h-12 items-center justify-between gap-3 rounded-full border border-border bg-[oklch(1_0_0/5%)] pr-2 pl-5"
                >
                  <p className="text-[14px]">
                    <span className="text-muted-foreground">Piano scelto </span>
                    <span className="font-semibold">{choiceLabel(plan)}</span>
                  </p>
                  <button
                    type="button"
                    onClick={() => setPlan(null)}
                    aria-label="Togli il piano scelto"
                    className="grid size-8 place-content-center rounded-full text-muted-foreground outline-none transition-[color,background-color,transform] duration-160 hover:bg-foreground/8 hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring active:scale-[0.94]"
                  >
                    <XIcon aria-hidden weight="bold" className="size-3.5" />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <TextField
                id={id}
                name="name"
                label="Nome e cognome"
                autoComplete="name"
                error={errors.name}
                onInput={() => clear("name")}
                className="sm:col-span-2"
              />
              <TextField
                id={id}
                name="club"
                label="Club"
                autoComplete="organization"
                error={errors.club}
                onInput={() => clear("club")}
              />
              <TextField
                id={id}
                name="city"
                label="Città"
                autoComplete="address-level2"
                error={errors.city}
                onInput={() => clear("city")}
              />
              <TextField
                id={id}
                name="email"
                type="email"
                label="Email"
                autoComplete="email"
                placeholder="nome@club.it"
                error={errors.email}
                onInput={() => clear("email")}
              />
              <TextField
                id={id}
                name="phone"
                type="tel"
                label="Telefono"
                hint="Facoltativo. Se preferisci una chiamata."
                autoComplete="tel"
                placeholder="+39 333 123 4567"
                error={errors.phone}
                onInput={() => clear("phone")}
              />

              <Field
                data-field="courts"
                data-invalid={!!errors.courts}
                className="sm:col-span-2"
              >
                <FieldLabel id={`${id}-courts`}>
                  Quanti campi ha il club
                </FieldLabel>
                <RadioGroup
                  aria-labelledby={`${id}-courts`}
                  aria-invalid={!!errors.courts}
                  value={courts}
                  onValueChange={(value) => {
                    setCourts(value as string);
                    clear("courts");
                  }}
                >
                  {COURT_RANGES.map((range) => (
                    <RadioPill
                      key={range}
                      value={range}
                      aria-invalid={!!errors.courts}
                    >
                      {range}
                    </RadioPill>
                  ))}
                </RadioGroup>
                <FieldError>{errors.courts}</FieldError>
              </Field>

              <Field
                data-invalid={!!errors.promoCode}
                className="sm:col-span-2"
              >
                <FieldLabel htmlFor={`${id}-promoCode`}>
                  Codice di invito{" "}
                  <span className="font-normal text-muted-foreground">
                    (facoltativo)
                  </span>
                </FieldLabel>
                <Input
                  id={`${id}-promoCode`}
                  name="promoCode"
                  value={promoCode}
                  onChange={(event) => {
                    setPromoCode(event.target.value.toUpperCase());
                    clear("promoCode");
                  }}
                  autoComplete="off"
                  autoCapitalize="characters"
                  spellCheck={false}
                  aria-invalid={!!errors.promoCode}
                  aria-describedby={`${id}-promoCode-${errors.promoCode ? "error" : "hint"}`}
                  className="font-mono tracking-wider uppercase sm:max-w-xs"
                />
                {errors.promoCode ? (
                  <FieldError id={`${id}-promoCode-error`}>
                    {errors.promoCode}
                  </FieldError>
                ) : (
                  <p
                    id={`${id}-promoCode-hint`}
                    className="text-[13px] text-muted-foreground"
                  >
                    Con un codice di invito, i primi {PROMO.months} mesi costano
                    meno.
                  </p>
                )}
              </Field>

              <Field className="sm:col-span-2">
                <FieldLabel htmlFor={`${id}-message`}>
                  Messaggio{" "}
                  <span className="font-normal text-muted-foreground">
                    (facoltativo)
                  </span>
                </FieldLabel>
                <Textarea
                  id={`${id}-message`}
                  name="message"
                  placeholder="Per esempio, come gestite oggi le prenotazioni"
                />
              </Field>

              {/* La trappola per i bot: fuori dallo schermo, fuori dal tab. */}
              <div aria-hidden className="absolute -left-[9999px]">
                <label htmlFor={`${id}-website`}>Sito web</label>
                <input
                  id={`${id}-website`}
                  name="website"
                  tabIndex={-1}
                  autoComplete="off"
                />
              </div>
            </div>

            <AnimatePresence initial={false}>
              {status === "error" && (
                <motion.p
                  role="alert"
                  {...swap}
                  className="mt-5 flex items-start gap-2 rounded-xl border border-danger-border bg-danger-subtle px-3.5 py-3 text-[14px] text-danger-foreground"
                >
                  <WarningCircleIcon
                    aria-hidden
                    weight="fill"
                    className="mt-0.5 size-4 shrink-0"
                  />
                  Impossibile inviare la richiesta. Controlla la connessione e
                  riprova.
                </motion.p>
              )}
            </AnimatePresence>

            <div className="mt-6 flex flex-col-reverse items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="max-w-[34ch] text-[13px] leading-snug text-muted-foreground">
                Usiamo questi dati solo per ricontattarti.
              </p>
              <Button
                type="submit"
                size="lg"
                disabled={status === "sending"}
                className="min-w-48 overflow-hidden"
              >
                <AnimatePresence initial={false} mode="popLayout">
                  <motion.span
                    key={status === "sending" ? "sending" : (plan ?? "demo")}
                    {...swap}
                    className="inline-block"
                  >
                    {status === "sending" ? "Invio in corso" : submitLabel}
                  </motion.span>
                </AnimatePresence>
              </Button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>
    </>
  );
}

/** Porta nel modulo il piano scritto nell'indirizzo; un valore sconosciuto si ignora. */
/**
 * Porta nel modulo quello che arriva nell'indirizzo: il piano scelto
 * (`?plan=complete`) e il codice di un club amico (`?code=RIVIERA`), così un
 * link condiviso su WhatsApp apre il modulo già pronto. Un piano sconosciuto
 * si ignora.
 */
function PlanFromUrl({
  onPlan,
  onCode,
}: {
  onPlan: (plan: PlanChoice) => void;
  onCode: (code: string) => void;
}) {
  const params = useSearchParams();
  const value = params.get("plan");
  const code = params.get("code");
  useEffect(() => {
    if (PLAN_CHOICES.includes(value as PlanChoice)) onPlan(value as PlanChoice);
  }, [value, onPlan]);
  useEffect(() => {
    if (code) onCode(code.toUpperCase());
  }, [code, onCode]);
  return null;
}

function TextField({
  id,
  name,
  label,
  hint,
  error,
  onInput,
  className,
  ...props
}: {
  id: string;
  name: string;
  label: string;
  hint?: string;
  error?: string;
  onInput: () => void;
  className?: string;
} & Omit<
  React.ComponentProps<"input">,
  "id" | "name" | "onInput" | "className"
>) {
  const inputId = `${id}-${name}`;
  return (
    <Field data-invalid={!!error} className={className}>
      <FieldLabel htmlFor={inputId}>{label}</FieldLabel>
      <Input
        id={inputId}
        name={name}
        aria-invalid={!!error}
        aria-describedby={
          error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined
        }
        onInput={onInput}
        {...props}
      />
      {error ? (
        <FieldError id={`${inputId}-error`}>{error}</FieldError>
      ) : hint ? (
        <p id={`${inputId}-hint`} className="text-[13px] text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </Field>
  );
}
