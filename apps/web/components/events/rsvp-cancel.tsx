"use client";

import { Check } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { EVENTS_LINK } from "@/lib/links";

type Props = {
  token: string;
  eventSlug: string;
};

/**
 * Il pulsante che annulla davvero: la pagina che lo ospita si limita a
 * mostrare cosa si sta per annullare.
 */
export function RsvpCancel({ token, eventSlug }: Props) {
  const [done, setDone] = useState(false);
  const [pending, setPending] = useState(false);

  if (done) {
    return (
      <div className="border-border mt-8 flex flex-col gap-4 border-t pt-8">
        <p className="flex items-start gap-3 text-sm">
          <Check className="mt-0.5 size-4 shrink-0" />
          Iscrizione annullata. Abbiamo liberato il posto e avvisato la
          segreteria: se cambi idea puoi iscriverti di nuovo dalla pagina
          dell'evento.
        </p>
        <Button
          asChild
          size="pill"
          variant="outline"
          className="w-full sm:w-fit"
        >
          <Link href={`${EVENTS_LINK}/${eventSlug}`}>Torna all'evento</Link>
        </Button>
      </div>
    );
  }

  const cancel = async () => {
    setPending(true);

    try {
      const response = await fetch("/api/events/rsvp/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        toast.error("Iscrizione non annullata", {
          description:
            payload?.error ?? "Riprova fra poco o scrivici direttamente.",
        });
        return;
      }

      setDone(true);
    } catch {
      toast.error("Iscrizione non annullata", {
        description: "Controlla la connessione e riprova.",
      });
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="border-border mt-8 flex flex-col gap-3 border-t pt-8 sm:flex-row sm:items-center">
      <Button
        type="button"
        size="pill"
        variant="destructive"
        disabled={pending}
        onClick={cancel}
        className="w-full sm:w-fit"
      >
        {pending ? "Annullamento…" : "Annulla l'iscrizione"}
      </Button>
      <Button asChild size="pill" variant="ghost" className="w-full sm:w-fit">
        <Link href={`${EVENTS_LINK}/${eventSlug}`}>No, resto iscritto</Link>
      </Button>
    </div>
  );
}
