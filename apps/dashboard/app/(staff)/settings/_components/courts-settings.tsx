"use client";

import { api } from "@padel-sport/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import { Plus, SquareDashed } from "lucide-react";
import { type FormEvent, useState } from "react";
import { toast } from "sonner";

import { ListGroup, ListRow, ListSwitchRow } from "@/app/_components/list";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import {
  SettingsSection,
  SettingsSkeleton,
  SettingsStack,
} from "./settings-section";

/**
 * Campi: quali si possono prenotare. Ogni interruttore vale subito, come
 * nelle Impostazioni di iOS: è una scelta sola, non c'è niente da rileggere
 * prima di confermarla.
 */

interface CourtInput {
  courtId?: string;
  name: string;
  active: boolean;
}

async function saveCourt(court: CourtInput): Promise<boolean> {
  try {
    const response = await fetch("/api/dashboard/courts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(court),
    });
    if (response.ok) return true;

    const payload = await response.json().catch(() => null);
    toast.error("Impossibile salvare il campo", {
      description: payload?.error ?? "Riprova fra poco.",
    });
  } catch {
    toast.error("Impossibile salvare il campo", {
      description: "Controlla la connessione e riprova.",
    });
  }
  return false;
}

export function CourtsSettings() {
  const courts = useQuery(api.modules.settings.booking.courts, {});

  return (
    <SettingsStack>
      <SettingsSection
        title="Campi"
        description="I campi accesi si prenotano in contemporanea. Un campo spento resta nello storico, ma non viene più assegnato."
      >
        {courts === undefined ? (
          <SettingsSkeleton rows={2} />
        ) : (
          <ListGroup>
            {courts.length === 0 && (
              <ListRow
                leading={<SquareDashed className="size-5" />}
                title="Nessun campo"
                subtitle="Senza campi non si prenota online. Aggiungine uno qui sotto."
              />
            )}
            {courts.map((court) => (
              <ListSwitchRow
                key={court.id}
                id={`court-${court.id}`}
                title={court.name}
                subtitle={court.active ? "Prenotabile" : "Non prenotabile"}
                checked={court.active}
                onCheckedChange={async (active) => {
                  if (
                    await saveCourt({
                      courtId: court.id,
                      name: court.name,
                      active,
                    })
                  ) {
                    toast.success(
                      active ? `${court.name} acceso` : `${court.name} spento`,
                    );
                  }
                }}
              />
            ))}
            <NewCourt count={courts.length} />
          </ListGroup>
        )}
      </SettingsSection>
    </SettingsStack>
  );
}

/** L'ultima riga dell'elenco: il nome del campo nuovo e «Aggiungi». */
function NewCourt({ count }: { count: number }) {
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const valid = name.trim().length >= 2;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!valid || saving) return;

    setSaving(true);
    const ok = await saveCourt({ name: name.trim(), active: true });
    setSaving(false);
    if (ok) {
      toast.success(`${name.trim()} aggiunto`);
      setName("");
    }
  };

  return (
    <form
      onSubmit={(event) => void submit(event)}
      className="flex items-center gap-2 px-4 py-2.5"
    >
      <label htmlFor="new-court" className="sr-only">
        Nome del nuovo campo
      </label>
      <Input
        id="new-court"
        value={name}
        onChange={(event) => setName(event.target.value)}
        placeholder={`Campo ${count + 1}`}
        autoComplete="off"
        className="h-9 flex-1"
      />
      <Button
        type="submit"
        variant="secondary"
        disabled={!valid || saving}
        className="h-9"
      >
        <Plus className="size-4" />
        Aggiungi
      </Button>
    </form>
  );
}
