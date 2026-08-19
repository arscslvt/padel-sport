"use client";

import { useAuth } from "@clerk/nextjs";
import { ArrowRight, Check, Loader2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  EMPTY_OPTIONAL,
  OptionalFields,
  type OptionalFieldsValue,
  optionalPayload,
} from "@/app/(dashboard)/dashboard/clients/_components/optional-fields";
import {
  ResidenceFields,
  residencePayload,
} from "@/app/(dashboard)/dashboard/clients/_components/residence-fields";
import type { Residence } from "@/app/(dashboard)/dashboard/clients/_components/types";
import { CodeFields, useEmailCode } from "@/components/booking/email-code";
import {
  Chip,
  FIELD_CLASS,
  SectionLabel,
  StepHeader,
} from "@/components/booking/wizard-ui";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getInfo } from "@/lib/info";
import {
  findLevelRangeIndex,
  formatLevelRange,
  LEVEL_RANGES,
} from "@/lib/levels";
import { BOOKING_LINK } from "@/lib/links";

/**
 * L'attivazione dell'account, dal link dell'invito.
 *
 * I dati arrivano già scritti: al club la persona è registrata da quando è
 * passata allo sportello, e rifarle compilare quello che il club ha già in mano
 * sarebbe un modo per farla sbagliare. Qui conferma, corregge quel che non
 * torna, e dà i consensi — che restano suoi e di nessun altro.
 *
 * L'ordine non è casuale: si vedono i propri dati solo a verifica avvenuta, mai
 * prima, così chi ricevesse il link per sbaglio non legge niente di altri.
 */

const GENDERS = [
  { value: "f", label: "Donna" },
  { value: "m", label: "Uomo" },
  { value: "other", label: "Altro" },
  { value: "unspecified", label: "Preferisco non dirlo" },
] as const;

type Gender = (typeof GENDERS)[number]["value"];

const CONSENTS = [
  {
    key: "marketing",
    label: "Comunicazioni promozionali",
    hint: "Offerte, tornei e iniziative del club. Niente di automatico: scriviamo poco e solo quando c'è qualcosa.",
  },
  {
    key: "newsletter",
    label: "Newsletter",
    hint: "Il riepilogo periodico di quello che succede in struttura.",
  },
  {
    key: "tracking",
    label: "Statistiche d'uso",
    hint: "Ci lasci capire come usi il sito e l'app, per migliorarli. Nessun dato venduto a terzi.",
  },
] as const;

type ConsentKey = (typeof CONSENTS)[number]["key"];

export function JoinWizard({
  token,
  email,
  firstName: knownFirstName,
  lastName: knownLastName,
  phone: knownPhone,
  birthDate: knownBirthDate,
  gender: knownGender,
  level: knownLevel,
  taxCode: knownTaxCode,
  residence: knownResidence,
  health: knownHealth,
}: {
  token: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  birthDate?: number;
  gender?: Gender;
  level?: number;
  taxCode?: string;
  residence?: Residence;
  health?: { allergies?: string; conditions?: string; disability?: string };
}) {
  const { isLoaded, isSignedIn } = useAuth();
  const emailCode = useEmailCode();

  const [phase, setPhase] = useState<"intro" | "code" | "form" | "done">(
    "intro",
  );
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [firstName, setFirstName] = useState(knownFirstName);
  const [lastName, setLastName] = useState(knownLastName);
  const [phone, setPhone] = useState(knownPhone ?? "");
  const [birthDate, setBirthDate] = useState(
    knownBirthDate ? new Date(knownBirthDate).toISOString().slice(0, 10) : "",
  );
  const [gender, setGender] = useState<Gender | null>(knownGender ?? null);
  const [levelIndex, setLevelIndex] = useState(
    findLevelRangeIndex(knownLevel ?? null),
  );
  const [residence, setResidence] = useState<Residence>(knownResidence ?? {});
  const [optional, setOptional] = useState<OptionalFieldsValue>({
    ...EMPTY_OPTIONAL,
    taxCode: knownTaxCode ?? "",
    health: knownHealth ?? {},
  });
  const [consents, setConsents] = useState<Record<ConsentKey, boolean>>({
    marketing: false,
    newsletter: false,
    tracking: false,
  });

  // Chi ha già la sessione aperta — è tornato sul link, o si era verificato per
  // prenotare — salta la soglia e va dritto ai dati.
  useEffect(() => {
    if (isLoaded && isSignedIn && phase === "intro") setPhase("form");
  }, [isLoaded, isSignedIn, phase]);

  const sendCode = async () => {
    setLoading(true);
    setError(null);

    const { error: sendError } = await emailCode.send(email);

    if (sendError) setError(sendError);
    else setPhase("code");

    setLoading(false);
  };

  const verify = async (code: string) => {
    setLoading(true);
    setError(null);

    const { error: verifyError } = await emailCode.verify(code);

    if (verifyError) setError(verifyError);
    else setPhase("form");

    setLoading(false);
  };

  const submit = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      setError("Servono nome e cognome.");
      return;
    }
    if (!phone.trim()) {
      setError("Serve un numero di telefono: è così che il club ti raggiunge.");
      return;
    }
    if (!birthDate) {
      setError("Serve la data di nascita.");
      return;
    }
    if (!gender) {
      setError("Scegli una delle opzioni: c'è anche «preferisco non dirlo».");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/clients/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          phone: phone.trim(),
          birthDate: new Date(`${birthDate}T12:00:00`).getTime(),
          gender,
          level: LEVEL_RANGES[levelIndex].level,
          consents,
          residence: residencePayload(residence),
          ...optionalPayload({ ...optional, clubNotes: undefined }),
        }),
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        setError(
          payload?.error ?? "Non siamo riusciti a completare l'iscrizione.",
        );
        return;
      }

      setPhase("done");
    } catch {
      setError("Controlla la connessione e riprova.");
    } finally {
      setLoading(false);
    }
  };

  if (phase === "done") {
    return (
      <div>
        <StepHeader
          title={`Benvenuto, ${firstName.split(" ")[0]}.`}
          subtitle="Sei iscritto al club: da adesso prenoti da qui."
        />

        <p className="text-muted-foreground max-w-[52ch] text-sm leading-relaxed">
          Per entrare, la prossima volta, ti basta la tua email: ti mandiamo un
          codice, come adesso. Se hai lasciato la quota da saldare, la sistemi
          in struttura alla prima visita.
        </p>

        <div className="mt-6 flex flex-col gap-2.5 sm:max-w-sm">
          <Button asChild size="pill-lg">
            <Link href={BOOKING_LINK}>
              Prenota il primo campo
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  if (phase === "code") {
    return (
      <div>
        <StepHeader
          title="Inserisci il codice"
          subtitle={`Lo abbiamo mandato a ${email}.`}
        />

        <CodeFields
          email={email}
          loading={loading}
          error={error}
          onSubmit={(code) => void verify(code)}
          onBack={() => {
            setPhase("intro");
            setError(null);
          }}
          backLabel="Non è arrivato? Torna indietro"
        />
      </div>
    );
  }

  if (phase === "intro") {
    return (
      <div>
        <StepHeader
          title="Sei tu?"
          subtitle="Prima di tutto verifichiamo l'indirizzo a cui è arrivato l'invito."
        />

        <div className="bg-background rounded-xl border p-4">
          <p className="text-muted-foreground text-xs tracking-wide uppercase">
            Invito intestato a
          </p>
          <p className="mt-1 font-medium">{email}</p>
        </div>

        {error && <p className="text-destructive mt-3 text-sm">{error}</p>}

        <div className="mt-6 flex flex-col gap-2.5 sm:max-w-sm">
          <Button
            type="button"
            size="pill-lg"
            disabled={loading || !emailCode.ready}
            onClick={() => void sendCode()}
          >
            {loading ? "Invio in corso…" : "Ricevi il codice"}
            <ArrowRight className="size-4" />
          </Button>
        </div>

        <p className="text-muted-foreground mt-6 max-w-[52ch] text-xs leading-relaxed">
          L'indirizzo non si può cambiare da qui: l'invito è personale. Se è
          sbagliato, chiamaci al {getInfo("cell")} e te ne facciamo un altro.
        </p>
      </div>
    );
  }

  return (
    <div>
      <StepHeader
        step={2}
        total={2}
        title="I tuoi dati"
        subtitle="Li abbiamo presi quando sei passato in struttura: controlla che siano giusti e correggi quel che serve."
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="firstName">Nome</Label>
          <Input
            id="firstName"
            className={FIELD_CLASS}
            value={firstName}
            onChange={(event) => setFirstName(event.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="lastName">Cognome</Label>
          <Input
            id="lastName"
            className={FIELD_CLASS}
            value={lastName}
            onChange={(event) => setLastName(event.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="phone">Telefono</Label>
          <Input
            id="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="333 1234567"
            className={FIELD_CLASS}
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="birthDate">Data di nascita</Label>
          <Input
            id="birthDate"
            type="date"
            className={FIELD_CLASS}
            value={birthDate}
            max={new Date().toISOString().slice(0, 10)}
            onChange={(event) => setBirthDate(event.target.value)}
          />
        </div>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <ResidenceFields
          value={residence}
          onChange={setResidence}
          idPrefix="join"
        />
      </div>

      <div className="mt-8">
        <SectionLabel>Sesso</SectionLabel>
        <div className="flex flex-wrap gap-2">
          {GENDERS.map((option) => (
            <Chip
              key={option.value}
              type="button"
              selected={gender === option.value}
              onClick={() => setGender(option.value)}
            >
              {option.label}
            </Chip>
          ))}
        </div>
      </div>

      <div className="mt-8">
        <SectionLabel>Come giochi</SectionLabel>
        <div className="flex flex-wrap gap-2">
          {LEVEL_RANGES.map((range, index) => (
            <Chip
              key={range.label}
              type="button"
              selected={levelIndex === index}
              onClick={() => setLevelIndex(index)}
            >
              {range.label} · {formatLevelRange(range.min, range.max)}
            </Chip>
          ))}
        </div>
        <p className="text-muted-foreground mt-2 max-w-[52ch] text-xs leading-relaxed">
          {LEVEL_RANGES[levelIndex].hint} Serve a proporti partite con gente del
          tuo passo: potrai cambiarlo quando vuoi.
        </p>
      </div>

      <div className="mt-8">
        <OptionalFields
          value={optional}
          onChange={setOptional}
          withClubNotes={false}
          idPrefix="join"
        />
      </div>

      <div className="mt-8">
        <SectionLabel>Consensi</SectionLabel>
        <p className="text-muted-foreground mb-4 max-w-[52ch] text-xs leading-relaxed">
          Sono facoltativi e non cambiano nulla della tua iscrizione: puoi
          lasciarli tutti vuoti e restare socio a tutti gli effetti.
        </p>

        <div className="space-y-3">
          {CONSENTS.map((consent) => (
            <label
              key={consent.key}
              htmlFor={consent.key}
              className="bg-background flex cursor-pointer gap-3 rounded-xl border p-3.5"
            >
              <Checkbox
                id={consent.key}
                checked={consents[consent.key]}
                onCheckedChange={(checked) =>
                  setConsents((current) => ({
                    ...current,
                    [consent.key]: Boolean(checked),
                  }))
                }
                className="mt-0.5"
              />
              <span>
                <span className="block text-sm font-medium">
                  {consent.label}
                </span>
                <span className="text-muted-foreground block text-xs leading-relaxed">
                  {consent.hint}
                </span>
              </span>
            </label>
          ))}
        </div>
      </div>

      {error && <p className="text-destructive mt-6 text-sm">{error}</p>}

      <div className="mt-8 flex flex-col gap-2.5 sm:max-w-sm">
        <Button
          type="button"
          size="pill-lg"
          disabled={loading}
          onClick={() => void submit()}
        >
          {loading ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Un attimo…
            </>
          ) : (
            <>
              <Check className="size-4" />
              Attiva l'account
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
