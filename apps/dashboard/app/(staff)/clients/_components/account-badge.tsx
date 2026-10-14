import { Ban, KeyRound, MailCheck, UserRoundCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

import type { AccountState } from "./types";

/**
 * Se il cliente ha un modo per entrare, e a che punto è.
 *
 * Sta accanto al badge della tessera perché sono due cose diverse che lo staff
 * confonderebbe volentieri: si può essere soci in regola senza account, e avere
 * un account con la tessera scaduta.
 */

const STATES: Record<
  AccountState,
  { label: string; icon: typeof KeyRound; className: string }
> = {
  active: {
    label: "Account attivo",
    icon: UserRoundCheck,
    className: "border-border bg-muted text-muted-foreground",
  },
  invited: {
    label: "Invitato",
    icon: MailCheck,
    className: "border-info-border bg-info-subtle text-info-foreground",
  },
  none: {
    label: "Senza account",
    icon: KeyRound,
    className: "border-border bg-card text-muted-foreground",
  },
};

/** La sospensione prevale sullo stato: l'account c'è, ma è chiuso. */
const SUSPENDED = {
  label: "Sospeso",
  icon: Ban,
  className: "border-danger-border bg-danger-subtle text-danger-foreground",
};

export function AccountBadge({
  state,
  suspended = false,
  className,
}: {
  state: AccountState;
  suspended?: boolean;
  className?: string;
}) {
  const {
    label,
    icon: Icon,
    className: tone,
  } = suspended ? SUSPENDED : STATES[state];

  return (
    <Badge variant="outline" className={cn("font-normal", tone, className)}>
      <Icon className="size-3.5" />
      {label}
    </Badge>
  );
}
