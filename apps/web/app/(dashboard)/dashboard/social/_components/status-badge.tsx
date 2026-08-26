import type { SocialPostStatus } from "@padel-sport/backend/convex/modules/social/lib";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

import { STATUS_LABELS } from "./types";

/**
 * Il colore dice cosa tocca a te, non a che punto è la macchina.
 *
 * Ciò che aspetta una decisione si vede da lontano, ciò che è concluso si
 * spegne, ciò che è rotto grida. Gli stati intermedi — composizione, coda,
 * pubblicazione — sono affari del sistema e stanno in secondo piano: nessuno
 * deve fare niente mentre ci passano.
 */
const TONES = {
  waiting: "border-amber-200 bg-amber-50 text-amber-900",
  working: "border-blue-200 bg-blue-50 text-blue-900",
  done: "border-emerald-200 bg-emerald-50 text-emerald-900",
  broken: "border-red-200 bg-red-50 text-red-900",
  closed: "text-muted-foreground",
} as const;

const STATUS_TONES: Record<SocialPostStatus, keyof typeof TONES> = {
  drafting: "working",
  pending_review: "waiting",
  queued: "working",
  publishing: "working",
  published: "done",
  rejected: "closed",
  skipped: "closed",
  failed: "broken",
  needs_attention: "waiting",
};

export function SocialStatusBadge({
  status,
  className,
}: {
  status: SocialPostStatus;
  className?: string;
}) {
  return (
    <Badge
      variant="outline"
      className={cn("font-normal", TONES[STATUS_TONES[status]], className)}
    >
      {STATUS_LABELS[status]}
    </Badge>
  );
}
