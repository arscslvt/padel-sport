import type * as React from "react";

import { cn } from "@/lib/utils";

/** Il gemello di `Input` su più righe: stesse misure, stessi stati. */
function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex field-sizing-content min-h-28 w-full rounded-xl border border-input bg-field px-3.5 py-3 text-base text-foreground outline-none md:text-sm",
        "transition-[border-color,box-shadow,background-color] duration-160 ease-(--ease-out)",
        "placeholder:text-muted-foreground",
        "hover:border-foreground/40",
        "focus-visible:border-brand focus-visible:ring-3 focus-visible:ring-ring",
        "aria-invalid:border-danger-foreground aria-invalid:ring-3 aria-invalid:ring-danger/20",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
