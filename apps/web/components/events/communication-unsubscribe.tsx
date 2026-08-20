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
 * Il pulsante che disiscrive davvero: la pagina che lo ospita si limita a
 * spiegare cosa cambia — e soprattutto cosa non cambia.
 *
 * Gemello di `rsvp-cancel.tsx`, ma con un tono diverso di proposito: qui non
 * si sta rinunciando a niente, quindi il pulsante non è distruttivo.
 */
export function CommunicationUnsubscribe({ token, eventSlug }: Props) {
  const [done, setDone] = useState(false);
  const [pending, setPending] = useState(false);

  if (done) {
    return (
      <div className="border-border mt-8 flex flex-col gap-4 border-t pt-8">
        <p className="flex items-start gap-3 text-sm">
          <Check className="mt-0.5 size-4 shrink-0" />
          Fatto: non riceverai altre comunicazioni su questo evento. La tua
          iscrizione resta valida e il posto è ancora tuo — ti aspettiamo.
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

  const unsubscribe = async () => {
    setPending(true);

    try {
      const response = await fetch("/api/events/communications/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        toast.error("Disiscrizione non registrata", {
          description:
            payload?.error ?? "Riprova fra poco o scrivici direttamente.",
        });
        return;
      }

      setDone(true);
    } catch {
      toast.error("Disiscrizione non registrata", {
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
        disabled={pending}
        onClick={unsubscribe}
        className="w-full sm:w-fit"
      >
        {pending ? "Un attimo…" : "Non mandarmi altre comunicazioni"}
      </Button>
      <Button asChild size="pill" variant="ghost" className="w-full sm:w-fit">
        <Link href={`${EVENTS_LINK}/${eventSlug}`}>
          Lascia stare, continua pure
        </Link>
      </Button>
    </div>
  );
}
