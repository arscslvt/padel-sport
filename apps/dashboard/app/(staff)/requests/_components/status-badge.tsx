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
  waiting: "border-amber-200 bg-amber-50 text-amber-900",
  working: "border-blue-200 bg-blue-50 text-blue-900",
  done: "border-emerald-200 bg-emerald-50 text-emerald-900",
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
