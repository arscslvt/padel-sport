"use client";

import { useSignIn } from "@clerk/nextjs";
import { ArrowRight, ExternalLink, Phone } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { getInfo } from "@/lib/info";
import { SUMUP_BOOKING_URL } from "@/lib/links";

import { FIELD_CLASS, Hint, StepHeader } from "./wizard-ui";

/**
 * Verifica dell'utente senza login classico: si scrive la mail e si conferma
 * con il codice che arriva in casella.
 *
 * È lo stesso account dell'app (stessa istanza Clerk), ma qui non si crea
 * niente: se la mail non risulta, non ha senso inventare un profilo — si passa
 * a SumUp, dove prenota chi non è del giro. Differenza voluta rispetto ad
 * apps/mobile/app/login.tsx, che in quel caso registra l'utente.
 *
 * La usano due pagine con due intenzioni diverse (prenotare, ritrovare una
 * prenotazione): cambia solo cosa si dice, quindi le due versioni del testo
 * stanno qui sotto invece di passare cinque stringhe da fuori.
 */

/** Cosa sta cercando di fare chi si verifica. */
export type VerifyPurpose = "book" | "recover";

const COPY = {
  book: {
    title: "Chi sta prenotando?",
    subtitle:
      "Scrivi la mail del tuo account: ti mandiamo un codice di verifica.",
    hint: "Non hai un account? Nessun problema: te lo diciamo subito e ti portiamo alla prenotazione tradizionale, senza registrazione.",
    unknownTitle: "Non troviamo questa email",
    unknownBody:
      "Due strade, entrambe rapide. Puoi prenotare subito senza account, dal nostro servizio di prenotazione esterno. Oppure, se sei socio o vuoi diventarlo, ti attiviamo noi l'account: chiamaci o passa in struttura, e la prossima volta prenoti da qui in un minuto — con QR, squadra e storico delle partite.",
    unknownCta: "Prenota senza account",
  },
  recover: {
    title: "Ritrova le tue prenotazioni",
    subtitle:
      "Scrivi la mail con cui hai prenotato: ti mandiamo un codice di verifica.",
    hint: "Non serve ricordare il codice della prenotazione: dopo la verifica trovi qui tutte le tue partite, con QR e codice.",
    unknownTitle: "Non troviamo questa email",
    unknownBody:
      "Con questo indirizzo non risulta nessun account del club, quindi qui non c'è niente da ritrovare. Se hai prenotato senza account, la prenotazione è sul servizio esterno: aprilo e cercala lì. Se invece l'account pensavi di averlo, chiamaci: lo cerchiamo noi e, se serve, te lo attiviamo.",
    unknownCta: "Apri il servizio di prenotazione",
  },
} as const;

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
interface ClerkishError {
  code?: string;
  message?: string;
  longMessage?: string;
  errors?: ReadonlyArray<{ code?: string }>;
}

function hasCode(error: ClerkishError, code: string): boolean {
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

function messageOf(error: ClerkishError): string {
  for (const [code, message] of Object.entries(ERROR_MESSAGES)) {
    if (hasCode(error, code)) return message;
  }

  return "Non siamo riusciti a completare la verifica. Riprova, oppure chiamaci e facciamo noi.";
}

export function VerifyStep({ purpose = "book" }: { purpose?: VerifyPurpose }) {
  const { signIn } = useSignIn();
  const copy = COPY[purpose];

  const [phase, setPhase] = useState<"email" | "code" | "unknown">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const sendCode = async () => {
    if (!signIn || loading) return;

    const emailAddress = email.trim().toLowerCase();
    if (!emailAddress) {
      setError("Inserisci la tua email.");
      return;
    }

    setLoading(true);
    setError(null);

    const { error: sendError } = await signIn.emailCode.sendCode({
      emailAddress,
    });

    if (sendError) {
      // Nessun account con questa mail: non è un errore, è l'altro percorso.
      if (hasCode(sendError, "form_identifier_not_found")) {
        setPhase("unknown");
      } else {
        setError(messageOf(sendError));
      }
    } else {
      setPhase("code");
    }

    setLoading(false);
  };

  const verifyCode = async (value: string) => {
    if (!signIn || loading) return;

    setLoading(true);
    setError(null);

    const { error: verifyError } = await signIn.emailCode.verifyCode({
      code: value,
    });

    if (verifyError) {
      setError(messageOf(verifyError));
      setCode("");
      setLoading(false);
      return;
    }

    // `navigate` vuoto: la sessione si attiva restando sulla prenotazione, che
    // riprende da sola appena `isSignedIn` diventa vero.
    const { error: finalizeError } = await signIn.finalize({
      navigate: () => {},
    });

    if (finalizeError) {
      setError(messageOf(finalizeError));
      setCode("");
    }

    setLoading(false);
  };

  if (phase === "unknown") {
    return (
      <div>
        <StepHeader
          title={copy.unknownTitle}
          subtitle="Nessun account del club è collegato a questo indirizzo."
        />

        <p className="text-muted-foreground max-w-[52ch] text-sm leading-relaxed">
          {copy.unknownBody}
        </p>

        <div className="mt-6 flex flex-col gap-2.5 sm:max-w-sm">
          <Button asChild size="pill-lg">
            <a href={SUMUP_BOOKING_URL} target="_blank" rel="noreferrer">
              {copy.unknownCta}
              <ExternalLink className="size-4" />
            </a>
          </Button>
          <Button asChild variant="outline" size="pill-lg">
            <a href={`tel:${getInfo("cell")?.replace(/\s/g, "")}`}>
              <Phone className="size-4" />
              Chiamaci per attivare l'account
            </a>
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="pill"
            onClick={() => {
              setPhase("email");
              setError(null);
            }}
          >
            Riprova con un'altra email
          </Button>
        </div>

        <p className="text-muted-foreground mt-6 text-xs">
          Siamo in {getInfo("address")}.
        </p>
      </div>
    );
  }

  if (phase === "code") {
    return (
      <div>
        <StepHeader
          title="Inserisci il codice"
          subtitle={`Lo abbiamo mandato a ${email.trim().toLowerCase()}.`}
        />

        <InputOTP
          maxLength={OTP_LENGTH}
          value={code}
          onChange={(value) => {
            setCode(value);
            setError(null);
            if (value.length === OTP_LENGTH) void verifyCode(value);
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
            onClick={() => void verifyCode(code)}
          >
            {loading ? "Verifica in corso…" : "Verifica e continua"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="pill"
            onClick={() => {
              setPhase("email");
              setCode("");
              setError(null);
            }}
          >
            Email sbagliata? Torna indietro
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <StepHeader title={copy.title} subtitle={copy.subtitle} />

      <div className="flex flex-col gap-3 sm:max-w-sm">
        <Input
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="mario.rossi@esempio.it"
          className={FIELD_CLASS}
          value={email}
          disabled={loading}
          onChange={(event) => {
            setEmail(event.target.value);
            setError(null);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              void sendCode();
            }
          }}
        />

        {error && <p className="text-destructive text-sm">{error}</p>}

        <Button
          type="button"
          size="pill-lg"
          disabled={loading}
          onClick={() => void sendCode()}
        >
          {loading ? "Invio in corso…" : "Ricevi il codice"}
          <ArrowRight className="size-4" />
        </Button>
      </div>

      <Hint>{copy.hint}</Hint>
    </div>
  );
}
