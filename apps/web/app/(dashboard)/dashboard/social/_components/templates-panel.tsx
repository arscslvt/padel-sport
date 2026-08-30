"use client";

import type { PosterSpec } from "@padel-sport/backend/convex/modules/social/lib";
import { Check, Sparkles, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/app/(dashboard)/_components/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

import { FORMAT_LABELS, KIND_LABELS } from "./types";

/**
 * I template, e i buchi nella copertura.
 *
 * La mappa in cima è la parte che serve davvero: dice quali situazioni non
 * sanno ancora raccontarsi. Senza, un buco si scopre quando una finale non
 * esce e qualcuno va a leggere il motivo dentro una riga saltata.
 */

type Format = "feed" | "story";

interface Slot {
  kind: string;
  situation: string;
  formats: Format[];
  /** I formati che nessuno template approvato copre ancora. */
  missingFormats: Format[];
  approved: number;
  pending: number;
}

interface Template {
  id: string;
  kind: string;
  situation: string;
  formats: Format[];
  status: "pending_review" | "approved" | "rejected" | "retired";
  caption: string;
  hashtags: string[];
  poster: PosterSpec;
  usageCount: number;
  model?: string;
  createdAt: number;
}

interface Payload {
  coverage: Slot[];
  templates: Template[];
}

const STATUS_LABELS: Record<Template["status"], string> = {
  pending_review: "Da leggere",
  approved: "In uso",
  rejected: "Scartato",
  retired: "Ritirato",
};

export function TemplatesPanel() {
  const [data, setData] = useState<Payload | null>(null);
  const [pending, setPending] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/dashboard/social/templates");
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        toast.error("Template non caricati", {
          description: payload?.error ?? "Riprova fra poco.",
        });
        setData({ coverage: [], templates: [] });
        return;
      }

      setData(payload);
    } catch {
      toast.error("Template non caricati", {
        description: "Controlla la connessione e riprova.",
      });
      setData({ coverage: [], templates: [] });
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const call = async (
    key: string,
    url: string,
    method: "PATCH" | "POST",
    body: Record<string, unknown>,
    success: string,
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
      await load();
    } catch {
      toast.error("Operazione non riuscita", {
        description: "Controlla la connessione e riprova.",
      });
    } finally {
      setPending(null);
    }
  };

  if (!data) {
    return (
      <div className="space-y-2">
        {[0, 1, 2, 3].map((row) => (
          <Skeleton key={row} className="h-16 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  // Scoperta è anche una situazione con un template che copre il post ma non la
  // storia: da fuori sembra a posto, e invece metà dei contenuti verrebbe
  // saltata.
  const uncovered = data.coverage.filter(
    (slot) => slot.missingFormats.length > 0,
  );
  const toRead = data.templates.filter(
    (template) => template.status === "pending_review",
  );
  const inUse = data.templates.filter(
    (template) => template.status === "approved",
  );

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold">Copertura</h2>
          <p className="text-sm text-muted-foreground">
            {uncovered.length === 0
              ? "Ogni situazione è coperta in tutti i suoi formati: il sistema sa raccontarle tutte."
              : `${uncovered.length} situazioni su ${data.coverage.length} non sono ancora coperte. I contenuti che ci ricadono vengono saltati.`}
          </p>
        </div>

        <div className="overflow-hidden rounded-lg border">
          <ul className="divide-y bg-white">
            {data.coverage.map((slot) => {
              const key = `${slot.kind}/${slot.situation}`;
              const empty = slot.missingFormats.length > 0;

              return (
                <li
                  key={key}
                  className="flex flex-wrap items-center gap-3 px-4 py-3"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">
                      {KIND_LABELS[slot.kind as keyof typeof KIND_LABELS] ??
                        slot.kind}{" "}
                      · {slot.situation}
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      {slot.formats
                        .map((format) => FORMAT_LABELS[format])
                        .join(" e ")}
                      {slot.pending > 0 ? ` · ${slot.pending} da leggere` : ""}
                    </span>
                  </span>

                  <Badge
                    variant="outline"
                    className={cn(
                      "font-normal",
                      empty
                        ? "border-amber-200 bg-amber-50 text-amber-900"
                        : "border-emerald-200 bg-emerald-50 text-emerald-900",
                    )}
                  >
                    {slot.approved === 0
                      ? "nessuno template"
                      : empty
                        ? `manca ${slot.missingFormats.map((f) => FORMAT_LABELS[f]).join(" e ")}`
                        : `${slot.approved} in uso`}
                  </Badge>

                  <Button
                    size="sm"
                    variant={empty ? "default" : "outline"}
                    disabled={pending !== null}
                    onClick={() =>
                      call(
                        key,
                        "/api/dashboard/social/templates",
                        "POST",
                        {
                          kind: slot.kind,
                          situation: slot.situation,
                          count: 6,
                        },
                        "Sto scrivendo i template: compaiono qui fra poco.",
                      )
                    }
                  >
                    <Sparkles className="size-4" />
                    {pending === key ? "Scrivo…" : "Genera"}
                  </Button>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      <section className="space-y-3">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold">Da leggere</h2>
          <p className="text-sm text-muted-foreground">
            Scritti dall'IA, non ancora in circolo. I buchi si vedono come{" "}
            <code className="text-xs">{"{nome}"}</code>: verranno riempiti con
            dati veri.
          </p>
        </div>

        {toRead.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Sparkles className="size-5" />
              </EmptyMedia>
              <EmptyTitle>Niente da leggere</EmptyTitle>
              <EmptyDescription>
                Genera template per una situazione scoperta dalla mappa qui
                sopra.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <div className="grid gap-3">
            {toRead.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                pending={pending}
                onReview={(status) =>
                  call(
                    `review:${template.id}`,
                    "/api/dashboard/social/templates",
                    "PATCH",
                    { templateId: template.id, status },
                    status === "approved"
                      ? "Template in uso"
                      : "Template scartato",
                  )
                }
              />
            ))}
          </div>
        )}
      </section>

      {inUse.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">In uso</h2>
          <div className="grid gap-3">
            {inUse.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                pending={pending}
                onReview={(status) =>
                  call(
                    `review:${template.id}`,
                    "/api/dashboard/social/templates",
                    "PATCH",
                    { templateId: template.id, status },
                    "Template ritirato",
                  )
                }
              />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function TemplateCard({
  template,
  pending,
  onReview,
}: {
  template: Template;
  pending: string | null;
  onReview: (status: "approved" | "rejected" | "retired") => void;
}) {
  const busy = pending === `review:${template.id}`;
  const approved = template.status === "approved";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">
          {template.poster.headline}
        </CardTitle>
        <CardDescription>
          {KIND_LABELS[template.kind as keyof typeof KIND_LABELS] ??
            template.kind}{" "}
          · {template.situation} ·{" "}
          {template.formats.map((f) => FORMAT_LABELS[f]).join(" e ")}
          {approved && template.usageCount > 0
            ? ` · usato ${template.usageCount} volte`
            : ""}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-3 text-sm">
        <div className="flex flex-col gap-3 sm:flex-row">
          {/* L'anteprima è riempita con valori inventati: è l'unico modo di
              vedere se un nome lungo sfonda il titolo prima che succeda in
              pubblico. Larga un terzo, perché serve a cogliere l'impaginazione
              a colpo d'occhio, non a leggerla. */}
          <div className="flex shrink-0 gap-2">
            {/* Un riquadro per formato, perché le due tele mettono alla prova
                cose diverse: un titolo che sta nel post può sfondare nella
                storia, ed è meglio vederlo adesso. */}
            {template.formats.map((format) => (
              <div
                key={format}
                className="w-28 overflow-hidden rounded-lg border bg-muted/40 sm:w-32"
              >
                {/* biome-ignore lint/performance/noImgElement: PNG generato al
                    volo con dimensioni note, non un asset da ottimizzare. */}
                <img
                  src={`/api/social/poster/preview?template=${template.id}&format=${format}`}
                  alt={`Anteprima ${FORMAT_LABELS[format].toLowerCase()} del template ${template.poster.headline}`}
                  className="w-full"
                />
              </div>
            ))}
          </div>

          <div className="min-w-0 flex-1 space-y-2">
            {template.poster.subhead ? (
              <p className="text-muted-foreground">{template.poster.subhead}</p>
            ) : null}
            {template.poster.bullets?.length ? (
              <ul className="text-muted-foreground">
                {template.poster.bullets.map((bullet) => (
                  <li key={bullet}>— {bullet}</li>
                ))}
              </ul>
            ) : null}
            <p className="rounded-lg bg-muted p-3 text-xs text-muted-foreground">
              {template.caption}
            </p>
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          Nell'anteprima i buchi sono riempiti con valori inventati: i dati veri
          arrivano al momento della pubblicazione.
        </p>
      </CardContent>

      <CardFooter className="flex flex-wrap gap-2">
        <Badge variant="outline" className="font-normal">
          {STATUS_LABELS[template.status]}
        </Badge>

        {approved ? (
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto"
            disabled={busy}
            onClick={() => onReview("retired")}
          >
            <Trash2 className="size-4" />
            Ritira
          </Button>
        ) : (
          <>
            <Button
              variant="ghost"
              size="sm"
              disabled={busy}
              onClick={() => onReview("rejected")}
            >
              <X className="size-4" />
              Scarta
            </Button>
            <Button
              size="sm"
              className="ml-auto"
              disabled={busy}
              onClick={() => onReview("approved")}
            >
              <Check className="size-4" />
              {busy ? "…" : "Metti in uso"}
            </Button>
          </>
        )}
      </CardFooter>
    </Card>
  );
}
