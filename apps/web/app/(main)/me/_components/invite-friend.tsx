"use client";

import { api } from "@padel-sport/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import { Loader2, Send } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { FIELD_CLASS } from "@/components/booking/wizard-ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatClubDate } from "@/lib/points";

import { SectionTitle } from "./section-title";

/**
 * Invitare un amico che non è ancora iscritto: gli arriva una mail che
 * spiega come iscriversi in struttura facendosi riconoscere, con questa mail
 * o col codice amico. I punti arrivano a tutti e due quando paga la prima
 * tessera.
 *
 * Sotto, gli inviti già mandati e a che punto sono.
 */

const STATUS_LABELS = {
  pending: "Invitato",
  joined: "Iscritto, in attesa della tessera",
  rewarded: "Punti ricevuti",
} as const;

/** Quanto vale un invito per chi invita e per chi è invitato: due azioni separate. */
function referralDescription(
  points: number | null,
  friendPoints: number | null,
): string {
  const when =
    "Quando un amico che hai invitato si iscrive e paga la prima tessera";
  if (points && friendPoints) {
    return `${when}, tu ricevi ${points} punti e chi hai invitato ${friendPoints} di benvenuto.`;
  }
  if (points) return `${when}, ricevi ${points} punti.`;
  if (friendPoints)
    return `${when}, riceve ${friendPoints} punti di benvenuto.`;
  return "Porta al club chi non ci ha mai giocato.";
}

export function InviteFriend() {
  const data = useQuery(api.modules.referrals.invite.mine, {});
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [sending, setSending] = useState(false);

  if (!data) return null;

  const send = async (event: React.FormEvent) => {
    event.preventDefault();
    if (sending) return;

    setSending(true);
    try {
      const response = await fetch("/api/referrals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          name: name.trim() || undefined,
        }),
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        toast.error("Invito non inviato", {
          description: payload?.error ?? "Riprova fra poco.",
        });
        return;
      }

      if (payload?.sent) {
        toast.success(payload.resent ? "Invito rimandato" : "Invito inviato", {
          description: `Abbiamo scritto a ${email.trim()}.`,
        });
      } else {
        toast.warning("Invito registrato, mail non partita", {
          description: `Dai al tuo amico il codice ${data.code ?? ""}: lo dice allo sportello.`,
        });
      }
      setEmail("");
      setName("");
    } catch {
      toast.error("Invito non inviato", {
        description: "Controlla la connessione e riprova.",
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <section aria-labelledby="invite-title" className="space-y-5">
      <SectionTitle
        id="invite-title"
        title="Invita un amico"
        description={referralDescription(data.points, data.friendPoints)}
      />

      <div className="rounded-card bg-muted space-y-6 p-6 sm:p-8">
        {data.code && (
          <div>
            <p className="text-muted-foreground text-sm">Il tuo codice amico</p>
            <p className="mt-1 font-mono text-2xl tracking-[0.2em]">
              {data.code}
            </p>
            <p className="text-muted-foreground mt-1 text-xs">
              Chi si iscrive in struttura può dirlo alla segreteria al posto
              della mail.
            </p>
          </div>
        )}

        <form onSubmit={send} className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="invite-email">Email dell&apos;amico</Label>
            <Input
              id="invite-email"
              type="email"
              inputMode="email"
              autoComplete="off"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className={FIELD_CLASS}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="invite-name">Nome (facoltativo)</Label>
            <Input
              id="invite-name"
              autoComplete="off"
              maxLength={60}
              value={name}
              onChange={(event) => setName(event.target.value)}
              className={FIELD_CLASS}
            />
          </div>
          <div className="sm:col-span-2">
            <Button
              type="submit"
              size="pill"
              disabled={sending || !email.trim()}
              className="w-full active:scale-[0.97] sm:w-auto"
            >
              {sending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Send className="size-4" />
              )}
              Invia l&apos;invito
            </Button>
          </div>
          <p className="text-muted-foreground text-xs sm:col-span-2">
            Invia la mail solo a chi è d&apos;accordo a riceverla. Gli scriviamo
            una volta sola.
          </p>
        </form>

        {data.invites.length > 0 && (
          <ul className="divide-border border-border divide-y border-t">
            {data.invites.map((invite) => (
              <li
                key={invite.id}
                className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 pt-4 [&+li]:pt-4"
              >
                <span className="min-w-0 truncate text-sm">
                  {invite.name ?? invite.email}
                </span>
                <span className="text-muted-foreground text-xs">
                  {STATUS_LABELS[invite.status]} ·{" "}
                  {formatClubDate(invite.createdAt)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
