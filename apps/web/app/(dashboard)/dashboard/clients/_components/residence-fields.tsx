"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import type { Residence } from "./types";

/**
 * L'indirizzo di residenza: via, città e CAP.
 *
 * Sta in un componente suo perché lo chiedono in tre — lo staff creando la
 * scheda, lo staff correggendola, e la persona quando attiva il proprio
 * account — e tre copie degli stessi campi divergono al primo ritocco.
 */
export function ResidenceFields({
  value,
  onChange,
  idPrefix = "res",
}: {
  value: Residence;
  onChange: (value: Residence) => void;
  idPrefix?: string;
}) {
  const patch = (next: Partial<Residence>) => onChange({ ...value, ...next });

  return (
    <>
      <div className="space-y-1.5 sm:col-span-2">
        <Label htmlFor={`${idPrefix}-address`}>Indirizzo di residenza</Label>
        <Input
          id={`${idPrefix}-address`}
          autoComplete="street-address"
          placeholder="Via Roma 12"
          value={value.address ?? ""}
          onChange={(event) => patch({ address: event.target.value })}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-city`}>Città</Label>
        <Input
          id={`${idPrefix}-city`}
          autoComplete="address-level2"
          placeholder="Melilli"
          value={value.city ?? ""}
          onChange={(event) => patch({ city: event.target.value })}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-postalCode`}>CAP</Label>
        <Input
          id={`${idPrefix}-postalCode`}
          inputMode="numeric"
          autoComplete="postal-code"
          maxLength={5}
          placeholder="96010"
          value={value.postalCode ?? ""}
          onChange={(event) =>
            // Solo cifre: il CAP italiano ne ha cinque, e un carattere di
            // troppo lo farebbe rifiutare dal server a fine compilazione.
            patch({ postalCode: event.target.value.replace(/\D/g, "") })
          }
        />
      </div>
    </>
  );
}

/** Quel che si manda al server: un indirizzo vuoto non si conserva. */
export function residencePayload(value: Residence) {
  const trim = (field?: string) => field?.trim() || undefined;

  const residence = {
    address: trim(value.address),
    city: trim(value.city),
    postalCode: trim(value.postalCode),
  };

  return Object.values(residence).some(Boolean) ? residence : undefined;
}
