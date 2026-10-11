"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import type { Health } from "./types";

/**
 * I campi che quasi nessuna scheda userà, e che qualcuna deve poter usare.
 *
 * Stanno a scomparsa perché la maggior parte dei clienti non ha niente da
 * dichiarare, e un modulo lungo si compila peggio di uno corto: chi ha
 * un'allergia lo apre, gli altri non lo vedono nemmeno.
 *
 * Dentro ci sono **dati sanitari** — categoria particolare, non anagrafica: si
 * raccolgono perché servono a far giocare qualcuno in sicurezza, e per nessun
 * altro motivo. Le note del club sono un'altra cosa ancora: le scrive lo staff
 * per sé, e a chi attiva il proprio account non si mostrano mai.
 */

export interface OptionalFieldsValue {
  taxCode: string;
  health: Health;
  clubNotes?: string;
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

          <p className="text-muted-foreground text-xs leading-relaxed">
            Allergie, condizioni e invalidità sono dati sanitari: li raccogliamo
            solo per far giocare in sicurezza e li vede lo staff del club.
          </p>

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
  clubNotes: "",
};

/** Quel che si manda al server: i campi vuoti non si conservano. */
export function optionalPayload(value: OptionalFieldsValue) {
  const trim = (field?: string) => field?.trim() || undefined;

  const health = {
    allergies: trim(value.health.allergies),
    conditions: trim(value.health.conditions),
    disability: trim(value.health.disability),
  };

  const hasHealth = Object.values(health).some(Boolean);

  return {
    taxCode: trim(value.taxCode),
    health: hasHealth ? health : undefined,
    clubNotes: trim(value.clubNotes),
  };
}
