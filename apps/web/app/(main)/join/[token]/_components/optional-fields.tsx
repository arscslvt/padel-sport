"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import type { Health } from "./client-types";

/**
 * I campi che quasi nessuna scheda userà, e che qualcuna deve poter usare.
 *
 * Stanno a scomparsa perché la maggior parte dei clienti non ha niente da
 * dichiarare, e un modulo lungo si compila peggio di uno corto: chi ha
 * un'allergia lo apre, gli altri non lo vedono nemmeno.
 *
 * Dentro ci sono **dati sanitari** — categoria particolare, non anagrafica: si
 * raccolgono perché servono a far giocare qualcuno in sicurezza, e per nessun
 * altro motivo, e chiedono un consenso esplicito e separato (art. 9 GDPR). Le
 * note del club sono un'altra cosa ancora: le scrive lo staff per sé, e a chi
 * attiva il proprio account non si mostrano mai.
 */

export interface OptionalFieldsValue {
  taxCode: string;
  health: Health;
  /** Il sì ai dati sanitari: senza, i campi sanitari devono restare vuoti. */
  healthConsent: boolean;
  clubNotes?: string;
}

/** Lo stesso messaggio del backend (modules/clients/profile.ts). */
export const HEALTH_CONSENT_REQUIRED =
  "Per salvare i dati sanitari serve il tuo consenso. Spunta la casella o svuota i campi.";

/** Ci sono dati sanitari da salvare? */
export function hasHealth(value: OptionalFieldsValue) {
  return [
    value.health.allergies,
    value.health.conditions,
    value.health.disability,
  ].some((field) => field?.trim());
}

export function OptionalFields({
  value,
  onChange,
  /** Il cliente che compila i propri dati non vede le note interne. */
  withClubNotes = true,
  idPrefix = "opt",
}: {
  value: OptionalFieldsValue;
  onChange: (value: OptionalFieldsValue) => void;
  withClubNotes?: boolean;
  idPrefix?: string;
}) {
  const patchHealth = (patch: Partial<Health>) =>
    onChange({ ...value, health: { ...value.health, ...patch } });

  const filled =
    [
      value.taxCode,
      value.health.allergies,
      value.health.conditions,
      value.health.disability,
      withClubNotes ? value.clubNotes : undefined,
    ].filter((field) => field?.trim()).length || 0;

  return (
    <Accordion type="single" collapsible>
      <AccordionItem value="optional" className="border-b-0">
        <AccordionTrigger className="text-sm">
          Altri dati{" "}
          <span className="text-muted-foreground ml-1 font-normal">
            {filled > 0
              ? `— ${filled} compilat${filled === 1 ? "o" : "i"}`
              : "— facoltativi"}
          </span>
        </AccordionTrigger>

        <AccordionContent className="space-y-4 pt-1">
          <div className="space-y-1.5">
            <Label htmlFor={`${idPrefix}-taxCode`}>Codice fiscale</Label>
            <Input
              id={`${idPrefix}-taxCode`}
              autoCapitalize="characters"
              maxLength={16}
              placeholder="RSSMRA80A01H501U"
              className="font-mono uppercase"
              value={value.taxCode}
              onChange={(event) =>
                onChange({ ...value, taxCode: event.target.value })
              }
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={`${idPrefix}-allergies`}>Allergie</Label>
            <Textarea
              id={`${idPrefix}-allergies`}
              rows={2}
              placeholder="Es. arachidi, punture di imenotteri…"
              value={value.health.allergies ?? ""}
              onChange={(event) =>
                patchHealth({ allergies: event.target.value })
              }
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={`${idPrefix}-conditions`}>
              Condizioni mediche particolari
            </Label>
            <Textarea
              id={`${idPrefix}-conditions`}
              rows={2}
              placeholder="Quello che il club deve sapere in caso di malore."
              value={value.health.conditions ?? ""}
              onChange={(event) =>
                patchHealth({ conditions: event.target.value })
              }
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={`${idPrefix}-disability`}>Invalidità</Label>
            <Input
              id={`${idPrefix}-disability`}
              placeholder="Tipo e percentuale, se rilevante"
              value={value.health.disability ?? ""}
              onChange={(event) =>
                patchHealth({ disability: event.target.value })
              }
            />
          </div>

          <label
            htmlFor={`${idPrefix}-healthConsent`}
            className="bg-background flex cursor-pointer gap-3 rounded-xl border p-3.5"
          >
            <Checkbox
              id={`${idPrefix}-healthConsent`}
              checked={value.healthConsent}
              onCheckedChange={(checked) =>
                onChange({ ...value, healthConsent: checked === true })
              }
              className="mt-0.5"
            />
            <span>
              <span className="block text-sm font-medium">
                Acconsento al trattamento dei miei dati sanitari
              </span>
              <span className="text-muted-foreground block text-xs leading-relaxed">
                Allergie, condizioni e invalidità sono dati sanitari. Li
                raccogliamo solo per far giocare in sicurezza e li vede solo lo
                staff del club. Senza consenso lascia vuoti questi campi.
              </span>
            </span>
          </label>

          {withClubNotes && (
            <div className="space-y-1.5 border-t pt-4">
              <Label htmlFor={`${idPrefix}-clubNotes`}>Note del club</Label>
              <Textarea
                id={`${idPrefix}-clubNotes`}
                rows={3}
                placeholder="Promemoria interni su questo cliente."
                value={value.clubNotes ?? ""}
                onChange={(event) =>
                  onChange({ ...value, clubNotes: event.target.value })
                }
              />
              <p className="text-muted-foreground text-xs">
                Le legge solo lo staff: non compaiono mai al cliente.
              </p>
            </div>
          )}
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}

/** Il valore vuoto, per aprire un modulo nuovo. */
export const EMPTY_OPTIONAL: OptionalFieldsValue = {
  taxCode: "",
  health: {},
  healthConsent: false,
  clubNotes: "",
};

/** Quel che si manda al server: i campi vuoti non si conservano. */
export function optionalPayload(value: OptionalFieldsValue) {
  const trim = (field?: string) => field?.trim() || undefined;

  // Il blocco sanitario parte sempre, anche vuoto: svuotare i campi che lo
  // staff aveva compilato dev'essere un modo per toglierli.
  return {
    taxCode: trim(value.taxCode),
    health: {
      allergies: trim(value.health.allergies),
      conditions: trim(value.health.conditions),
      disability: trim(value.health.disability),
    },
    healthConsent: value.healthConsent,
    clubNotes: trim(value.clubNotes),
  };
}
