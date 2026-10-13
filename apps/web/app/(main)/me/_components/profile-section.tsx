"use client";

import { useClerk, useUser } from "@clerk/nextjs";
import type { EmailAddressResource } from "@clerk/nextjs/types";
import { api } from "@padel-sport/backend/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { Loader2, LogOut } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type { Residence } from "@/app/(main)/join/[token]/_components/client-types";
import {
  ResidenceFields,
  residencePayload,
} from "@/app/(main)/join/[token]/_components/residence-fields";
import {
  type ClerkishError,
  CodeFields,
  hasCode,
  messageOf,
} from "@/components/booking/email-code";
import { FIELD_CLASS } from "@/components/booking/wizard-ui";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { convexMessage } from "@/lib/clients";
import { PERSONAL_AREA_LINK } from "@/lib/links";
import { formatClubDate } from "@/lib/points";

import { SectionTitle } from "./section-title";

/**
 * I dati della persona, come il club li conosce.
 *
 * Si correggono da qui solo email, telefono, residenza e le informazioni
 * sanitarie che è giusto che lo staff sappia in campo. Nome, nascita e codice
 * fiscale sono i dati del tesseramento: si vedono, ma li cambia la segreteria
 * con un documento davanti (modules/clients/self.ts).
 */

type Profile = NonNullable<
  FunctionReturnType<typeof api.modules.clients.self.me>
>;

const HEALTH_MAX = 500;

export function ProfileSection() {
  const profile = useQuery(api.modules.clients.self.me, {});
  const { signOut } = useClerk();

  if (profile === undefined) {
    return (
      <div className="space-y-2.5" aria-busy="true">
        <Skeleton className="rounded-card h-56 w-full" />
        <Skeleton className="rounded-card h-40 w-full" />
      </div>
    );
  }

  if (profile === null) return null;

  return (
    <div className="space-y-14">
      <ContactsAndDetails profile={profile} />
      <MembershipFacts profile={profile} />

      {/* L'uscita chiude la pagina: sta in fondo, staccata dai dati, e si
          legge come un'azione che fa perdere qualcosa. */}
      <section
        aria-labelledby="signout-title"
        className="border-border flex flex-col gap-4 border-t pt-8 sm:flex-row sm:items-center sm:justify-between"
      >
        <div>
          <p id="signout-title" className="text-sm font-medium">
            Esci dall'account
          </p>
          <p className="text-muted-foreground mt-1 text-sm">
            Per rientrare ti basta un codice alla tua email.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="pill"
          className="text-destructive hover:text-destructive border-destructive/30 hover:bg-destructive/5 w-full active:scale-[0.97] sm:w-auto"
          onClick={() => void signOut({ redirectUrl: PERSONAL_AREA_LINK })}
        >
          <LogOut className="size-4" />
          Esci
        </Button>
      </section>
    </div>
  );
}

/** Telefono, residenza e salute si salvano insieme; l'email ha il suo giro. */
function ContactsAndDetails({ profile }: { profile: Profile }) {
  const updateProfile = useMutation(api.modules.clients.self.update);

  const initial = {
    phone: profile.phone ?? "",
    residence: profile.residence ?? {},
    allergies: profile.health.allergies ?? "",
    conditions: profile.health.conditions ?? "",
    healthConsent: profile.healthConsent,
  };

  const [phone, setPhone] = useState(initial.phone);
  const [residence, setResidence] = useState<Residence>(initial.residence);
  const [allergies, setAllergies] = useState(initial.allergies);
  const [conditions, setConditions] = useState(initial.conditions);
  const [healthConsent, setHealthConsent] = useState(initial.healthConsent);
  const [saving, setSaving] = useState(false);

  const dirty =
    JSON.stringify({
      phone,
      residence,
      allergies,
      conditions,
      healthConsent,
    }) !== JSON.stringify(initial);

  // Senza consenso i campi si svuotano e si chiudono: salvando, i dati
  // sanitari se ne vanno tutti (modules/clients/self.ts).
  const toggleHealthConsent = (checked: boolean) => {
    setHealthConsent(checked);
    if (!checked) {
      setAllergies("");
      setConditions("");
    }
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!dirty || saving) return;

    setSaving(true);
    try {
      await updateProfile({
        phone,
        residence: residencePayload(residence),
        health: {
          allergies: allergies.trim() || undefined,
          conditions: conditions.trim() || undefined,
        },
        healthConsent,
      });
      toast.success("Dati aggiornati");
    } catch (error) {
      toast.error("Dati non salvati", {
        description: convexMessage(error, "Riprova fra poco."),
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={save} className="space-y-14">
      <section aria-labelledby="contacts-title" className="space-y-5">
        <SectionTitle
          id="contacts-title"
          title="Contatti"
          description="Dove ti scriviamo e ti chiamiamo per partite e premi."
        />
        <div className="rounded-card bg-muted space-y-6 p-6 sm:p-8">
          <EmailField current={profile.email} />

          <div className="space-y-2">
            <Label htmlFor="profile-phone">Telefono</Label>
            <Input
              id="profile-phone"
              type="tel"
              autoComplete="tel"
              inputMode="tel"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              className={FIELD_CLASS}
            />
          </div>
        </div>
      </section>

      <section aria-labelledby="residence-title" className="space-y-5">
        <SectionTitle
          id="residence-title"
          title="Residenza"
          description="Serve al tesseramento e alle ricevute."
        />
        <div className="rounded-card bg-muted grid grid-cols-2 gap-x-3 gap-y-6 p-6 sm:p-8 [&_input]:bg-background [&_input]:h-11 [&_input]:rounded-xl">
          <ResidenceFields
            value={residence}
            onChange={setResidence}
            idPrefix="profile-res"
          />
        </div>
      </section>

      <section aria-labelledby="health-title" className="space-y-5">
        <SectionTitle
          id="health-title"
          title="Salute"
          description="Facoltativo. Lo legge solo lo staff, per sapere come aiutarti in campo."
        />
        <div className="rounded-card bg-muted space-y-6 p-6 sm:p-8">
          <label
            htmlFor="profile-health-consent"
            className="flex cursor-pointer gap-3"
          >
            <Checkbox
              id="profile-health-consent"
              checked={healthConsent}
              onCheckedChange={(checked) =>
                toggleHealthConsent(checked === true)
              }
              className="bg-background mt-0.5"
            />
            <span>
              <span className="block text-sm font-medium">
                Acconsento al trattamento dei miei dati sanitari
              </span>
              <span className="text-muted-foreground block text-xs leading-relaxed">
                {initial.healthConsent && !healthConsent
                  ? "Salvando cancelliamo i dati sanitari che ci hai lasciato."
                  : "Li usiamo solo per aiutarti in caso di malore. Puoi togliere il consenso quando vuoi."}
              </span>
            </span>
          </label>
          <div className="space-y-2">
            <Label htmlFor="profile-allergies">Allergie e intolleranze</Label>
            <Textarea
              id="profile-allergies"
              value={allergies}
              maxLength={HEALTH_MAX}
              disabled={!healthConsent}
              onChange={(event) => setAllergies(event.target.value)}
              placeholder="Es. allergia alle punture d'ape"
              className="bg-background border-border min-h-20 rounded-xl"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="profile-conditions">Condizioni mediche</Label>
            <Textarea
              id="profile-conditions"
              value={conditions}
              maxLength={HEALTH_MAX}
              disabled={!healthConsent}
              onChange={(event) => setConditions(event.target.value)}
              placeholder="Es. asma da sforzo, porto con me l'inalatore"
              className="bg-background border-border min-h-20 rounded-xl"
            />
          </div>
        </div>
      </section>

      <Button
        type="submit"
        size="pill"
        disabled={!dirty || saving}
        className="w-full active:scale-[0.97] sm:w-auto"
      >
        {saving && <Loader2 className="size-4 animate-spin" />}
        {saving ? "Salvataggio…" : "Salva modifiche"}
      </Button>
    </form>
  );
}

/**
 * L'email è l'accesso: si cambia solo dopo aver dimostrato di leggere la
 * nuova casella. Clerk manda il codice e lo verifica; poi la route del sito
 * ricopia l'indirizzo sulla scheda leggendolo da Clerk (app/api/me/email).
 */
function EmailField({ current }: { current?: string }) {
  const { user } = useUser();

  const [phase, setPhase] = useState<"view" | "edit" | "code">("view");
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState<EmailAddressResource | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const shown = user?.primaryEmailAddress?.emailAddress ?? current;

  const clerkMessage = (caught: unknown) => {
    const clerkError = caught as ClerkishError;
    if (hasCode(clerkError, "form_identifier_exists")) {
      return "Questo indirizzo è già usato da un altro account.";
    }
    if (hasCode(clerkError, "session_reverification_required")) {
      return "Per sicurezza esci e rientra, poi riprova a cambiarla.";
    }
    return messageOf(clerkError);
  };

  const reset = async () => {
    // Un indirizzo aggiunto e mai verificato non deve restare appeso
    // all'account.
    if (pending && pending.verification?.status !== "verified") {
      await pending.destroy().catch(() => undefined);
    }
    setPending(null);
    setEmail("");
    setError(null);
    setPhase("view");
  };

  const sendCode = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user) return;

    const next = email.trim().toLowerCase();
    if (!next || next === shown?.toLowerCase()) {
      setError("Scrivi un indirizzo diverso da quello attuale.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const check = await fetch("/api/me/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "check", email: next }),
      });
      const payload = await check.json().catch(() => null);
      if (!check.ok) {
        setError(payload?.error ?? "Non riesco a controllare l'indirizzo.");
        return;
      }
      if (!payload?.available) {
        setError(
          "Questo indirizzo è già sulla scheda di un'altra persona: chiamaci e sistemiamo.",
        );
        return;
      }

      const address =
        user.emailAddresses.find((entry) => entry.emailAddress === next) ??
        (await user.createEmailAddress({ email: next }));
      await address.prepareVerification({ strategy: "email_code" });

      setPending(address);
      setPhase("code");
    } catch (caught) {
      setError(clerkMessage(caught));
    } finally {
      setLoading(false);
    }
  };

  const verify = async (code: string) => {
    if (!user || !pending) return false;

    setLoading(true);
    setError(null);
    try {
      const verified = await pending.attemptVerification({ code });
      const previous = user.primaryEmailAddress;

      await user.update({ primaryEmailAddressId: verified.id });
      // Il vecchio indirizzo se ne va: tenerlo vorrebbe dire poter ancora
      // entrare da una casella che la persona ha appena detto di non usare.
      if (previous && previous.id !== verified.id) {
        await previous.destroy().catch(() => undefined);
      }

      const sync = await fetch("/api/me/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "sync" }),
      });
      if (!sync.ok) {
        const payload = await sync.json().catch(() => null);
        toast.error("Accesso aggiornato, scheda no", {
          description:
            payload?.error ??
            "Entri già con il nuovo indirizzo: avvisa il club per allineare la scheda.",
        });
      } else {
        toast.success("Email aggiornata", {
          description: "D'ora in poi entri con il nuovo indirizzo.",
        });
      }

      return true;
    } catch (caught) {
      setError(clerkMessage(caught));
      return false;
    } finally {
      setLoading(false);
    }
  };

  if (phase === "code") {
    return (
      <div className="space-y-3">
        <Label>Codice di verifica</Label>
        <p className="text-muted-foreground text-sm">
          L'abbiamo mandato a <span className="text-foreground">{email}</span>.
        </p>
        <CodeFields
          email={email}
          error={error}
          onSubmit={verify}
          // A «Verificato» visto si torna alla scheda, già aggiornata.
          onVerified={() => {
            setPending(null);
            setEmail("");
            setPhase("view");
          }}
          onBack={() => void reset()}
          backLabel="Annulla il cambio"
        />
      </div>
    );
  }

  if (phase === "edit") {
    return (
      // Un modulo dentro il modulo non si può: l'invio del codice passa dal
      // bottone, e Invio nel campo fa lo stesso.
      <div className="space-y-2">
        <Label htmlFor="profile-email">Nuova email</Label>
        <Input
          id="profile-email"
          type="email"
          autoComplete="email"
          autoFocus
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") void sendCode(event);
          }}
          className={FIELD_CLASS}
        />
        <p className="text-muted-foreground text-xs leading-relaxed">
          Ti mandiamo un codice per confermare che la casella è tua.
        </p>
        {error && <p className="text-destructive text-sm">{error}</p>}
        <div className="flex flex-wrap gap-2 pt-1">
          <Button
            type="button"
            size="pill"
            disabled={loading || !email.trim()}
            onClick={(event) => void sendCode(event)}
          >
            {loading && <Loader2 className="size-4 animate-spin" />}
            Invia codice
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="pill"
            disabled={loading}
            onClick={() => void reset()}
          >
            Annulla
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-end justify-between gap-4">
      <div className="min-w-0 space-y-1">
        <p className="text-sm font-medium">Email</p>
        <p className="text-muted-foreground truncate text-sm">
          {shown ?? "Nessuna email"}
        </p>
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="shrink-0 rounded-full"
        onClick={() => setPhase("edit")}
      >
        Cambia
      </Button>
    </div>
  );
}

/** I dati del tesseramento: si leggono qui, si correggono in segreteria. */
function MembershipFacts({ profile }: { profile: Profile }) {
  const fullName =
    [profile.firstName, profile.lastName].filter(Boolean).join(" ") ||
    profile.name;

  const birth = [
    profile.birthDate ? formatClubDate(profile.birthDate) : null,
    profile.birthPlace,
  ]
    .filter(Boolean)
    .join(", ");

  const facts = [
    { label: "Nome e cognome", value: fullName },
    { label: "Nascita", value: birth || null },
    { label: "Codice fiscale", value: profile.taxCode ?? null },
  ];

  return (
    <section aria-labelledby="membership-title" className="space-y-5">
      <SectionTitle
        id="membership-title"
        title="Tesseramento"
        description="Per correggerli passa in segreteria con un documento."
      />
      <dl className="grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-3">
        {facts.map((fact) => (
          <div key={fact.label} className="min-w-0">
            <dt className="text-muted-foreground text-xs">{fact.label}</dt>
            <dd className="mt-1 truncate text-sm">
              {fact.value ?? (
                <span className="text-muted-foreground">Non indicato</span>
              )}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
