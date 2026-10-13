"use client";

import { useSignIn } from "@clerk/nextjs";
import { OneTimeCode } from "@padel-sport/one-time-code";
import { ArrowLeft, Check, Loader2 } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useId, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { type AuthErrorLike, authErrorMessage } from "@/lib/auth-errors";
import { cn } from "@/lib/utils";

const OTP_LENGTH = 6;
/** Quanto aspettare prima di poter chiedere un altro codice. */
const RESEND_COOLDOWN = 30;
/** La curva forte dei token (`--ease-out` in globals.css). */
const EASE_OUT = [0.23, 1, 0.32, 1] as const;

/**
 * Con quale codice si sta verificando.
 *
 * Il primo è sempre quello via email. Gli altri esistono solo se un account
 * ha la verifica in due passaggi, o se Clerk chiede di riconoscere un
 * dispositivo nuovo: casi rari, ma senza un ramo qui l'accesso si fermerebbe
 * a metà senza dire perché.
 */
type Verification = "email" | "mfa-email" | "mfa-phone" | "mfa-totp";

type Step =
  | { kind: "email" }
  | { kind: "code"; via: Verification }
  | { kind: "done"; name: string | null };

const CODE_TITLE: Record<Verification, string> = {
  email: "Controlla la posta",
  "mfa-email": "Verifica in due passaggi",
  "mfa-phone": "Verifica in due passaggi",
  "mfa-totp": "Verifica in due passaggi",
};

/**
 * L'accesso al gestionale: email, poi il codice che Clerk manda lì.
 *
 * Usa le API «future» di Clerk (`signIn.emailCode`, `signIn.finalize`): gli
 * errori tornano nel risultato invece di essere lanciati, e restano dentro
 * questa pagina tradotti da `authErrorMessage`.
 *
 * Il movimento ha tre compiti e basta: dire che si va avanti o indietro fra
 * i passi (lo scorrimento segue la direzione), dire «codice sbagliato» con una
 * scossa delle caselle, e confermare l'accesso prima che la pagina cambi.
 */
export function SignInForm({ redirectTo }: { redirectTo: string }) {
  const { signIn } = useSignIn();
  const router = useRouter();
  const reduce = useReducedMotion();
  const emailId = useId();

  const [step, setStep] = useState<Step>({ kind: "email" });
  const [direction, setDirection] = useState<1 | -1>(1);
  const [email, setEmail] = useState("");
  /** Cresce a ogni codice nuovo: rimonta le caselle, che ripartono vuote. */
  const [round, setRound] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);

  const go = (next: Step, towards: 1 | -1 = 1) => {
    setDirection(towards);
    setStep(next);
  };

  /** Mostra l'errore e sblocca il modulo. Torna `false`, comodo per `proceed`. */
  const fail = (failure: AuthErrorLike | null | undefined) => {
    setError(authErrorMessage(failure));
    setBusy(false);
    return false as const;
  };

  /** La sessione è pronta: si conferma, si attiva e si va dove si stava andando. */
  async function finish() {
    if (!signIn) return;

    go({ kind: "done", name: signIn.userData.firstName ?? null });

    const { error: finalizeError } = await signIn.finalize({
      navigate: ({ session, decorateUrl }) => {
        if (session?.currentTask) {
          go({ kind: "code", via: "email" }, -1);
          fail({ message: "L'account ha un passaggio in sospeso su Clerk." });
          return;
        }

        const url = decorateUrl(redirectTo);
        if (url.startsWith("http")) window.location.href = url;
        else router.replace(url);
      },
    });

    if (finalizeError) {
      go({ kind: "email" }, -1);
      fail(finalizeError);
    }
  }

  /**
   * Dopo un codice giusto: entrare, oppure il passaggio che Clerk chiede
   * ancora. Torna `false` se si è fermato su un errore.
   */
  async function proceed(): Promise<boolean> {
    if (!signIn) return false;

    if (signIn.status === "complete") {
      await finish();
      return true;
    }

    if (signIn.status === "needs_client_trust") {
      const { error: sendError } = await signIn.mfa.sendEmailCode();
      if (sendError) return fail(sendError);
      return openCode("mfa-email");
    }

    if (signIn.status === "needs_second_factor") {
      const factors = signIn.supportedSecondFactors.map((f) => f.strategy);

      if (factors.includes("totp")) return openCode("mfa-totp");

      if (factors.includes("email_code")) {
        const { error: sendError } = await signIn.mfa.sendEmailCode();
        if (sendError) return fail(sendError);
        return openCode("mfa-email");
      }

      if (factors.includes("phone_code")) {
        const { error: sendError } = await signIn.mfa.sendPhoneCode();
        if (sendError) return fail(sendError);
        return openCode("mfa-phone");
      }
    }

    return fail({
      message: "Questo accesso richiede un passaggio non supportato.",
    });
  }

  /**
   * A «Verificato» visto, si va avanti. Se il passo dopo si ferma, il codice
   * ormai è usato: si riparte dall'email, con l'errore in vista.
   */
  async function afterVerified() {
    if (!(await proceed())) go({ kind: "email" }, -1);
  }

  function openCode(via: Verification) {
    setRound((r) => r + 1);
    setError(null);
    setBusy(false);
    go({ kind: "code", via });
    if (via !== "mfa-totp") setCooldown(RESEND_COOLDOWN);
    // Per `proceed`: con un nuovo codice da chiedere, si è andati avanti.
    return true;
  }

  async function sendEmailCode(event?: FormEvent) {
    event?.preventDefault();
    if (!signIn || busy) return;

    setBusy(true);
    setError(null);

    const { error: sendError } = await signIn.emailCode.sendCode({
      emailAddress: email.trim(),
    });
    if (sendError) return fail(sendError);

    openCode("email");
  }

  /**
   * Torna se il codice è giusto: con `false` le caselle si scuotono e si
   * svuotano da sole, con `true` si fondono in «Verificato».
   */
  async function verify(value: string) {
    if (!signIn || busy || step.kind !== "code") return false;

    setBusy(true);
    setError(null);

    const attempt = {
      email: () => signIn.emailCode.verifyCode({ code: value }),
      "mfa-email": () => signIn.mfa.verifyEmailCode({ code: value }),
      "mfa-phone": () => signIn.mfa.verifyPhoneCode({ code: value }),
      "mfa-totp": () => signIn.mfa.verifyTOTP({ code: value }),
    }[step.via];

    const { error: verifyError } = await attempt();
    if (verifyError) return fail(verifyError);

    // Il resto (entrare, o il secondo passaggio) dopo la capsula: vedi
    // `afterVerified`. Farlo qui la coprirebbe con il passo successivo.
    return true;
  }

  async function resend() {
    if (!signIn || busy || step.kind !== "code" || cooldown > 0) return;

    setError(null);
    const send = {
      email: () => signIn.emailCode.sendCode({ emailAddress: email.trim() }),
      "mfa-email": () => signIn.mfa.sendEmailCode(),
      "mfa-phone": () => signIn.mfa.sendPhoneCode(),
      "mfa-totp": null,
    }[step.via];
    if (!send) return;

    const { error: sendError } = await send();
    if (sendError) return fail(sendError);

    setRound((r) => r + 1);
    setCooldown(RESEND_COOLDOWN);
  }

  async function startOver() {
    setError(null);
    setBusy(false);
    go({ kind: "email" }, -1);
    await signIn?.reset();
  }

  // Avanti entra da destra, indietro da sinistra. Con meno movimento resta
  // solo la dissolvenza.
  const offset = reduce ? 0 : 16;
  const variants = {
    enter: (dir: number) => ({
      opacity: 0,
      transform: `translateX(${dir * offset}px)`,
    }),
    center: { opacity: 1, transform: "translateX(0px)" },
    exit: (dir: number) => ({
      opacity: 0,
      transform: `translateX(${dir * -offset}px)`,
    }),
  };

  const stepKey = step.kind === "code" ? `code-${step.via}` : step.kind;

  return (
    <AnimatePresence mode="wait" initial={false} custom={direction}>
      <motion.div
        key={stepKey}
        custom={direction}
        variants={variants}
        initial="enter"
        animate="center"
        exit="exit"
        transition={{ duration: 0.22, ease: EASE_OUT }}
      >
        {step.kind === "email" && (
          <>
            <h1 className="text-[28px] leading-tight font-semibold tracking-[-0.03em] lg:text-[32px]">
              Accedi
            </h1>
            <p className="mt-2 text-[15px] text-muted-foreground">
              Ti mandiamo un codice via email.
            </p>

            <form
              className="mt-8 space-y-5"
              onSubmit={sendEmailCode}
              noValidate
            >
              <div className="space-y-2">
                <Label htmlFor={emailId}>Email</Label>
                <Input
                  id={emailId}
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  autoCapitalize="none"
                  spellCheck={false}
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value);
                    if (error) setError(null);
                  }}
                  aria-invalid={Boolean(error)}
                  aria-describedby={error ? `${emailId}-error` : undefined}
                  className={FIELD_CLASS}
                  autoFocus
                  required
                />
                <ErrorText id={`${emailId}-error`} message={error} />
              </div>

              <SubmitButton
                busy={busy}
                disabled={!signIn || !email.trim()}
                label="Continua"
              />
            </form>
          </>
        )}

        {step.kind === "code" && (
          <>
            <button
              type="button"
              onClick={() => void startOver()}
              className="-ml-2 inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm text-muted-foreground transition-colors duration-150 hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-club/25 focus-visible:outline-none"
            >
              <ArrowLeft className="size-4" />
              Cambia email
            </button>

            <h1 className="mt-6 text-[28px] leading-tight font-semibold tracking-[-0.03em] lg:text-[32px]">
              {CODE_TITLE[step.via]}
            </h1>
            <p className="mt-2 text-[15px] text-muted-foreground">
              {step.via === "mfa-totp" ? (
                "Codice dell'app di autenticazione."
              ) : step.via === "mfa-phone" ? (
                "Codice inviato via SMS."
              ) : (
                <>
                  Codice inviato a{" "}
                  <span className="font-medium break-all text-foreground">
                    {email.trim()}
                  </span>
                </>
              )}
            </p>

            {/* Niente pulsante «Accedi»: a codice completo la verifica
                parte da sola, e il campo stesso dice com'è andata. */}
            <div className="mt-8">
              <OneTimeCode
                key={`${step.via}-${round}`}
                length={OTP_LENGTH}
                onComplete={verify}
                onVerified={() => void afterVerified()}
                // Lo svuotamento dopo un codice sbagliato non cancella
                // l'errore: sparisce quando si ricomincia a scrivere.
                onChange={(value) => {
                  if (value && error) setError(null);
                }}
                label="Codice"
                autoFocus
              />

              <ErrorText message={error} className="mt-3" />
            </div>

            {step.via !== "mfa-totp" && (
              <button
                type="button"
                onClick={() => void resend()}
                disabled={cooldown > 0 || busy}
                className={cn(
                  "mx-auto mt-5 block rounded-md px-1.5 py-1 text-sm tabular-nums transition-colors duration-150 focus-visible:ring-[3px] focus-visible:ring-club/25 focus-visible:outline-none",
                  cooldown > 0 || busy
                    ? "cursor-not-allowed text-muted-foreground"
                    : "font-medium text-foreground hover:text-club",
                )}
              >
                {cooldown > 0
                  ? `Nuovo codice fra ${cooldown} s`
                  : "Invia un nuovo codice"}
              </button>
            )}
          </>
        )}

        {step.kind === "done" && (
          <output className="block py-6">
            <motion.div
              initial={{
                opacity: 0,
                transform: reduce ? "scale(1)" : "scale(0.85)",
              }}
              animate={{ opacity: 1, transform: "scale(1)" }}
              transition={{ type: "spring", duration: 0.5, bounce: 0.25 }}
              className="grid size-14 place-items-center rounded-full bg-club text-club-foreground"
            >
              <Check className="size-7" strokeWidth={2.5} />
            </motion.div>
            <h1 className="mt-6 text-[28px] leading-tight font-semibold tracking-[-0.03em] lg:text-[32px]">
              {step.name ? `Ciao ${step.name}` : "Ci sei"}
            </h1>
            <p className="mt-2 inline-flex items-center gap-2 text-[15px] text-muted-foreground">
              <Loader2 className="size-4 animate-spin motion-reduce:animate-none" />
              Apro il gestionale
            </p>
          </output>
        )}
      </motion.div>
    </AnimatePresence>
  );
}

const FIELD_CLASS =
  "h-12 rounded-xl bg-card px-4 text-base shadow-none transition-[border-color,box-shadow] duration-150 focus-visible:border-club focus-visible:ring-club/15 md:text-base";

function SubmitButton({
  busy,
  disabled,
  label,
  className,
}: {
  busy: boolean;
  disabled: boolean;
  label: string;
  className?: string;
}) {
  return (
    <Button
      type="submit"
      disabled={busy || disabled}
      className={cn(
        "h-12 w-full rounded-xl bg-club text-[15px] font-medium text-club-foreground transition-[transform,background-color,opacity] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] hover:bg-club-hover focus-visible:ring-club/30 active:scale-[0.98] disabled:opacity-40",
        className,
      )}
    >
      {busy ? <Loader2 className="size-5 animate-spin" /> : label}
    </Button>
  );
}

function ErrorText({
  id,
  message,
  className,
}: {
  id?: string;
  message: string | null;
  className?: string;
}) {
  return (
    <AnimatePresence initial={false}>
      {message && (
        <motion.p
          id={id}
          role="alert"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className={cn("text-sm text-destructive", className)}
        >
          {message}
        </motion.p>
      )}
    </AnimatePresence>
  );
}
