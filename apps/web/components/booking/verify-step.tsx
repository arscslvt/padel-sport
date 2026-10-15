"use client";

import { useSignIn } from "@clerk/nextjs";
import { OneTimeCode } from "@padel-sport/one-time-code";
import { ArrowRight, ExternalLink, Phone } from "lucide-react";
import { useId, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
 * La usano tre pagine con tre intenzioni diverse (prenotare, ritrovare una
 * prenotazione, entrare nell'area personale): cambia solo cosa si dice,
 * quindi le versioni del testo stanno qui sotto invece di passare cinque
 * stringhe da fuori.
 */

/** Cosa sta cercando di fare chi si verifica. */
export type VerifyPurpose = "book" | "recover" | "area" | "invite";

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
  area: {
    title: "Entra nella tua area",
    subtitle:
      "Scrivi la mail del tuo account: ti mandiamo un codice di verifica.",
    hint: "Niente password: dopo la verifica trovi qui prenotazioni, punti e premi.",
    unknownTitle: "Non troviamo questa email",
    unknownBody:
      "Con questo indirizzo non risulta nessun account del club. L'area personale è per i soci: se lo sei o vuoi diventarlo, chiamaci o passa in struttura e ti attiviamo l'account. Intanto puoi prenotare senza account dal servizio esterno.",
    unknownCta: "Prenota senza account",
  },
  invite: {
    title: "Apri il tuo invito",
    subtitle:
      "Scrivi la mail del tuo account: ti mandiamo un codice di verifica.",
    hint: "Niente password: dopo la verifica vedi la partita e rispondi all'invito.",
    unknownTitle: "Non troviamo questa email",
    unknownBody:
      "Con questo indirizzo non risulta nessun account del club. L'invito è legato all'account di chi è stato invitato: prova con l'altra tua email, oppure chiamaci e lo cerchiamo noi.",
    unknownCta: "Apri il servizio di prenotazione",
  },
} as const;

const OTP_LENGTH = 6;

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

  const emailId = useId();
  const [phase, setPhase] = useState<"email" | "code" | "unknown">("email");
  const [email, setEmail] = useState("");
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

  /**
   * Solo il controllo del codice: torna se è passato, ed è quello che decide
   * come finiscono le caselle. La sessione si apre dopo, in `activate`.
   */
  const verifyCode = async (value: string) => {
    if (!signIn || loading) return false;

    setLoading(true);
    setError(null);

    const { error: verifyError } = await signIn.emailCode.verifyCode({
      code: value,
    });

    setLoading(false);
    if (verifyError) {
      setError(messageOf(verifyError));
      return false;
    }

    return true;
  };

  /**
   * A «Verificato» visto: aprire la sessione fa sparire questo passo (la
   * pagina riprende appena `isSignedIn` diventa vero), quindi non prima.
   */
  const activate = async () => {
    if (!signIn) return;

    setLoading(true);
    // `navigate` vuoto: la sessione si attiva restando sulla prenotazione, che
    // riprende da sola appena `isSignedIn` diventa vero.
    const { error: finalizeError } = await signIn.finalize({
      navigate: () => {},
    });
    setLoading(false);

    if (finalizeError) {
      // Il codice è già stato usato: per riprovare ne serve uno nuovo, che si
      // chiede dal primo passo.
      setError(messageOf(finalizeError));
      setPhase("email");
    }
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

        <OneTimeCode
          length={OTP_LENGTH}
          onComplete={verifyCode}
          onVerified={() => void activate()}
          // Lo svuotamento dopo un codice sbagliato non conta: l'errore resta
          // finché non si ricomincia a scrivere.
          onChange={(value) => {
            if (value) setError(null);
          }}
          autoFocus
        />

        {error && <p className="text-destructive mt-3 text-sm">{error}</p>}

        <div className="mt-6 flex flex-col gap-2.5 sm:max-w-sm">
          <Button
            type="button"
            variant="ghost"
            size="pill"
            onClick={() => {
              setPhase("email");
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
        {/* Il segnaposto è un esempio, non un'etichetta: sparisce appena si
            scrive, e con lui il «cosa va qui». */}
        <div className="flex flex-col gap-2">
          <Label htmlFor={emailId}>La tua email</Label>
          <Input
            id={emailId}
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
        </div>

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
