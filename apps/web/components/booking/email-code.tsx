"use client";

import { useSignIn } from "@clerk/nextjs";
import { OneTimeCode } from "@padel-sport/one-time-code";

import { Button } from "@/components/ui/button";

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
    /** Solo il controllo del codice: la sessione la apre `activate`. */
    async verify(code: string) {
      if (!signIn) return { error: "Un attimo e ci siamo, riprova." };

      const { error: verifyError } = await signIn.emailCode.verifyCode({
        code,
      });
      return verifyError ? { error: messageOf(verifyError) } : {};
    },
    /**
     * Apre la sessione dopo un codice giusto. Separata da `verify` perché
     * aprirla cambia la pagina: si chiama a «Verificato» già visto.
     */
    async activate() {
      if (!signIn) return { error: "Un attimo e ci siamo, riprova." };

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
 * Le caselle del codice, con il rimando indietro.
 * Verifica da sola appena il codice è completo: nessuno vuole digitare sei
 * caratteri e poi cercare il pulsante. `onSubmit` dice se è andata: con
 * `false` le caselle si scuotono e si svuotano, e l'errore lo mostra `error`;
 * con `true` si fondono in «Verificato», e solo dopo arriva `onVerified`.
 */
export function CodeFields({
  email,
  error,
  onSubmit,
  onVerified,
  onBack,
  backLabel = "Email sbagliata? Torna indietro",
}: {
  email: string;
  error: string | null;
  onSubmit: (code: string) => Promise<boolean>;
  /** A «Verificato» visto: è qui che si cambia pagina. */
  onVerified?: () => void;
  onBack?: () => void;
  backLabel?: string;
}) {
  return (
    <>
      <OneTimeCode
        length={OTP_LENGTH}
        onComplete={onSubmit}
        onVerified={onVerified}
        autoFocus
      />

      {error && <p className="text-destructive mt-3 text-sm">{error}</p>}

      {onBack && (
        <div className="mt-6 flex flex-col gap-2.5 sm:max-w-sm">
          <Button type="button" variant="ghost" size="pill" onClick={onBack}>
            {backLabel}
          </Button>
        </div>
      )}

      <p className="text-muted-foreground mt-6 text-xs">
        Il codice è arrivato a {email}. Controlla anche nello spam.
      </p>
    </>
  );
}

export { OTP_LENGTH };
