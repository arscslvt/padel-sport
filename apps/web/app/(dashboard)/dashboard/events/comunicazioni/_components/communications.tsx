"use client";

import { format } from "date-fns";
import { it } from "date-fns/locale";
import {
  CircleAlert,
  Eye,
  MailCheck,
  MailPlus,
  Send,
  SquareArrowOutUpRight,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/app/(dashboard)/_components/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { recipientsLabel } from "@/lib/event-communications";
import { formatEventDate } from "@/lib/events";
import type { EventCommunicationSummary } from "@/sanity/types";

type RecipientCount = {
  eventId: string;
  blockKey: string;
  recipients: number;
  unsubscribed: number;
};

/** Quanti, fra gli iscritti di adesso, non hanno ancora ricevuto una comunicazione. */
type PendingCount = {
  documentId: string;
  blockKey: string;
  pending: number;
  reached: number;
};

type SendRecord = {
  id: string;
  documentId: string;
  eventId: string;
  blockKey: string;
  subject: string;
  status: "sending" | "sent" | "failed";
  recipients: number;
  audience: "all" | "pending";
  delivered: number;
  failed: number;
  startedAt: number;
  completedAt?: number;
  error?: string;
};

type Payload = {
  communications: EventCommunicationSummary[];
  counts: RecipientCount[];
  sends: SendRecord[];
  pending: PendingCount[];
};

/** A chi si sta per mandare: l'elenco intero, o i soli iscritti nuovi. */
type Audience = "all" | "pending";

/** Il documento nello Studio, aperto sulla scheda giusta. */
function studioUrl(id: string) {
  return `/studio/structure/eventCommunication;${encodeURIComponent(id)}`;
}

function ListSkeleton() {
  const rows = ["row-a", "row-b"] as const;

  return (
    <div className="space-y-4">
      {rows.map((row) => (
        <Skeleton key={row} className="h-44 w-full rounded-xl" />
      ))}
    </div>
  );
}

/**
 * La console di invio.
 *
 * Il testo si scrive nello Studio, qui si sceglie a chi mandarlo e si preme
 * invio. La separazione è voluta: lo Studio salva a ogni battuta, quindi non
 * esiste un momento «ho finito» da cui far partire una mail — e una mail, a
 * differenza di una pubblicazione, non si disfa.
 */
export default function Communications() {
  const [data, setData] = useState<Payload | undefined>(undefined);
  /** Il modulo scelto per ogni comunicazione, quando l'evento ne ha più d'uno. */
  const [chosen, setChosen] = useState<Record<string, string>>({});
  const [preview, setPreview] = useState<EventCommunicationSummary | null>(
    null,
  );
  const [confirm, setConfirm] = useState<{
    communication: EventCommunicationSummary;
    blockKey: string;
    recipients: number;
    audience: Audience;
    resend: boolean;
  } | null>(null);
  const [pending, setPending] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/dashboard/events/communications");
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        toast.error("Comunicazioni non caricate", {
          description: payload?.error ?? "Riprova fra poco.",
        });
        setData({ communications: [], counts: [], sends: [], pending: [] });
        return;
      }

      setData(payload);
    } catch {
      toast.error("Comunicazioni non caricate", {
        description: "Controlla la connessione e riprova.",
      });
      setData({ communications: [], counts: [], sends: [], pending: [] });
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const blockKeyOf = useCallback(
    (communication: EventCommunicationSummary) =>
      chosen[communication._id] ?? communication.event?.forms?.[0]?._key ?? "",
    [chosen],
  );

  const countOf = useCallback(
    (eventId: string, blockKey: string) =>
      data?.counts.find(
        (count) => count.eventId === eventId && count.blockKey === blockKey,
      ),
    [data],
  );

  /** Quanti nuovi iscritti aspettano ancora questa comunicazione. */
  const pendingOf = useCallback(
    (documentId: string, blockKey: string) =>
      data?.pending.find(
        (entry) =>
          entry.documentId === documentId && entry.blockKey === blockKey,
      ),
    [data],
  );

  /** L'ultimo invio riuscito verso questo modulo: è quello che blocca il pulsante. */
  const sendOf = useCallback(
    (documentId: string, blockKey: string) =>
      data?.sends.find(
        (send) =>
          send.documentId === documentId &&
          send.blockKey === blockKey &&
          send.status !== "failed",
      ),
    [data],
  );

  const sendTest = async (communication: EventCommunicationSummary) => {
    setPending(`test:${communication._id}`);

    try {
      const response = await fetch(
        "/api/dashboard/events/communications/test",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: communication._id }),
        },
      );

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        toast.error("Prova non inviata", {
          description: payload?.error ?? "Riprova fra poco.",
        });
        return;
      }

      toast.success("Prova inviata", {
        description: `L'abbiamo mandata a ${payload.to}. Aprila anche da telefono: è l'unico modo di vedere come esce davvero.`,
      });
    } catch {
      toast.error("Prova non inviata", {
        description: "Controlla la connessione e riprova.",
      });
    } finally {
      setPending(null);
    }
  };

  const send = async () => {
    if (!confirm) return;

    const { communication, blockKey, audience, resend } = confirm;
    setPending(`send:${communication._id}`);

    try {
      const response = await fetch(
        "/api/dashboard/events/communications/send",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: communication._id,
            blockKey,
            audience,
            allowResend: resend,
          }),
        },
      );

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        toast.error("Comunicazione non inviata", {
          description: payload?.error ?? "Riprova fra poco.",
        });
        return;
      }

      setConfirm(null);

      toast.success("Comunicazione inviata", {
        description: payload.failed
          ? `${recipientsLabel(payload.delivered)} raggiunti, ${payload.failed} non raggiunti.`
          : `È partita a ${recipientsLabel(payload.delivered)}.`,
      });

      await load();
    } catch {
      toast.error("Comunicazione non inviata", {
        description: "Controlla la connessione e riprova.",
      });
    } finally {
      setPending(null);
    }
  };

  const communications = useMemo(() => data?.communications ?? [], [data]);

  if (data === undefined) return <ListSkeleton />;

  if (!communications.length) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <MailPlus />
          </EmptyMedia>
          <EmptyTitle>Nessuna comunicazione pronta</EmptyTitle>
          <EmptyDescription>
            Le comunicazioni si scrivono nello Studio, sotto «Comunicazioni», e
            compaiono qui appena vengono pubblicate. Pubblicarle non le manda:
            l'invio resta un gesto da fare da questa pagina.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button asChild variant="outline">
            <Link href="/studio/structure/eventCommunication" target="_blank">
              <SquareArrowOutUpRight className="size-4" />
              Apri lo Studio
            </Link>
          </Button>
        </EmptyContent>
      </Empty>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {communications.map((communication) => {
          const event = communication.event;
          if (!event) return null;

          const forms = event.forms ?? [];
          const blockKey = blockKeyOf(communication);
          const count = countOf(event._id, blockKey);
          const recipients = count?.recipients ?? 0;
          const previousSend = sendOf(communication._id, blockKey);
          const sent = previousSend?.status === "sent";
          const sending = previousSend?.status === "sending";
          const busy = pending === `send:${communication._id}`;
          // Prima del primo invio «mancano» tutti: il conteggio dei nuovi ha
          // senso solo da lì in poi.
          const missing =
            pendingOf(communication._id, blockKey)?.pending ?? recipients;

          return (
            <Card key={communication._id}>
              <CardHeader>
                <CardTitle className="text-base">
                  {communication.subject}
                </CardTitle>
                <CardDescription>
                  {event.title} ·{" "}
                  {formatEventDate(event.dateStart, event.dateEnd)}
                </CardDescription>
                <CardAction>
                  {previousSend?.status === "sent" ? (
                    <Badge
                      variant="outline"
                      className="border-green-200 bg-green-50 text-green-900"
                    >
                      <MailCheck className="size-3.5" />
                      Inviata
                    </Badge>
                  ) : sending ? (
                    <Badge variant="outline">Invio in corso</Badge>
                  ) : (
                    <Badge variant="outline">Pronta</Badge>
                  )}
                </CardAction>
              </CardHeader>

              <CardContent className="space-y-3">
                {forms.length > 1 && (
                  <div className="flex flex-col gap-2">
                    <span className="text-sm font-medium">Destinatari</span>
                    <Select
                      value={blockKey}
                      onValueChange={(value) =>
                        setChosen((current) => ({
                          ...current,
                          [communication._id]: value,
                        }))
                      }
                    >
                      <SelectTrigger className="w-full bg-white md:w-[28rem]">
                        <SelectValue placeholder="Scegli il modulo" />
                      </SelectTrigger>
                      <SelectContent>
                        {forms.map((form) => {
                          const formCount = countOf(event._id, form._key);

                          return (
                            <SelectItem key={form._key} value={form._key}>
                              {form.heading ?? "Modulo di iscrizione"}{" "}
                              <span className="text-muted-foreground">
                                · {formCount?.recipients ?? 0} iscritti
                              </span>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <p className="text-sm text-muted-foreground">
                  Raggiunge{" "}
                  <span className="font-medium text-foreground">
                    {recipientsLabel(recipients)}
                  </span>
                  {count?.unsubscribed
                    ? ` · ${count.unsubscribed} ${count.unsubscribed === 1 ? "si è disiscritto" : "si sono disiscritti"} dalle comunicazioni`
                    : ""}
                  .
                </p>

                {sent && previousSend && (
                  <div className="space-y-2 rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">
                    <p>
                      Inviata il{" "}
                      {format(
                        previousSend.completedAt ?? previousSend.startedAt,
                        "d MMMM yyyy 'alle' HH:mm",
                        { locale: it },
                      )}{" "}
                      a {recipientsLabel(previousSend.delivered)}
                      {previousSend.audience === "pending"
                        ? " che ancora non l'avevano"
                        : ""}
                      {previousSend.failed
                        ? `, ${previousSend.failed} non raggiunti`
                        : ""}
                      . Le modifiche fatte da allora non raggiungono chi l'ha
                      già ricevuta.
                    </p>
                    <p className="text-foreground">
                      {missing > 0
                        ? `${missing === 1 ? "1 iscritto non l'ha" : `${missing} iscritti non l'hanno`} ancora ricevuta — chi si è iscritto dopo, e chi non è stato raggiunto. Puoi mandarla solo a ${missing === 1 ? "lui" : "loro"}.`
                        : "Tutti gli iscritti di adesso l'hanno già ricevuta."}
                    </p>
                  </div>
                )}

                {recipients === 0 && (
                  <p className="flex items-start gap-2 text-sm text-muted-foreground">
                    <CircleAlert className="mt-0.5 size-4 shrink-0" />
                    {forms.length === 0
                      ? "L'evento non ha un modulo di iscrizione, quindi non c'è nessun elenco a cui mandarla. Il modulo si aggiunge nello Studio, dal menu «+» nel corpo dell'articolo."
                      : "Nessuno da raggiungere: questo modulo non ha iscritti, o tutti hanno chiesto di non ricevere comunicazioni."}
                  </p>
                )}
              </CardContent>

              <CardFooter className="flex flex-wrap gap-2">
                <Button asChild variant="ghost" size="sm">
                  <Link href={studioUrl(communication._id)} target="_blank">
                    <SquareArrowOutUpRight className="size-4" />
                    Apri nello Studio
                  </Link>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPreview(communication)}
                >
                  <Eye className="size-4" />
                  Anteprima
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pending === `test:${communication._id}`}
                  onClick={() => sendTest(communication)}
                >
                  {pending === `test:${communication._id}`
                    ? "Invio…"
                    : "Mandami una prova"}
                </Button>
                {sent ? (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      className="ml-auto"
                      disabled={recipients === 0 || sending || busy}
                      onClick={() =>
                        setConfirm({
                          communication,
                          blockKey,
                          recipients,
                          audience: "all",
                          resend: true,
                        })
                      }
                    >
                      Invia di nuovo a tutti
                    </Button>
                    {missing > 0 && (
                      <Button
                        size="sm"
                        disabled={sending || busy}
                        onClick={() =>
                          setConfirm({
                            communication,
                            blockKey,
                            recipients: missing,
                            audience: "pending",
                            resend: false,
                          })
                        }
                      >
                        <Send className="size-4" />
                        {missing === 1
                          ? "Invia a chi manca"
                          : `Invia ai ${missing} che mancano`}
                      </Button>
                    )}
                  </>
                ) : (
                  <Button
                    size="sm"
                    className="ml-auto"
                    disabled={recipients === 0 || sending || busy}
                    onClick={() =>
                      setConfirm({
                        communication,
                        blockKey,
                        recipients,
                        audience: "all",
                        resend: false,
                      })
                    }
                  >
                    <Send className="size-4" />
                    {`Invia a ${recipientsLabel(recipients)}`}
                  </Button>
                )}
              </CardFooter>
            </Card>
          );
        })}
      </div>

      <Dialog
        open={Boolean(preview)}
        onOpenChange={(open) => !open && setPreview(null)}
      >
        <DialogContent className="max-w-2xl sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{preview?.subject}</DialogTitle>
            <DialogDescription>
              Come si vedrà nella casella. I client di posta riscrivono sempre
              qualcosa: per esserne certi, mandati una prova.
            </DialogDescription>
          </DialogHeader>
          {preview && (
            <iframe
              key={preview._id}
              title={`Anteprima di ${preview.subject}`}
              src={`/api/dashboard/events/communications/preview?id=${encodeURIComponent(preview._id)}`}
              className="h-[60vh] w-full rounded-lg border bg-white"
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(confirm)}
        onOpenChange={(open) => !open && setConfirm(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {confirm?.audience === "pending"
                ? "Mandarla a chi non ce l'ha?"
                : confirm?.resend
                  ? "Mandarla una seconda volta?"
                  : "Stai per mandare una mail vera"}
            </DialogTitle>
            <DialogDescription asChild>
              <div className="space-y-3">
                <p>
                  «{confirm?.communication.subject}» partirà verso{" "}
                  <span className="font-medium text-foreground">
                    {recipientsLabel(confirm?.recipients ?? 0)}
                  </span>{" "}
                  {confirm?.audience === "pending"
                    ? "che non l'hanno ancora ricevuta, fra gli iscritti a"
                    : "iscritti a"}{" "}
                  «{confirm?.communication.event?.title}».
                </p>
                <p>
                  {confirm?.audience === "pending"
                    ? "Chi l'ha già ricevuta resta fuori: non se la ritrova una seconda volta in casella. Parte la versione pubblicata adesso, che può essere diversa da quella di allora."
                    : confirm?.resend
                      ? "Questa comunicazione è già stata inviata a questi iscritti: la riceveranno una seconda volta, nella versione pubblicata adesso."
                      : "Una mail inviata non si richiama indietro. Se non l'hai ancora fatto, mandati prima una prova."}
                </p>
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirm(null)}>
              Annulla
            </Button>
            <Button
              onClick={send}
              disabled={pending === `send:${confirm?.communication._id}`}
            >
              <Send className="size-4" />
              {pending === `send:${confirm?.communication._id}`
                ? "Invio in corso…"
                : `Invia a ${recipientsLabel(confirm?.recipients ?? 0)}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
