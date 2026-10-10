"use client";

import { format } from "date-fns";
import { it } from "date-fns/locale";
import {
  BadgeCheck,
  Loader2,
  MailX,
  Maximize2,
  Save,
  Send,
  Trash2,
  UserRoundCheck,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/app/(dashboard)/_components/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { findLevelRangeIndex, LEVEL_RANGES } from "@/lib/levels";
import { cn } from "@/lib/utils";

import { AccountBadge } from "./account-badge";
import { AccountSuspension } from "./account-suspension";
import { ClientPageLayout, ClientPageSkeleton } from "./client-page-layout";
import { LevelSelect } from "./level-select";
import { MembershipBadge } from "./membership-badge";
import {
  EMPTY_OPTIONAL,
  OptionalFields,
  type OptionalFieldsValue,
  optionalPayload,
} from "./optional-fields";
import { PointsTab } from "./points-tab";
import { ResidenceFields, residencePayload } from "./residence-fields";
import type { Client, ClientDetail, Gender, Residence } from "./types";

/**
 * La scheda del cliente: anagrafica, account, tessera e punti.
 *
 * Ogni linguetta risponde a una domanda diversa che lo staff si fa allo
 * sportello — «chi è», «è in regola», «quanti punti ha» — e per questo stanno
 * separate invece di essere un modulo unico da salvare tutto insieme.
 */

const GENDER_LABELS: Record<Gender, string> = {
  f: "Donna",
  m: "Uomo",
  other: "Altro",
  unspecified: "Non dichiarato",
};

const CONSENT_LABELS = {
  marketing: "Promozioni",
  newsletter: "Newsletter",
  tracking: "Statistiche",
} as const;

/** Dodici mesi: la durata dell'iscrizione, come la calcola il server. */
const MEMBERSHIP_MS = 365 * 24 * 60 * 60 * 1000;

/** Stati della tessera che meritano l'attenzione dello staff. */
const NEEDS_ATTENTION = new Set(["unpaid", "expired", "none"]);

/**
 * Il pallino sulla linguetta.
 *
 * Con tre schede il rischio è che lo staff apra solo la prima e non sappia che
 * altrove c'è qualcosa da fare — una tessera da incassare, un invito mai
 * partito. Il pallino lo dice senza costringere a cliccare in giro.
 */
function AttentionDot() {
  return (
    <span
      aria-hidden
      className="ml-1.5 size-1.5 shrink-0 rounded-full bg-amber-500"
    />
  );
}

function toDateInput(timestamp?: number): string {
  return timestamp ? new Date(timestamp).toISOString().slice(0, 10) : "";
}

function fromDateInput(value: string): number | undefined {
  return value ? new Date(`${value}T12:00:00`).getTime() : undefined;
}

/**
 * Le schede già aperte in questa sessione. Riaprirne una la mostra subito,
 * mentre quella fresca arriva dal server e prende il suo posto.
 */
const detailCache = new Map<string, ClientDetail>();

/**
 * Quello che la riga dell'elenco sa già: nome, contatti, tessera in corso.
 * Basta a non aprire una scheda vuota; il resto — indirizzo, dati sanitari,
 * storico delle tessere — arriva con la scheda completa.
 */
function previewDetail(row: Client): ClientDetail {
  const { membership, ...rest } = row;
  return { ...rest, memberships: membership ? [membership] : [] };
}

/** I valori del modulo anagrafico per una scheda, nella forma dei suoi campi. */
function formValues(detail: ClientDetail) {
  // La proposta di partenza della tessera: dove finisce quella in corso, così
  // un rinnovo anticipato non fa perdere giorni. Altrimenti oggi.
  const last = detail.memberships.reduce<number | null>(
    (latest, row) =>
      latest === null || row.endsAt > latest ? row.endsAt : latest,
    null,
  );

  return {
    firstName: detail.firstName ?? "",
    lastName: detail.lastName ?? "",
    email: detail.email ?? "",
    phone: detail.phone ?? "",
    birthDate: toDateInput(detail.birthDate),
    birthPlace: detail.birthPlace ?? "",
    gender: detail.gender,
    level: detail.level as number | undefined,
    residence: (detail.residence ?? {}) as Residence,
    optional: {
      taxCode: detail.taxCode ?? "",
      health: detail.health ?? {},
      clubNotes: detail.clubNotes ?? "",
    } as OptionalFieldsValue,
    startsAt: toDateInput(last && last > Date.now() ? last : Date.now()),
  };
}

type FormValues = ReturnType<typeof formValues>;

function sameValue(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/**
 * La scheda nel pannello laterale: si apre dall'elenco senza perderlo di
 * vista. Accanto alla X c'è il tasto che la porta a tutta pagina, per quando
 * con quella persona c'è da lavorare con calma.
 */
export function ClientSheet({
  playerId,
  preview,
  open,
  onOpenChange,
  onSaved,
}: {
  playerId: string | null;
  /** La riga dell'elenco, per mostrare subito quello che si sa già. */
  preview?: Client;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full max-w-full flex-col gap-0 overflow-hidden sm:max-w-lg">
        {playerId && (
          <Link
            href={`/dashboard/clients/${playerId}`}
            aria-label="Apri la pagina del cliente"
            title="Apri a tutta pagina"
            className="ring-offset-background focus:ring-ring absolute top-4 right-11 z-10 rounded-xs opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden"
          >
            <Maximize2 className="size-4" />
          </Link>
        )}
        <ClientDetailView
          playerId={playerId}
          preview={preview}
          active={open}
          variant="sheet"
          onSaved={onSaved}
          onRemoved={() => {
            onOpenChange(false);
            onSaved();
          }}
        />
      </SheetContent>
    </Sheet>
  );
}

/**
 * Il contenuto della scheda: dati, salvataggi e linguette.
 *
 * Lo usano due contenitori, il pannello laterale e la pagina dedicata, che
 * cambiano solo l'impaginazione. La logica sta qui una volta sola: due copie
 * di un modulo anagrafico prima o poi salvano in due modi diversi.
 */
export function ClientDetailView({
  playerId,
  preview,
  active,
  variant,
  onSaved,
  onRemoved,
}: {
  playerId: string | null;
  preview?: Client;
  /** Falso a pannello chiuso: niente da caricare. */
  active: boolean;
  variant: "sheet" | "page";
  onSaved: () => void;
  onRemoved: () => void;
}) {
  const [client, setClient] = useState<ClientDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  // Falso finché a video c'è solo l'anteprima dell'elenco: si legge, ma non si
  // salva niente — un salvataggio adesso cancellerebbe i campi non ancora arrivati.
  const [complete, setComplete] = useState(false);
  const busy = saving || !complete;

  // Anagrafica
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [birthPlace, setBirthPlace] = useState("");
  const [gender, setGender] = useState<Gender | undefined>();
  const [level, setLevel] = useState<number | undefined>();
  const [residence, setResidence] = useState<Residence>({});
  const [optional, setOptional] = useState<OptionalFieldsValue>(EMPTY_OPTIONAL);

  // Tessera
  const [paid, setPaid] = useState(true);
  const [method, setMethod] = useState<"cash" | "pos">("cash");
  const [amount, setAmount] = useState("");
  const [startsAt, setStartsAt] = useState("");

  const form: FormValues = {
    firstName,
    lastName,
    email,
    phone,
    birthDate,
    birthPlace,
    gender,
    level,
    residence,
    optional,
    startsAt,
  };
  const formRef = useRef(form);
  formRef.current = form;

  const setters: { [K in keyof FormValues]: (value: FormValues[K]) => void } = {
    firstName: setFirstName,
    lastName: setLastName,
    email: setEmail,
    phone: setPhone,
    birthDate: setBirthDate,
    birthPlace: setBirthPlace,
    gender: setGender,
    level: setLevel,
    residence: setResidence,
    optional: setOptional,
    startsAt: setStartsAt,
  };
  const settersRef = useRef(setters);

  // L'anteprima si legge una volta, all'apertura: l'elenco che si ricarica
  // dopo un salvataggio non deve far ripartire la scheda.
  const previewRef = useRef(preview);
  previewRef.current = preview;

  useEffect(() => {
    if (!playerId || !active) return;

    let cancelled = false;

    /**
     * Riempie il modulo. Con `seeded` tocca solo i campi rimasti come li
     * aveva lasciati l'anteprima: quello che lo staff ha già corretto nel
     * frattempo non viene sovrascritto dal server.
     */
    const fill = (next: FormValues, seeded?: FormValues) => {
      for (const key of Object.keys(next) as (keyof FormValues)[]) {
        if (seeded && !sameValue(formRef.current[key], seeded[key])) continue;
        (settersRef.current[key] as (value: unknown) => void)(next[key]);
      }
    };

    const cached = detailCache.get(playerId);
    const row =
      previewRef.current?.id === playerId ? previewRef.current : undefined;
    const seed = cached ?? (row ? previewDetail(row) : null);
    const seededForm = seed ? formValues(seed) : undefined;

    setClient(seed);
    if (seededForm) fill(seededForm);
    setComplete(Boolean(cached));
    setLoading(!seed);

    fetch(`/api/dashboard/clients/${playerId}`)
      .then((response) => response.json())
      .then((payload) => {
        if (cancelled) return;

        const detail: ClientDetail | undefined = payload?.client;
        if (!detail) {
          toast.error(payload?.error ?? "Scheda non disponibile.");
          return;
        }

        detailCache.set(playerId, detail);
        setClient(detail);
        fill(formValues(detail), seededForm);
        setComplete(true);
      })
      .catch(() => {
        if (!cancelled) toast.error("Scheda non disponibile.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [playerId, active]);

  /** Ricarica la scheda dopo un'azione che ne cambia lo stato. */
  const refresh = async () => {
    if (!playerId) return;
    const payload = await fetch(`/api/dashboard/clients/${playerId}`)
      .then((response) => response.json())
      .catch(() => null);
    if (payload?.client) {
      detailCache.set(playerId, payload.client);
      setClient(payload.client);
    }
  };

  const invite = async () => {
    if (!playerId) return;

    setSaving(true);
    try {
      const response = await fetch(
        `/api/dashboard/clients/${playerId}/invite`,
        { method: "POST" },
      );
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        toast.error("Invito non inviato", {
          description: payload?.error ?? "Riprova fra poco.",
        });
        return;
      }

      const resent = (payload?.sentCount ?? 1) > 1;

      // La mail può non partire (Resend non configurato, o giù): l'invito
      // esiste lo stesso, e il link va dato a voce invece di far credere allo
      // staff che la persona l'abbia ricevuto.
      toast[payload?.mailed ? "success" : "warning"](
        payload?.mailed
          ? resent
            ? "Invito rimandato"
            : "Invito inviato"
          : "Invito creato, mail non partita",
        {
          description: payload?.mailed
            ? "Riceverà il link per attivare il suo account. Il link precedente, se c'era, non vale più."
            : `Manda tu il link: ${payload?.joinUrl ?? ""}`,
          duration: payload?.mailed ? 5000 : Number.POSITIVE_INFINITY,
        },
      );

      onSaved();
      await refresh();
    } catch {
      toast.error("Invito non inviato", {
        description: "Controlla la connessione e riprova.",
      });
    } finally {
      setSaving(false);
    }
  };

  const revokeInvite = async () => {
    if (!playerId) return;

    setSaving(true);
    try {
      const response = await fetch(
        `/api/dashboard/clients/${playerId}/invite`,
        { method: "DELETE" },
      );
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        toast.error("Invito non annullato", {
          description: payload?.error ?? "Riprova fra poco.",
        });
        return;
      }

      toast.success("Invito annullato", {
        description:
          "Il link non funziona più e la scheda torna senza account.",
      });

      onSaved();
      await refresh();
    } catch {
      toast.error("Invito non annullato", {
        description: "Controlla la connessione e riprova.",
      });
    } finally {
      setSaving(false);
    }
  };

  const removeClient = async () => {
    if (!playerId) return;

    setSaving(true);
    try {
      const response = await fetch(`/api/dashboard/clients/${playerId}`, {
        method: "DELETE",
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        toast.error("Scheda non eliminata", {
          description: payload?.error ?? "Riprova fra poco.",
        });
        return;
      }

      toast.success("Scheda eliminata");
      onRemoved();
    } catch {
      toast.error("Scheda non eliminata", {
        description: "Controlla la connessione e riprova.",
      });
    } finally {
      setSaving(false);
    }
  };

  /** Eliminare un cliente non è un gesto da fare di sfuggita. */
  const confirmRemove = () => {
    toast("Eliminare questa scheda?", {
      description: (
        <>
          <span className="font-medium">{client?.name}</span> sparisce
          dall'anagrafica insieme alle sue tessere. Non è reversibile.
          <div className="mt-3 flex gap-2">
            <Button
              variant="outline"
              className="flex-1 bg-transparent"
              onClick={() => toast.dismiss()}
            >
              Annulla
            </Button>
            <Button
              variant="destructive"
              className="flex-1"
              onClick={() => {
                toast.dismiss();
                void removeClient();
              }}
            >
              <Trash2 className="size-4" />
              Elimina
            </Button>
          </div>
        </>
      ),
      duration: Number.POSITIVE_INFINITY,
    });
  };

  const saveProfile = async () => {
    if (!playerId) return;

    setSaving(true);
    try {
      const response = await fetch(`/api/dashboard/clients/${playerId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: firstName.trim() || undefined,
          lastName: lastName.trim() || undefined,
          email: email.trim().toLowerCase() || undefined,
          phone: phone.trim() || undefined,
          birthDate: fromDateInput(birthDate),
          birthPlace: birthPlace.trim() || undefined,
          gender,
          // Solo se lo staff ha cambiato fascia: chi si è valutato 3.5 da solo
          // non deve ritrovarsi a 4 per aver corretto il telefono.
          level: level !== client?.level ? level : undefined,
          residence: residencePayload(residence),
          ...optionalPayload(optional),
        }),
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        toast.error("Dati non salvati", {
          description: payload?.error ?? "Riprova fra poco.",
        });
        return;
      }

      toast.success("Anagrafica aggiornata");
      onSaved();
      await refresh();
    } catch {
      toast.error("Dati non salvati", {
        description: "Controlla la connessione e riprova.",
      });
    } finally {
      setSaving(false);
    }
  };

  const saveMembership = async () => {
    if (!playerId) return;

    setSaving(true);
    try {
      const response = await fetch(
        `/api/dashboard/clients/${playerId}/membership`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            paid,
            method: paid ? method : undefined,
            amount: amount ? Number(amount) : undefined,
            startsAt: fromDateInput(startsAt),
          }),
        },
      );

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        toast.error("Tessera non salvata", {
          description: payload?.error ?? "Riprova fra poco.",
        });
        return;
      }

      toast.success(payload?.renewed ? "Tessera rinnovata" : "Tessera aperta", {
        description: paid
          ? "Iscrizione valida per dodici mesi, quota registrata."
          : "Iscrizione aperta: risulterà da pagare finché non incassate.",
      });

      onSaved();
      // Ricarica la scheda per mostrare la nuova riga nello storico.
      await refresh();
    } catch {
      toast.error("Tessera non salvata", {
        description: "Controlla la connessione e riprova.",
      });
    } finally {
      setSaving(false);
    }
  };

  const current = client?.memberships[0];

  // La scadenza che la data scelta produrrà: si vede prima di salvare.
  const chosenStart = fromDateInput(startsAt);
  const membershipEnd = chosenStart ? chosenStart + MEMBERSHIP_MS : null;

  if (loading || !client) {
    return variant === "page" ? (
      <ClientPageSkeleton />
    ) : (
      <div className="space-y-4 p-6">
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  const isPage = variant === "page";

  /**
   * L'anagrafica, in tre gruppi nell'ordine in cui la si chiede allo
   * sportello: chi è, come si raggiunge, dove abita. I campi corti stanno a
   * due a due anche da telefono (nome e cognome, città e CAP) e il facoltativo
   * resta richiuso in fondo. Fra un gruppo e l'altro c'è più aria che fra i
   * campi: è questo che fa leggere i gruppi senza bisogno di riquadri.
   *
   * Da telefono i campi sono alti 44px, il bersaglio di un pollice; da
   * desktop tornano alla misura del resto della dashboard. Le etichette si
   * uniformano da qui, comprese quelle dei campi condivisi (residenza,
   * facoltativi).
   */
  const profileForm = (
    <div className="space-y-8 [&_[data-slot=input]]:h-11 [&_[data-slot=label]]:font-normal [&_[data-slot=label]]:text-muted-foreground [&_[data-slot=select-trigger]]:h-11 md:[&_[data-slot=input]]:h-9 md:[&_[data-slot=select-trigger]]:h-9">
      <FormSection title="Persona">
        <div className="grid grid-cols-2 gap-x-3 gap-y-5">
          <FormField label="Nome" htmlFor="sheet-firstName">
            <Input
              id="sheet-firstName"
              autoComplete="given-name"
              value={firstName}
              onChange={(event) => setFirstName(event.target.value)}
            />
          </FormField>
          <FormField label="Cognome" htmlFor="sheet-lastName">
            <Input
              id="sheet-lastName"
              autoComplete="family-name"
              value={lastName}
              onChange={(event) => setLastName(event.target.value)}
            />
          </FormField>
          <FormField label="Sesso" htmlFor="sheet-gender">
            <Select
              value={gender}
              onValueChange={(value) => setGender(value as Gender)}
            >
              <SelectTrigger id="sheet-gender" className="w-full">
                <SelectValue placeholder="Non indicato" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(GENDER_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
          <FormField label="Livello" htmlFor="sheet-level">
            <LevelSelect
              id="sheet-level"
              value={findLevelRangeIndex(level)}
              onValueChange={(index) => setLevel(LEVEL_RANGES[index].level)}
            />
          </FormField>
          <FormField label="Data di nascita" htmlFor="sheet-birth">
            <Input
              id="sheet-birth"
              type="date"
              value={birthDate}
              onChange={(event) => setBirthDate(event.target.value)}
            />
          </FormField>
          <FormField label="Luogo di nascita" htmlFor="sheet-birthPlace">
            <Input
              id="sheet-birthPlace"
              value={birthPlace}
              onChange={(event) => setBirthPlace(event.target.value)}
            />
          </FormField>
        </div>
      </FormSection>

      <FormSection
        title="Contatti"
        note={
          client.account.state === "none"
            ? "L'email si può ancora correggere: diventerà l'identità dell'account quando lo inviterai."
            : "L'email appartiene all'account e si cambia da lì."
        }
      >
        <div className="grid gap-x-3 gap-y-5 sm:grid-cols-2">
          <FormField label="Telefono" htmlFor="sheet-phone">
            <Input
              id="sheet-phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
            />
          </FormField>
          <FormField label="Email" htmlFor="sheet-email">
            <Input
              id="sheet-email"
              type="email"
              inputMode="email"
              autoComplete="email"
              value={email}
              disabled={client.account.state !== "none"}
              onChange={(event) => setEmail(event.target.value)}
            />
          </FormField>
        </div>
      </FormSection>

      <FormSection title="Residenza">
        <div className="grid grid-cols-[minmax(0,1fr)_6.5rem] gap-x-3 gap-y-5">
          <ResidenceFields
            value={residence}
            onChange={setResidence}
            idPrefix="sheet"
          />
        </div>
      </FormSection>

      <OptionalFields
        value={optional}
        onChange={setOptional}
        idPrefix="sheet"
      />
    </div>
  );

  const tabs = (
    <Tabs
      defaultValue="profile"
      className={cn("flex flex-col gap-0", isPage ? "" : "min-h-0 flex-1")}
    >
      {/*
       * A tutta pagina, da telefono, le linguette restano in alto mentre si
       * scorre il modulo: con l'anagrafica lunga, cambiare linguetta non deve
       * voler dire tornare su. Il fondo è traslucido e arriva ai bordi
       * (`-mx-4`), come la barra in basso.
       */}
      <div
        className={cn(
          "shrink-0",
          isPage
            ? "dashboard-material bg-background/85 sticky top-0 z-20 -mx-4 px-4 pt-[calc(env(safe-area-inset-top)+0.5rem)] pb-3 backdrop-blur-xl md:static md:mx-0 md:border-b md:bg-transparent md:px-5 md:pt-4 md:backdrop-blur-none"
            : "px-4 pt-3 pb-1",
        )}
      >
        <TabsList className={cn(!isPage && "md:w-full")}>
          <TabsTrigger value="profile" className="flex-1">
            Anagrafica
            {client.missingFields.length > 0 && <AttentionDot />}
          </TabsTrigger>
          <TabsTrigger value="account" className="flex-1">
            Account
            {client.account.state !== "active" && <AttentionDot />}
          </TabsTrigger>
          <TabsTrigger value="membership" className="flex-1">
            Iscrizione
            {NEEDS_ATTENTION.has(client.membershipState) && <AttentionDot />}
          </TabsTrigger>
          <TabsTrigger value="points" className="flex-1">
            Punti
          </TabsTrigger>
        </TabsList>
      </div>

      {/*
       * L'unico elemento che scorre, e solo in verticale: `overflow-x`
       * resta esplicito perché con `overflow-y: auto` il browser
       * promuoverebbe da solo anche l'asse orizzontale, regalando una
       * barra di troppo al primo campo che sborda.
       *
       * Il fondo somma due cose diverse: l'aria che serve all'ultimo
       * bottone per non stare appiccicato al bordo, e l'incavo del
       * telefono (`env`), che su desktop vale zero. Sommate e non
       * alternative — con `max()` la barra di sistema si mangerebbe lo
       * spazio del bottone invece di aggiungersi.
       */}
      <div
        className={cn(
          isPage
            ? "pb-6 md:px-5"
            : "min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain px-4 pb-[calc(2.5rem+env(safe-area-inset-bottom))]",
        )}
      >
        <TabsContent value="profile" className="space-y-8 pt-5">
          {profileForm}

          <Button
            className="h-11 w-full rounded-xl md:h-9 md:w-auto md:rounded-md"
            onClick={() => void saveProfile()}
            disabled={busy}
          >
            {saving ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Save className="size-4" />
            )}
            Salva anagrafica
          </Button>

          {client.account.state === "none" && (
            <div className="border-t pt-4">
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive"
                onClick={confirmRemove}
                disabled={busy}
              >
                <Trash2 className="size-4" />
                Elimina questa scheda
              </Button>
              <p className="text-muted-foreground mt-1 text-xs">
                Possibile finché la persona non ha un account né prenotazioni
                alle spalle.
              </p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="account" className="space-y-3 pt-4">
          {client.account.state === "none" && (
            <>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {email.trim()
                  ? "Questa persona non ha ancora un modo per entrare. Invitandola riceverà un link per attivare l'account: da lì prenota online, senza password."
                  : "Per invitare questa persona serve un indirizzo email: aggiungilo qui sopra e salva l'anagrafica."}
              </p>

              <Button
                onClick={() => void invite()}
                disabled={busy || !email.trim()}
              >
                {saving ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Send className="size-4" />
                )}
                Invita ad attivare l'account
              </Button>
            </>
          )}

          {client.account.state === "invited" && (
            <>
              <div className="rounded-lg border bg-muted/20 p-3 text-sm">
                <p className="font-medium">
                  Invitato il{" "}
                  {client.account.invitedAt
                    ? format(client.account.invitedAt, "d MMMM yyyy", {
                        locale: it,
                      })
                    : "—"}
                </p>
                <p className="text-muted-foreground mt-1 text-xs">
                  {(client.account.sentCount ?? 1) > 1
                    ? `Mail inviata ${client.account.sentCount} volte, l'ultima il ${
                        client.account.lastSentAt
                          ? format(client.account.lastSentAt, "d MMM", {
                              locale: it,
                            })
                          : "—"
                      }.`
                    : "Non ha ancora attivato l'account."}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  onClick={() => void invite()}
                  disabled={busy}
                >
                  {saving ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Send className="size-4" />
                  )}
                  Rimanda invito
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => void revokeInvite()}
                  disabled={busy}
                >
                  <MailX className="size-4" />
                  Annulla invito
                </Button>
              </div>
            </>
          )}

          {client.account.state === "active" && (
            <>
              {!client.suspension && (
                <div className="flex items-start gap-2.5 rounded-lg border bg-muted/20 p-3 text-sm">
                  <UserRoundCheck className="mt-0.5 size-4 shrink-0" />
                  <div>
                    <p className="font-medium">Account attivo</p>
                    <p className="text-muted-foreground mt-0.5 text-xs">
                      {client.account.acceptedAt
                        ? `Attivato il ${format(client.account.acceptedAt, "d MMMM yyyy", { locale: it })}: prenota dal sito e dall'app.`
                        : "Prenota dal sito e dall'app."}
                    </p>
                  </div>
                </div>
              )}
              <AccountSuspension
                client={client}
                disabled={busy}
                onChanged={async () => {
                  onSaved();
                  await refresh();
                }}
              />
            </>
          )}
        </TabsContent>

        <TabsContent value="membership" className="space-y-4 pt-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Tessera annuale</h3>
            {client.consents && (
              <div className="flex gap-1.5">
                {Object.entries(CONSENT_LABELS).map(([key, label]) =>
                  client.consents?.[key as keyof typeof CONSENT_LABELS] ? (
                    <Badge
                      key={key}
                      variant="outline"
                      className="bg-white font-normal"
                    >
                      {label}
                    </Badge>
                  ) : null,
                )}
              </div>
            )}
          </div>

          {current ? (
            <div className="rounded-lg border bg-muted/20 p-3 text-sm">
              <p className="font-medium">
                {format(current.startsAt, "d MMM yyyy", { locale: it })} –{" "}
                {format(current.endsAt, "d MMM yyyy", { locale: it })}
              </p>
              <p className="text-muted-foreground mt-1 text-xs">
                {current.paid
                  ? `Pagata${current.paidAt ? ` il ${format(current.paidAt, "d MMM yyyy", { locale: it })}` : ""}${current.method ? ` · ${current.method === "cash" ? "contanti" : "POS"}` : ""}${current.amount ? ` · ${current.amount} EUR` : ""}`
                  : "Non ancora saldata"}
              </p>
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">
              Nessuna tessera: questa persona non risulta iscritta.
            </p>
          )}

          <div className="space-y-3 rounded-lg border p-3">
            <p className="text-sm font-medium">
              {current ? "Rinnova per un altro anno" : "Apri l'iscrizione"}
            </p>

            <div className="space-y-1.5">
              <Label htmlFor="startsAt">Data di inizio</Label>
              <Input
                id="startsAt"
                type="date"
                value={startsAt}
                onChange={(event) => setStartsAt(event.target.value)}
              />
              <p className="text-muted-foreground text-xs">
                {membershipEnd
                  ? `Valida fino al ${format(membershipEnd, "d MMMM yyyy", { locale: it })}.`
                  : "Dodici mesi da questa data."}{" "}
                Si può mettere una data passata, per registrare un'iscrizione
                già avvenuta quest'anno.
              </p>
            </div>

            <label
              htmlFor="paid"
              className="flex cursor-pointer items-center gap-2 text-sm"
            >
              <Checkbox
                id="paid"
                checked={paid}
                onCheckedChange={(checked) => setPaid(Boolean(checked))}
              />
              Quota già incassata
            </label>

            {paid && (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="method">Modalità</Label>
                  <Select
                    value={method}
                    onValueChange={(value) =>
                      setMethod(value as "cash" | "pos")
                    }
                  >
                    <SelectTrigger id="method" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Contanti</SelectItem>
                      <SelectItem value="pos">POS</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="amount">Importo (EUR)</Label>
                  <Input
                    id="amount"
                    type="number"
                    inputMode="decimal"
                    min={0}
                    placeholder="facoltativo"
                    value={amount}
                    onChange={(event) => setAmount(event.target.value)}
                  />
                </div>
              </div>
            )}

            <Button
              onClick={() => void saveMembership()}
              disabled={busy}
              className="w-full"
            >
              {saving ? (
                <Loader2 className="size-4 animate-spin" />
              ) : current ? (
                <BadgeCheck className="size-4" />
              ) : (
                <Wallet className="size-4" />
              )}
              {current ? "Rinnova per 12 mesi" : "Iscrivi per 12 mesi"}
            </Button>

            <p className="text-muted-foreground text-xs leading-relaxed">
              La data proposta è quella in cui finisce la tessera in corso, così
              chi rinnova in anticipo non perde giorni.
            </p>
          </div>

          {client.memberships.length > 1 && (
            <div>
              <p className="text-muted-foreground mb-2 text-xs tracking-wide uppercase">
                Storico
              </p>
              <ul className="space-y-1.5 text-xs">
                {client.memberships.slice(1).map((membership) => (
                  <li
                    key={membership.id}
                    className="text-muted-foreground flex justify-between gap-3"
                  >
                    <span>
                      {format(membership.startsAt, "MMM yyyy", {
                        locale: it,
                      })}{" "}
                      –{" "}
                      {format(membership.endsAt, "MMM yyyy", {
                        locale: it,
                      })}
                    </span>
                    <span>
                      {membership.paid
                        ? `pagata${membership.method ? ` · ${membership.method === "cash" ? "contanti" : "POS"}` : ""}`
                        : "non pagata"}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </TabsContent>

        <TabsContent value="points">
          <PointsTab
            playerId={client.id}
            hasEmail={Boolean(client.email)}
            onChanged={() => {
              onSaved();
              // Il saldo compare anche in testa alla pagina.
              void refresh();
            }}
          />
        </TabsContent>
      </div>
    </Tabs>
  );

  if (isPage) {
    return (
      <ClientPageLayout client={client} current={current}>
        {tabs}
      </ClientPageLayout>
    );
  }

  return (
    <>
      <SheetHeader className="shrink-0 border-b pr-20 pb-3">
        <div className="flex items-center gap-3">
          <Avatar className="size-11">
            {client.avatarUrl && <AvatarImage src={client.avatarUrl} />}
            <AvatarFallback>
              {client.name.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <SheetTitle className="truncate">{client.name}</SheetTitle>
            <SheetDescription className="truncate">
              {client.email ?? "Email non disponibile"}
            </SheetDescription>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 pt-1">
          <MembershipBadge
            state={client.membershipState}
            until={
              current
                ? format(current.endsAt, "d MMM yyyy", { locale: it })
                : undefined
            }
          />
          <AccountBadge
            state={client.account.state}
            suspended={Boolean(client.suspension)}
          />
          {client.code && (
            <Badge variant="outline" className="font-mono">
              #{client.code}
            </Badge>
          )}
        </div>
      </SheetHeader>

      <Tabs
        defaultValue="profile"
        className={cn("flex flex-col gap-0", isPage ? "" : "min-h-0 flex-1")}
      >
        <div
          className={cn(
            "shrink-0",
            isPage ? "border-b px-5 pt-4 pb-3" : "px-4 pt-3 pb-1",
          )}
        >
          <TabsList className={cn(!isPage && "md:w-full")}>
            <TabsTrigger value="profile" className="flex-1">
              Anagrafica
              {client.missingFields.length > 0 && <AttentionDot />}
            </TabsTrigger>
            <TabsTrigger value="account" className="flex-1">
              Account
              {client.account.state !== "active" && <AttentionDot />}
            </TabsTrigger>
            <TabsTrigger value="membership" className="flex-1">
              Iscrizione
              {NEEDS_ATTENTION.has(client.membershipState) && <AttentionDot />}
            </TabsTrigger>
            <TabsTrigger value="points" className="flex-1">
              Punti
            </TabsTrigger>
          </TabsList>
        </div>

        {/*
         * L'unico elemento che scorre, e solo in verticale: `overflow-x`
         * resta esplicito perché con `overflow-y: auto` il browser
         * promuoverebbe da solo anche l'asse orizzontale, regalando una
         * barra di troppo al primo campo che sborda.
         *
         * Il fondo somma due cose diverse: l'aria che serve all'ultimo
         * bottone per non stare appiccicato al bordo, e l'incavo del
         * telefono (`env`), che su desktop vale zero. Sommate e non
         * alternative — con `max()` la barra di sistema si mangerebbe lo
         * spazio del bottone invece di aggiungersi.
         */}
        <div
          className={cn(
            isPage
              ? "px-5 pb-6"
              : "min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain px-4 pb-[calc(2.5rem+env(safe-area-inset-bottom))]",
          )}
        >
          <TabsContent value="profile" className="space-y-8 pt-5">
            {profileForm}

            <Button
              className="h-11 w-full rounded-xl md:h-9 md:w-auto md:rounded-md"
              onClick={() => void saveProfile()}
              disabled={busy}
            >
              {saving ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Save className="size-4" />
              )}
              Salva anagrafica
            </Button>

            {client.account.state === "none" && (
              <div className="border-t pt-4">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={confirmRemove}
                  disabled={busy}
                >
                  <Trash2 className="size-4" />
                  Elimina questa scheda
                </Button>
                <p className="text-muted-foreground mt-1 text-xs">
                  Possibile finché la persona non ha un account né prenotazioni
                  alle spalle.
                </p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="account" className="space-y-3 pt-4">
            {client.account.state === "none" && (
              <>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {email.trim()
                    ? "Questa persona non ha ancora un modo per entrare. Invitandola riceverà un link per attivare l'account: da lì prenota online, senza password."
                    : "Per invitare questa persona serve un indirizzo email: aggiungilo qui sopra e salva l'anagrafica."}
                </p>

                <Button
                  onClick={() => void invite()}
                  disabled={busy || !email.trim()}
                >
                  {saving ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Send className="size-4" />
                  )}
                  Invita ad attivare l'account
                </Button>
              </>
            )}

            {client.account.state === "invited" && (
              <>
                <div className="rounded-lg border bg-muted/20 p-3 text-sm">
                  <p className="font-medium">
                    Invitato il{" "}
                    {client.account.invitedAt
                      ? format(client.account.invitedAt, "d MMMM yyyy", {
                          locale: it,
                        })
                      : "—"}
                  </p>
                  <p className="text-muted-foreground mt-1 text-xs">
                    {(client.account.sentCount ?? 1) > 1
                      ? `Mail inviata ${client.account.sentCount} volte, l'ultima il ${
                          client.account.lastSentAt
                            ? format(client.account.lastSentAt, "d MMM", {
                                locale: it,
                              })
                            : "—"
                        }.`
                      : "Non ha ancora attivato l'account."}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    onClick={() => void invite()}
                    disabled={busy}
                  >
                    {saving ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Send className="size-4" />
                    )}
                    Rimanda invito
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => void revokeInvite()}
                    disabled={busy}
                  >
                    <MailX className="size-4" />
                    Annulla invito
                  </Button>
                </div>
              </>
            )}

            {client.account.state === "active" && (
              <>
                {!client.suspension && (
                  <div className="flex items-start gap-2.5 rounded-lg border bg-muted/20 p-3 text-sm">
                    <UserRoundCheck className="mt-0.5 size-4 shrink-0" />
                    <div>
                      <p className="font-medium">Account attivo</p>
                      <p className="text-muted-foreground mt-0.5 text-xs">
                        {client.account.acceptedAt
                          ? `Attivato il ${format(client.account.acceptedAt, "d MMMM yyyy", { locale: it })}: prenota dal sito e dall'app.`
                          : "Prenota dal sito e dall'app."}
                      </p>
                    </div>
                  </div>
                )}
                <AccountSuspension
                  client={client}
                  disabled={busy}
                  onChanged={async () => {
                    onSaved();
                    await refresh();
                  }}
                />
              </>
            )}
          </TabsContent>

          <TabsContent value="membership" className="space-y-4 pt-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Tessera annuale</h3>
              {client.consents && (
                <div className="flex gap-1.5">
                  {Object.entries(CONSENT_LABELS).map(([key, label]) =>
                    client.consents?.[key as keyof typeof CONSENT_LABELS] ? (
                      <Badge
                        key={key}
                        variant="outline"
                        className="bg-white font-normal"
                      >
                        {label}
                      </Badge>
                    ) : null,
                  )}
                </div>
              )}
            </div>

            {current ? (
              <div className="rounded-lg border bg-muted/20 p-3 text-sm">
                <p className="font-medium">
                  {format(current.startsAt, "d MMM yyyy", { locale: it })} –{" "}
                  {format(current.endsAt, "d MMM yyyy", { locale: it })}
                </p>
                <p className="text-muted-foreground mt-1 text-xs">
                  {current.paid
                    ? `Pagata${current.paidAt ? ` il ${format(current.paidAt, "d MMM yyyy", { locale: it })}` : ""}${current.method ? ` · ${current.method === "cash" ? "contanti" : "POS"}` : ""}${current.amount ? ` · ${current.amount} EUR` : ""}`
                    : "Non ancora saldata"}
                </p>
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">
                Nessuna tessera: questa persona non risulta iscritta.
              </p>
            )}

            <div className="space-y-3 rounded-lg border p-3">
              <p className="text-sm font-medium">
                {current ? "Rinnova per un altro anno" : "Apri l'iscrizione"}
              </p>

              <div className="space-y-1.5">
                <Label htmlFor="startsAt">Data di inizio</Label>
                <Input
                  id="startsAt"
                  type="date"
                  value={startsAt}
                  onChange={(event) => setStartsAt(event.target.value)}
                />
                <p className="text-muted-foreground text-xs">
                  {membershipEnd
                    ? `Valida fino al ${format(membershipEnd, "d MMMM yyyy", { locale: it })}.`
                    : "Dodici mesi da questa data."}{" "}
                  Si può mettere una data passata, per registrare un'iscrizione
                  già avvenuta quest'anno.
                </p>
              </div>

              <label
                htmlFor="paid"
                className="flex cursor-pointer items-center gap-2 text-sm"
              >
                <Checkbox
                  id="paid"
                  checked={paid}
                  onCheckedChange={(checked) => setPaid(Boolean(checked))}
                />
                Quota già incassata
              </label>

              {paid && (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="method">Modalità</Label>
                    <Select
                      value={method}
                      onValueChange={(value) =>
                        setMethod(value as "cash" | "pos")
                      }
                    >
                      <SelectTrigger id="method" className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash">Contanti</SelectItem>
                        <SelectItem value="pos">POS</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="amount">Importo (EUR)</Label>
                    <Input
                      id="amount"
                      type="number"
                      inputMode="decimal"
                      min={0}
                      placeholder="facoltativo"
                      value={amount}
                      onChange={(event) => setAmount(event.target.value)}
                    />
                  </div>
                </div>
              )}

              <Button
                onClick={() => void saveMembership()}
                disabled={busy}
                className="w-full"
              >
                {saving ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : current ? (
                  <BadgeCheck className="size-4" />
                ) : (
                  <Wallet className="size-4" />
                )}
                {current ? "Rinnova per 12 mesi" : "Iscrivi per 12 mesi"}
              </Button>

              <p className="text-muted-foreground text-xs leading-relaxed">
                La data proposta è quella in cui finisce la tessera in corso,
                così chi rinnova in anticipo non perde giorni.
              </p>
            </div>

            {client.memberships.length > 1 && (
              <div>
                <p className="text-muted-foreground mb-2 text-xs tracking-wide uppercase">
                  Storico
                </p>
                <ul className="space-y-1.5 text-xs">
                  {client.memberships.slice(1).map((membership) => (
                    <li
                      key={membership.id}
                      className="text-muted-foreground flex justify-between gap-3"
                    >
                      <span>
                        {format(membership.startsAt, "MMM yyyy", {
                          locale: it,
                        })}{" "}
                        –{" "}
                        {format(membership.endsAt, "MMM yyyy", {
                          locale: it,
                        })}
                      </span>
                      <span>
                        {membership.paid
                          ? `pagata${membership.method ? ` · ${membership.method === "cash" ? "contanti" : "POS"}` : ""}`
                          : "non pagata"}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </TabsContent>

          <TabsContent value="points">
            <PointsTab
              playerId={client.id}
              hasEmail={Boolean(client.email)}
              onChanged={() => {
                onSaved();
                // Il saldo compare anche in testa alla pagina.
                void refresh();
              }}
            />
          </TabsContent>
        </div>
      </Tabs>
    </>
  );
}

/** Un gruppo del modulo: titolo, campi, e la nota che li riguarda tutti. */
function FormSection({
  title,
  note,
  children,
}: {
  title: string;
  note?: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-4">
      <h3 className="text-[15px] font-semibold tracking-[-0.01em]">{title}</h3>
      {children}
      {note && (
        <p className="text-muted-foreground text-xs leading-relaxed">{note}</p>
      )}
    </section>
  );
}

/** Etichetta sopra, campo sotto, sempre alla stessa distanza. */
function FormField({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: ReactNode;
}) {
  return (
    <div className="min-w-0 space-y-2">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  );
}
