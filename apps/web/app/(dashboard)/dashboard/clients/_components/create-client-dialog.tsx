"use client";

import { Loader2, UserPlus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LEVEL_RANGES } from "@/lib/levels";

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
 */

const GENDERS: { value: Gender; label: string }[] = [
  { value: "f", label: "Donna" },
  { value: "m", label: "Uomo" },
  { value: "other", label: "Altro" },
  { value: "unspecified", label: "Non dichiarato" },
];

export function CreateClientDialog({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [gender, setGender] = useState<Gender | undefined>();
  const [levelIndex, setLevelIndex] = useState(1);
  const [residence, setResidence] = useState<Residence>({});
  const [optional, setOptional] = useState<OptionalFieldsValue>(EMPTY_OPTIONAL);

  const reset = () => {
    setFirstName("");
    setLastName("");
    setEmail("");
    setPhone("");
    setBirthDate("");
    setGender(undefined);
    setLevelIndex(1);
    setResidence({});
    setOptional(EMPTY_OPTIONAL);
  };

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
          gender,
          level: LEVEL_RANGES[levelIndex].level,
          residence: residencePayload(residence),
          ...optionalPayload(optional),
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

      reset();
      setOpen(false);
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

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <UserPlus className="size-4" />
          Crea cliente
        </Button>
      </DialogTrigger>

      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nuovo cliente</DialogTitle>
          <DialogDescription>
            Registra chi hai davanti. L'invito ad attivare l'account si manda
            dopo, dalla sua scheda: qui non parte nessuna mail.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="new-firstName">Nome</Label>
            <Input
              id="new-firstName"
              value={firstName}
              onChange={(event) => setFirstName(event.target.value)}
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="new-lastName">Cognome</Label>
            <Input
              id="new-lastName"
              value={lastName}
              onChange={(event) => setLastName(event.target.value)}
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="new-email">
              Email{" "}
              <span className="text-muted-foreground font-normal">
                — serve per invitarlo
              </span>
            </Label>
            <Input
              id="new-email"
              type="email"
              inputMode="email"
              placeholder="mario.rossi@esempio.it"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="new-phone">Telefono</Label>
            <Input
              id="new-phone"
              type="tel"
              inputMode="tel"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="new-birth">Data di nascita</Label>
            <Input
              id="new-birth"
              type="date"
              max={new Date().toISOString().slice(0, 10)}
              value={birthDate}
              onChange={(event) => setBirthDate(event.target.value)}
            />
          </div>
          <ResidenceFields
            value={residence}
            onChange={setResidence}
            idPrefix="new"
          />

          <div className="space-y-1.5">
            <Label htmlFor="new-gender">Sesso</Label>
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
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="new-level">Livello</Label>
            <Select
              value={String(levelIndex)}
              onValueChange={(value) => setLevelIndex(Number(value))}
            >
              <SelectTrigger id="new-level" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LEVEL_RANGES.map((range, index) => (
                  <SelectItem key={range.label} value={String(index)}>
                    {range.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <p className="text-muted-foreground text-xs leading-relaxed">
          Il livello lo potrà correggere lui stesso attivando l'account: qui
          serve solo a proporgli partite sensate nel frattempo.
        </p>

        <OptionalFields
          value={optional}
          onChange={setOptional}
          idPrefix="new"
        />

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={saving}
          >
            Annulla
          </Button>
          <Button onClick={() => void create()} disabled={!valid || saving}>
            {saving ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <UserPlus className="size-4" />
            )}
            Crea scheda
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
