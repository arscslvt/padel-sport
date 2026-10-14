import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

import {
  MATCH_STATUS_LABELS,
  type MatchStatus,
  SUPPORT_STATUS_LABELS,
  type SupportStatus,
} from "./types";

/**
 * Il colore dice quanto è urgente, non di che stato si tratta: quello che
 * aspetta una risposta si vede da lontano, quello che è chiuso si spegne.
 */
const TONES = {
  waiting: "border-warning-border bg-warning-subtle text-warning-foreground",
  working: "border-info-border bg-info-subtle text-info-foreground",
  done: "border-success-border bg-success-subtle text-success-foreground",
  closed: "text-muted-foreground",
} as const;

const SUPPORT_TONES: Record<SupportStatus, keyof typeof TONES> = {
  new: "waiting",
  in_progress: "working",
  resolved: "done",
  archived: "closed",
};

const MATCH_TONES: Record<MatchStatus, keyof typeof TONES> = {
  new: "waiting",
  in_progress: "working",
  fulfilled: "done",
  cancelled: "closed",
};

export function SupportStatusBadge({
  status,
  className,
}: {
  status: SupportStatus;
  className?: string;
}) {
  return (
    <Badge
      variant="outline"
      className={cn("font-normal", TONES[SUPPORT_TONES[status]], className)}
    >
      {SUPPORT_STATUS_LABELS[status]}
    </Badge>
  );
}

export function MatchStatusBadge({
  status,
  className,
}: {
  status: MatchStatus;
  className?: string;
}) {
  return (
    <Badge
      variant="outline"
      className={cn("font-normal", TONES[MATCH_TONES[status]], className)}
    >
      {MATCH_STATUS_LABELS[status]}
    </Badge>
  );
}
