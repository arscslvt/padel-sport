import { AlertCircle, BadgeCheck, Clock3, UserMinus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

import type { MembershipState } from "./types";

/**
 * Lo stato della tessera, detto in un'occhiata.
 *
 * I colori seguono l'urgenza per lo staff, non l'estetica: rosso solo dove
 * serve una telefonata (scaduta, o aperta e mai saldata), ambra dove sta per
 * scadere, verde quando non c'è niente da fare.
 */

const STATES: Record<
  MembershipState,
  { label: string; icon: typeof BadgeCheck; className: string }
> = {
  active: {
    label: "Tessera attiva",
    icon: BadgeCheck,
    className:
      "border-success-border bg-success-subtle text-success-foreground",
  },
  expiring: {
    label: "In scadenza",
    icon: Clock3,
    className:
      "border-warning-border bg-warning-subtle text-warning-foreground",
  },
  unpaid: {
    label: "Da pagare",
    icon: AlertCircle,
    className: "border-danger-border bg-danger-subtle text-danger-foreground",
  },
  expired: {
    label: "Scaduta",
    icon: AlertCircle,
    className: "border-danger-border bg-danger-subtle text-danger-foreground",
  },
  none: {
    label: "Non iscritto",
    icon: UserMinus,
    className: "border-border bg-muted text-muted-foreground",
  },
};

export function MembershipBadge({
  state,
  until,
  className,
}: {
  state: MembershipState;
  /** Data di scadenza già formattata: la mostriamo dove c'è spazio. */
  until?: string;
  className?: string;
}) {
  const { label, icon: Icon, className: tone } = STATES[state];

  return (
    <Badge className={cn(tone, className)}>
      <Icon className="size-3.5" />
      {label}
      {until && state !== "none" ? ` · ${until}` : ""}
    </Badge>
  );
}
