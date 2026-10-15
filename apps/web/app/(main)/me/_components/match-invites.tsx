"use client";

import { useAuth } from "@clerk/nextjs";
import { api } from "@padel-sport/backend/convex/_generated/api";
import type { Id } from "@padel-sport/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { Check, Loader2, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { formatClubDay, formatClubSlotRange, MAX_PLAYERS } from "@/lib/booking";
import { convexMessage } from "@/lib/clients";

/**
 * Gli inviti a una partita ancora senza risposta: è qui che porta il WhatsApp
 * d'invito (modules/notifications/matchInvite.ts).
 *
 * Il posto resta tenuto finché non si risponde. Accettando la partita entra
 * fra le prenotazioni qui sotto, con il suo QR, e conta nei punti; rifiutando
 * il posto torna libero per chi ha prenotato.
 *
 * Senza inviti non c'è niente: nessuna sezione vuota a ricordare che manca
 * qualcosa.
 */
export function MatchInvites() {
  const { isSignedIn } = useAuth();
  const invites = useQuery(
    api.modules.openMatches.invites.listMine,
    isSignedIn ? {} : "skip",
  );
  const respond = useMutation(api.modules.openMatches.invites.respond);
  const [busy, setBusy] = useState<string | null>(null);

  if (!invites || invites.length === 0) return null;

  const answer = async (inviteId: Id<"matchInvites">, accept: boolean) => {
    setBusy(`${inviteId}-${accept}`);
    try {
      await respond({ inviteId, accept });
      toast.success(accept ? "Sei in squadra" : "Invito rifiutato", {
        description: accept
          ? "La trovi fra le tue prenotazioni, con il QR per entrare."
          : "Il posto torna libero per chi ti aveva invitato.",
      });
    } catch (error) {
      toast.error("Risposta non inviata", {
        description: convexMessage(error, "Riprova fra poco."),
      });
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="rounded-card border-primary/30 bg-primary/5 space-y-5 border p-6 sm:p-8">
      <div>
        <p className="font-medium">
          {invites.length === 1
            ? "Ti hanno invitato a una partita"
            : `Ti hanno invitato a ${invites.length} partite`}
        </p>
        <p className="text-muted-foreground mt-1 text-sm">
          Il posto è tuo finché non rispondi.
        </p>
      </div>

      <ul className="divide-border -mx-6 divide-y sm:-mx-8">
        {invites.map(({ inviteId, match, circleName }) => {
          const players = match.players.length + match.guests.length;
          return (
            <li
              key={inviteId}
              className="px-6 py-5 first:pt-0 last:pb-0 sm:px-8"
            >
              <p className="text-sm font-medium">
                {formatClubDay(match.matchDate)}
              </p>
              <p className="text-muted-foreground mt-1 text-sm">
                {formatClubSlotRange(match.matchDate)}
                {match.court ? ` · ${match.court}` : ""} · {players}/
                {MAX_PLAYERS} giocatori
              </p>
              <p className="text-muted-foreground mt-1 text-sm">
                Da {match.creator?.name ?? "un amico"}
                {circleName ? ` · ${circleName}` : ""}
              </p>

              <div className="mt-4 flex flex-col gap-2.5 sm:flex-row">
                <Button
                  type="button"
                  size="pill"
                  disabled={busy !== null}
                  onClick={() => void answer(inviteId, true)}
                >
                  {busy === `${inviteId}-true` ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Check className="size-4" />
                  )}
                  Accetta
                </Button>
                <Button
                  type="button"
                  size="pill"
                  variant="ghost"
                  disabled={busy !== null}
                  onClick={() => void answer(inviteId, false)}
                >
                  {busy === `${inviteId}-false` ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <X className="size-4" />
                  )}
                  Rifiuta
                </Button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
