"use client";

import { useSignIn } from "@clerk/nextjs";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";

/**
 * La verifica con codice via mail, senza password.
 *
 * Estratta da `verify-step.tsx` perché ora la usano in due con intenzioni
 * diverse: chi prenota o ritrova una prenotazione scrive la propria mail, chi
 * arriva da un invito ce l'ha già scritta sopra e deve solo confermare di
 * essere lui. La meccanica — manda il codice, verificalo, apri la sessione — è
 * la stessa, e sta qui.
 */

const OTP_LENGTH = 6;
/** Le caselle del codice, in ordine: elenco stabile su cui iterare. */
const OTP_CELLS = Array.from({ length: OTP_LENGTH }, (_, index) => index);

/**
 * Clerk sul web espone l'API a segnali: gli errori tornano nel risultato, non
 * come eccezioni (a differenza dell'app, ferma alla vecchia API).
 *
 * Il codice in cima però è sempre `api_response_error`: quello che dice cosa è
 * andato storto sta nell'elenco annidato, e va cercato lì.
 */
export interface ClerkishError {
  code?: string;
  message?: string;
  longMessage?: string;
  errors?: ReadonlyArray<{ code?: string }>;
}

export function hasCode(error: ClerkishError, code: string): boolean {
  return (
    error.code === code ||
    (error.errors ?? []).some((nested) => nested.code === code)
  );
}

/**
 * I messaggi di Clerk arrivano in inglese e con il tono di chi parla a uno
 * sviluppatore: quelli che una persona può davvero incontrare li diciamo noi.
 */
const ERROR_MESSAGES: Record<string, string> = {
  form_code_incorrect: "Codice non valido: controlla le cifre e riprova.",
  verification_expired: "Il codice è scaduto: chiedine uno nuovo.",
  verification_failed: "Troppi tentativi sbagliati: chiedi un nuovo codice.",
  too_many_requests: "Troppi tentativi: aspetta qualche minuto e riprova.",
  rate_limit_exceeded: "Troppi tentativi: aspetta qualche minuto e riprova.",
  form_param_format_invalid: "L'indirizzo email non sembra valido.",
  strategy_for_user_invalid:
    "Questo account non può accedere con un codice via email: chiamaci e ti diamo una mano.",
};

export function messageOf(error: ClerkishError): string {
  for (const [code, message] of Object.entries(ERROR_MESSAGES)) {
    if (hasCode(error, code)) return message;
  }

  return "Non siamo riusciti a completare la verifica. Riprova, oppure chiamaci e facciamo noi.";
}

/** Manda il codice a un indirizzo. Torna l'errore, se c'è, già tradotto. */
export function useEmailCode() {
  const { signIn } = useSignIn();

  return {
    ready: Boolean(signIn),
    async send(emailAddress: string) {
      if (!signIn) return { error: "Un attimo e ci siamo, riprova." };

      const { error } = await signIn.emailCode.sendCode({ emailAddress });
      if (!error) return {};

      return {
        error: messageOf(error),
        unknownEmail: hasCode(error, "form_identifier_not_found"),
      };
    },
    async verify(code: string) {
      if (!signIn) return { error: "Un attimo e ci siamo, riprova." };

      const { error: verifyError } = await signIn.emailCode.verifyCode({
        code,
      });
      if (verifyError) return { error: messageOf(verifyError) };

      // `navigate` vuoto: la sessione si attiva restando sulla pagina, che
      // riprende da sola appena `isSignedIn` diventa vero.
      const { error: finalizeError } = await signIn.finalize({
        navigate: () => {},
      });

      return finalizeError ? { error: messageOf(finalizeError) } : {};
    },
  };
}

/**
 * Le sei caselle del codice, con il rimando indietro.
 * Verifica da sola appena il codice è completo: nessuno vuole digitare sei
 * cifre e poi cercare il pulsante.
 */
export function CodeFields({
  email,
  loading,
  error,
  onSubmit,
  onBack,
  backLabel = "Email sbagliata? Torna indietro",
}: {
  email: string;
  loading: boolean;
  error: string | null;
  onSubmit: (code: string) => void;
  onBack?: () => void;
  backLabel?: string;
}) {
  const [code, setCode] = useState("");

  return (
    <>
      <InputOTP
        maxLength={OTP_LENGTH}
        value={code}
        onChange={(value) => {
          setCode(value);
          if (value.length === OTP_LENGTH) onSubmit(value);
        }}
        disabled={loading}
        autoFocus
      >
        <InputOTPGroup>
          {OTP_CELLS.map((cell) => (
            <InputOTPSlot
              key={cell}
              index={cell}
              className="bg-background size-11 text-base"
            />
          ))}
        </InputOTPGroup>
      </InputOTP>

      {error && <p className="text-destructive mt-3 text-sm">{error}</p>}

      <div className="mt-6 flex flex-col gap-2.5 sm:max-w-sm">
        <Button
          type="button"
          size="pill-lg"
          disabled={loading || code.length < OTP_LENGTH}
          onClick={() => onSubmit(code)}
        >
          {loading ? "Verifica in corso…" : "Verifica e continua"}
        </Button>
        {onBack && (
          <Button
            type="button"
            variant="ghost"
            size="pill"
            onClick={() => {
              setCode("");
              onBack();
            }}
          >
            {backLabel}
          </Button>
        )}
      </div>

      <p className="text-muted-foreground mt-6 text-xs">
        Il codice è arrivato a {email}. Controlla anche nello spam.
      </p>
    </>
  );
}

export { OTP_LENGTH };
