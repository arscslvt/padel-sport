"use client";

import { Loader2, UserPlus } from "lucide-react";
import { type KeyboardEvent, type ReactNode, useEffect, useState } from "react";
import { toast } from "sonner";

import { SheetHeader } from "@/app/_components/sheet-header";
import { useConfirmLeave } from "@/app/_providers/confirm.provider";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ResponsiveDrawer,
  ResponsiveDrawerContent,
  ResponsiveDrawerFooter,
  useResponsiveDrawer,
} from "@/components/ui/responsive-drawer";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LEVEL_RANGES } from "@/lib/levels";
import { LevelSelect } from "./level-select";
import {
  EMPTY_OPTIONAL,
  OptionalFields,
  type OptionalFieldsValue,
  optionalPayload,
} from "./optional-fields";
import { ResidenceFields, residencePayload } from "./residence-fields";
import type { Gender, Residence } from "./types";

/**
 * La scheda di un cliente nuovo, compilata allo sportello.
 *
 * Chi si presenta al banco i dati li dà lì: registrarli non deve dipendere dal
 * fatto che poi apra una mail. Nessun invito parte da qui — l'account è un
 * secondo gesto, deliberato, che si fa dalla scheda quando serve.
 *
 * Anche l'email è facoltativa: senza, il cliente esiste, paga la quota e gioca.
 * Semplicemente non lo si può ancora invitare, e la scheda lo dice.
 *
 * Da telefono è un drawer dal basso, da desktop una modale (ResponsiveDrawer),
 * come gli altri moduli della dashboard:
 * - la tastiera la gestisce KeyboardInset (layout principale): il drawer si
 *   appoggia sopra e il campo attivo resta in vista, senza far scorrere la
 *   pagina sotto;
 * - da telefono nessun campo prende il fuoco da solo: aperto a metà salita,
 *   iOS alzerebbe la tastiera durante l'animazione e il drawer salterebbe. Si
 *   tocca «Nome» a drawer fermo. Da desktop il cursore è già su «Nome»;
 * - «Invio» porta al campo dopo («Avanti» sulla tastiera del telefono),
 *   senza mandare il modulo a metà; il fuoco si sposta nello stesso tocco, e
 *   iOS tiene la tastiera aperta;
 * - con dati inseriti non si chiude per sbaglio: trascinarlo giù, toccare
 *   fuori o «Annulla» chiedono prima «Uscire senza salvare?».
 *
 * I campi sono di chi sta davanti allo sportello, non di chi scrive: niente
 * suggerimenti automatici del browser, che proporrebbe i dati dello staff.
 */

const GENDERS: { value: Gender; label: string }[] = [
  { value: "f", label: "Donna" },
  { value: "m", label: "Uomo" },
  { value: "other", label: "Altro" },
  { value: "unspecified", label: "Non dichiarato" },
];

export function CreateClientSheet({
  onCreated,
  open,
  onOpenChange,
}: {
  onCreated: () => void;
  /**
   * Lo apre il pannello: da telefono il pulsante in alto a destra, da
   * desktop quello accanto alla ricerca (clients-panel.tsx).
   */
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [dirty, setDirty] = useState(false);
  const confirmLeave = useConfirmLeave();

  const close = () => {
    setDirty(false);
    onOpenChange(false);
  };
  const requestClose = () => {
    if (dirty) void confirmLeave(close);
    else close();
  };

  return (
    <ResponsiveDrawer
      open={open}
      setOpen={(next) => (next ? onOpenChange(true) : close())}
      dirty={dirty}
      onCloseAttempt={requestClose}
    >
      {/*
       * Un modulo lungo: da telefono il drawer è alto quanto la scheda di una
       * prenotazione (88% dello schermo) invece dell'80% dei drawer brevi.
       * Con la tastiera aperta prende lo spazio che resta (KeyboardInset).
       */}
      <ResponsiveDrawerContent className="data-[vaul-drawer-direction=bottom]:h-[min(88dvh,var(--drawer-max-height,88dvh))]! data-[vaul-drawer-direction=bottom]:max-h-[min(88dvh,var(--drawer-max-height,88dvh))] sm:max-w-lg md:max-h-[90dvh] md:overflow-y-auto">
        {/* Dentro il contenuto: si smonta a drawer chiuso, e la volta dopo
            il modulo riparte vuoto. */}
        <Form
          onDirtyChange={setDirty}
          onCancel={requestClose}
          onCreated={() => {
            close();
            onCreated();
          }}
        />
      </ResponsiveDrawerContent>
    </ResponsiveDrawer>
  );
}

/** I campi a cui «Invio» passa il fuoco, nell'ordine in cui si vedono. */
const NEXT_FIELD =
  "input:not([type=checkbox]):not([type=hidden]):not([disabled]), textarea:not([disabled])";

function Form({
  onDirtyChange,
  onCancel,
  onCreated,
}: {
  onDirtyChange: (dirty: boolean) => void;
  onCancel: () => void;
  onCreated: () => void;
}) {
  const { isDesktop } = useResponsiveDrawer();
  const [saving, setSaving] = useState(false);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [birthPlace, setBirthPlace] = useState("");
  const [gender, setGender] = useState<Gender | undefined>();
  const [levelIndex, setLevelIndex] = useState(1);
  const [residence, setResidence] = useState<Residence>({});
  const [optional, setOptional] = useState<OptionalFieldsValue>(EMPTY_OPTIONAL);
  const [referralCode, setReferralCode] = useState("");
  const [existingClient, setExistingClient] = useState(false);

  const create = async () => {
    setSaving(true);
    try {
      const response = await fetch("/api/dashboard/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: email.trim().toLowerCase() || undefined,
          phone: phone.trim() || undefined,
          birthDate: birthDate
            ? new Date(`${birthDate}T12:00:00`).getTime()
            : undefined,
          birthPlace: birthPlace.trim() || undefined,
          gender,
          level: LEVEL_RANGES[levelIndex].level,
          residence: residencePayload(residence),
          ...optionalPayload(optional),
          referralCode: referralCode.trim() || undefined,
          existingClient,
        }),
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        toast.error("Scheda non creata", {
          description: payload?.error ?? "Riprova fra poco.",
        });
        return;
      }

      toast.success("Cliente registrato", {
        description: email.trim()
          ? "La scheda è pronta: da lì puoi invitarlo ad attivare l'account."
          : "La scheda è pronta. Per invitarlo all'account servirà un indirizzo email.",
      });

      onCreated();
    } catch {
      toast.error("Scheda non creata", {
        description: "Controlla la connessione e riprova.",
      });
    } finally {
      setSaving(false);
    }
  };

  const valid = firstName.trim().length >= 2 && lastName.trim().length >= 2;

  const dirty =
    [
      firstName,
      lastName,
      email,
      phone,
      birthDate,
      birthPlace,
      referralCode,
    ].some((value) => value.trim() !== "") ||
    gender !== undefined ||
    levelIndex !== 1 ||
    existingClient ||
    Object.values(residence).some(Boolean) ||
    JSON.stringify(optional) !== JSON.stringify(EMPTY_OPTIONAL);
  useEffect(() => onDirtyChange(dirty), [dirty, onDirtyChange]);

  /**
   * «Invio» in un campo passa al successivo; nell'ultimo chiude la tastiera.
   * Il modulo si manda solo dal pulsante: un Invio di troppo non crea una
   * scheda a metà. Nelle note (textarea) Invio va a capo, come sempre.
   */
  const nextField = (event: KeyboardEvent<HTMLFormElement>) => {
    const field = event.target;
    if (
      event.key !== "Enter" ||
      event.nativeEvent.isComposing ||
      !(field instanceof HTMLInputElement) ||
      field.type === "checkbox"
    ) {
      return;
    }
    event.preventDefault();
    const fields = Array.from(
      event.currentTarget.querySelectorAll<HTMLElement>(NEXT_FIELD),
    );
    const next = fields[fields.indexOf(field) + 1];
    if (next) next.focus();
    else field.blur();
  };

  /** Dati di un altro: niente suggerimenti del browser, si va avanti con Invio. */
  const fieldProps = {
    autoComplete: "off",
    enterKeyHint: "next" as const,
  };

  return (
    <>
      {/*
       * Scorre tutto, titolo compreso: il modulo è lungo, e i campi valgono
       * più della descrizione. Restano fissi solo i pulsanti in fondo. In
       * cima, mentre si scorre, il contenuto sfuma invece di finire tagliato
       * sotto la maniglia (`.drawer-scroll-fade`, globals.css).
       *
       * È un `form` per chi usa un lettore di schermo; l'invio implicito
       * (Invio in un campo) è fermato, la scheda si crea solo dal pulsante.
       */}
      <form
        noValidate
        aria-label="Nuovo cliente"
        onSubmit={(event) => event.preventDefault()}
        onKeyDown={nextField}
        className="drawer-scroll-fade min-h-0 flex-1 space-y-7 overflow-y-auto px-4 pb-4 md:-mx-1 md:px-1"
      >
        {/*
         * Il titolo ha già i suoi margini da drawer: si annullano quelli del
         * modulo, che servono ai campi. Sotto restano ~20px fino al primo
         * gruppo: da telefono il titolo ne ha già 16 di margine e ne bastano
         * 4, da desktop non ne ha e servono tutti. È il margine intero, non
         * una correzione: `space-y-7` dà a ogni figlio 28px di margine sotto,
         * e un `mb-*` li sostituisce invece di togliere.
         */}
        <div className="-mx-4 mb-1 md:mx-0 md:mb-5">
          <SheetHeader
            title="Nuovo cliente"
            description="Registra chi hai davanti. L'invito ad attivare l'account si manda dopo, dalla sua scheda: qui non parte nessuna mail."
          />
        </div>
        <Group title="Chi è" hint="Nome e cognome sono gli unici obbligatori.">
          <div className="grid grid-cols-2 gap-3">
            <Field id="new-firstName" label="Nome">
              <Input
                id="new-firstName"
                value={firstName}
                onChange={(event) => setFirstName(event.target.value)}
                autoFocus={isDesktop}
                autoCapitalize="words"
                {...fieldProps}
              />
            </Field>
            <Field id="new-lastName" label="Cognome">
              <Input
                id="new-lastName"
                value={lastName}
                onChange={(event) => setLastName(event.target.value)}
                autoCapitalize="words"
                {...fieldProps}
              />
            </Field>
          </div>
        </Group>

        <Group
          title="Contatti"
          hint="Con l'email lo potrai invitare ad attivare l'account."
        >
          <Field id="new-email" label="Email">
            <Input
              id="new-email"
              type="email"
              inputMode="email"
              placeholder="mario.rossi@esempio.it"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoCapitalize="none"
              spellCheck={false}
              {...fieldProps}
            />
          </Field>
          <Field id="new-phone" label="Telefono">
            <Input
              id="new-phone"
              type="tel"
              inputMode="tel"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              {...fieldProps}
            />
          </Field>
        </Group>

        <Group title="Anagrafica">
          <div className="grid grid-cols-2 gap-3">
            <Field id="new-birth" label="Data di nascita">
              <Input
                id="new-birth"
                type="date"
                max={new Date().toISOString().slice(0, 10)}
                value={birthDate}
                onChange={(event) => setBirthDate(event.target.value)}
              />
            </Field>
            <Field id="new-gender" label="Sesso">
              <Select
                value={gender}
                onValueChange={(value) => setGender(value as Gender)}
              >
                <SelectTrigger id="new-gender" className="w-full">
                  <SelectValue placeholder="Non indicato" />
                </SelectTrigger>
                <SelectContent>
                  {GENDERS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>
          <Field id="new-birthPlace" label="Luogo di nascita">
            <Input
              id="new-birthPlace"
              placeholder="Siracusa"
              value={birthPlace}
              onChange={(event) => setBirthPlace(event.target.value)}
              autoCapitalize="words"
              {...fieldProps}
            />
          </Field>
        </Group>

        <Group title="Residenza">
          {/* Via su tutta la riga, città e CAP affiancati (residence-fields.tsx). */}
          <div className="grid grid-cols-2 gap-3">
            <ResidenceFields
              value={residence}
              onChange={setResidence}
              idPrefix="new"
            />
          </div>
        </Group>

        <Group title="Al club">
          <Field
            id="new-level"
            label="Livello"
            hint="Lo potrà correggere lui attivando l'account: intanto serve a proporgli partite sensate."
          >
            <LevelSelect
              id="new-level"
              value={levelIndex}
              onValueChange={setLevelIndex}
            />
          </Field>
          <Field
            id="new-referral"
            label="Codice amico"
            hint="Se l'ha invitato un cliente. Alla prima tessera pagata ricevono i punti tutti e due; se l'invito era via mail lo riconosciamo anche dall'email."
          >
            <Input
              id="new-referral"
              inputMode="numeric"
              {...fieldProps}
              placeholder="Es. 48213"
              maxLength={6}
              value={referralCode}
              onChange={(event) =>
                setReferralCode(event.target.value.replace(/\D/g, ""))
              }
            />
          </Field>
          {/* Chi giocava già da noi ma non aveva la scheda non è un cliente
              nuovo: il benvenuto «Prima partita» non gli spetta. */}
          <div className="space-y-1.5">
            <label
              htmlFor="new-existing"
              className="flex cursor-pointer items-center gap-2 text-sm"
            >
              <Checkbox
                id="new-existing"
                checked={existingClient}
                onCheckedChange={(checked) =>
                  setExistingClient(Boolean(checked))
                }
              />
              Era già cliente del club
            </label>
            <p className="text-muted-foreground text-xs leading-relaxed">
              Giocava già da noi ma non era registrato: non riceve i punti di
              «Prima partita».
            </p>
          </div>
        </Group>

        <OptionalFields
          value={optional}
          onChange={setOptional}
          idPrefix="new"
        />
      </form>

      <ResponsiveDrawerFooter className="flex flex-col-reverse gap-2 border-t pt-3 pb-[calc(1rem+env(safe-area-inset-bottom))] md:flex-row md:justify-end md:border-t-0 md:pb-0">
        <Button
          variant="ghost"
          className="h-12 md:h-9"
          onClick={onCancel}
          disabled={saving}
        >
          Annulla
        </Button>
        <Button
          className="h-12 rounded-xl md:h-9"
          onClick={() => void create()}
          disabled={!valid || saving}
        >
          {saving ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <UserPlus className="size-4" />
          )}
          Crea scheda
        </Button>
      </ResponsiveDrawerFooter>
    </>
  );
}

/**
 * Un gruppo di campi che vanno insieme: chi è, come si contatta, dove abita.
 * Il titolo è più piccolo e grigio delle etichette dei campi, come le
 * intestazioni delle liste di iOS: ordina senza alzare la voce. Nessuna
 * cornice intorno, i campi sono già riquadri: separano spazio e titoli.
 */
function Group({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div className="space-y-0.5">
        <h3 className="text-muted-foreground text-[13px] font-semibold">
          {title}
        </h3>
        {hint && (
          <p className="text-muted-foreground text-xs leading-relaxed">
            {hint}
          </p>
        )}
      </div>
      {children}
    </section>
  );
}

/** Un campo con l'etichetta sopra e, se serve, una spiegazione sotto. */
function Field({
  id,
  label,
  hint,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="min-w-0 space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {hint && (
        <p className="text-muted-foreground text-xs leading-relaxed">{hint}</p>
      )}
    </div>
  );
}
