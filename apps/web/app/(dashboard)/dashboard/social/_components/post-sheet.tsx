"use client";

import { format } from "date-fns";
import { it } from "date-fns/locale";
import { ExternalLink } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";

import { SocialStatusBadge } from "./status-badge";
import {
  FORMAT_LABELS,
  KIND_LABELS,
  posterUrl,
  type SocialPost,
} from "./types";

/**
 * Una bozza aperta: si guarda, si corregge, si decide.
 *
 * Il testo si modifica con `useState` per campo e non con react-hook-form,
 * come tutti i moduli di questa dashboard — la libreria in questo progetto
 * serve i moduli pubblici, dove la validazione va mostrata al visitatore.
 *
 * Due cose che questa schermata deve dire ad alta voce, perché sono le due che
 * si scoprono nel momento sbagliato: che un contenuto pubblicato non si ritira
 * — l'API di Instagram non lo permette, si apre l'app e si cancella a mano — e
 * cosa esattamente è stato dato in pasto al modello, che è l'unico modo di
 * verificare che una promessa di anonimato sia stata mantenuta.
 */
export function PostSheet({
  post,
  onClose,
  onChanged,
}: {
  post: SocialPost | null;
  onClose: () => void;
  onChanged: () => Promise<void>;
}) {
  const [caption, setCaption] = useState("");
  const [feedback, setFeedback] = useState("");
  const [pending, setPending] = useState<string | null>(null);

  // Aprire un'altra bozza deve ripartire dal suo testo, non da quello rimasto
  // nel campo della precedente.
  useEffect(() => {
    setCaption(post?.caption ?? "");
    setFeedback("");
    setPending(null);
  }, [post]);

  if (!post) return null;

  const editable = post.status === "pending_review" || post.status === "queued";
  const canRedo =
    post.status === "pending_review" ||
    post.status === "failed" ||
    post.status === "rejected";
  const dirty = caption.trim() !== (post.caption ?? "").trim();

  const call = async (
    key: string,
    url: string,
    body: Record<string, unknown>,
    success: string,
    method: "PATCH" | "POST" = "PATCH",
  ) => {
    setPending(key);

    try {
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        toast.error("Operazione non riuscita", {
          description: payload?.error ?? "Riprova fra poco.",
        });
        return;
      }

      toast.success(success);
      await onChanged();
    } catch {
      toast.error("Operazione non riuscita", {
        description: "Controlla la connessione e riprova.",
      });
    } finally {
      setPending(null);
    }
  };

  return (
    <Sheet open onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="flex w-full flex-col gap-0 overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{post.poster?.headline ?? "Senza titolo"}</SheetTitle>
          <SheetDescription>
            {KIND_LABELS[post.kind]} · {FORMAT_LABELS[post.format]} ·{" "}
            {format(post.createdAt, "d MMMM yyyy 'alle' HH:mm", { locale: it })}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-5 px-4 pb-6">
          <div className="flex flex-wrap items-center gap-2">
            <SocialStatusBadge status={post.status} />
            <Badge variant="outline" className="font-normal">
              {post.approval === "auto" ? "Automatico" : "Con approvazione"}
            </Badge>
          </div>

          {post.error ? (
            <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              {post.error}
            </p>
          ) : null}

          {post.poster ? (
            <div className="overflow-hidden rounded-lg border bg-muted/40">
              {/* biome-ignore lint/performance/noImgElement: è un PNG generato
                  al volo con dimensioni note, non un asset da ottimizzare. */}
              <img
                src={posterUrl(post)}
                alt={post.altText ?? "Anteprima della locandina"}
                className="w-full"
              />
            </div>
          ) : null}

          <div className="space-y-1.5">
            <Label htmlFor="caption">Didascalia</Label>
            <Textarea
              id="caption"
              rows={6}
              value={caption}
              onChange={(event) => setCaption(event.target.value)}
              disabled={!editable || pending !== null}
            />
            {post.hashtags?.length ? (
              <p className="text-xs text-muted-foreground">
                {post.hashtags.join(" ")}
              </p>
            ) : null}
          </div>

          {post.facts ? (
            <div className="space-y-1.5">
              <Label>Cosa ha letto il modello</Label>
              <pre className="max-h-40 overflow-auto whitespace-pre-wrap rounded-lg bg-muted p-3 text-xs text-muted-foreground">
                {post.facts}
              </pre>
              <p className="text-xs text-muted-foreground">
                È tutto quello che il modello ha avuto per scrivere. Se qui
                compare il nome di qualcuno dove non doveva, c'è un problema da
                segnalare.
              </p>
            </div>
          ) : null}

          {canRedo ? (
            <div className="space-y-1.5">
              <Label htmlFor="feedback">Cosa non va</Label>
              <Textarea
                id="feedback"
                rows={2}
                placeholder="Es. «troppo lungo, e non nominare il livello»"
                value={feedback}
                onChange={(event) => setFeedback(event.target.value)}
                disabled={pending !== null}
              />
              <p className="text-xs text-muted-foreground">
                Finisce nelle istruzioni al modello quando chiedi di rifare, e
                resta scritto sulla riga se scarti. Più è preciso, meglio
                funziona.
              </p>
            </div>
          ) : null}

          {post.status === "published" ? (
            <div className="space-y-2 rounded-lg border p-3">
              <p className="text-sm text-muted-foreground">
                Pubblicato
                {post.publishedAt
                  ? ` il ${format(post.publishedAt, "d MMMM 'alle' HH:mm", { locale: it })}`
                  : ""}
                . Per toglierlo bisogna aprire Instagram: l'API non permette di
                cancellare quello che ha pubblicato.
              </p>
              {post.permalink ? (
                <Button asChild variant="outline" size="sm">
                  <a
                    href={post.permalink}
                    target="_blank"
                    rel="noreferrer noopener"
                  >
                    Apri su Instagram
                    <ExternalLink className="size-4" />
                  </a>
                </Button>
              ) : null}
            </div>
          ) : null}
        </div>

        {editable || canRedo ? (
          <div className="mt-auto flex flex-wrap gap-2 border-t p-4">
            {canRedo ? (
              <Button
                variant="outline"
                disabled={pending !== null}
                onClick={() =>
                  call(
                    "redo",
                    `/api/dashboard/social/${post.id}/regenerate`,
                    { feedback: feedback.trim() || undefined },
                    "Sto rifacendo la bozza",
                    "POST",
                  )
                }
              >
                {pending === "redo" ? "Rifaccio…" : "Rifai"}
              </Button>
            ) : null}

            <Button
              variant="outline"
              disabled={!editable || !dirty || pending !== null}
              onClick={() =>
                call(
                  "save",
                  `/api/dashboard/social/${post.id}`,
                  { caption: caption.trim() },
                  "Modifiche salvate",
                )
              }
            >
              {pending === "save" ? "Salvataggio…" : "Salva"}
            </Button>

            {editable ? (
              <Button
                variant="ghost"
                disabled={pending !== null}
                onClick={() =>
                  call(
                    "reject",
                    "/api/dashboard/social",
                    {
                      action: "reject",
                      postId: post.id,
                      feedback: feedback.trim() || undefined,
                    },
                    "Bozza scartata",
                  )
                }
              >
                Scarta
              </Button>
            ) : null}

            {post.status === "pending_review" ? (
              <Button
                className="ml-auto"
                disabled={pending !== null || dirty}
                title={
                  dirty ? "Salva le modifiche prima di approvare" : undefined
                }
                onClick={() =>
                  call(
                    "approve",
                    "/api/dashboard/social",
                    { action: "approve", postId: post.id },
                    "Bozza approvata",
                  )
                }
              >
                {pending === "approve" ? "Approvo…" : "Approva"}
              </Button>
            ) : null}
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
