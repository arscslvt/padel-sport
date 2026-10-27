import { Input as InputPrimitive } from "@base-ui/react/input";
import type * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Il campo di shadcn (Base UI), riportato al marchio.
 *
 * 44px di altezza, il minimo per un dito. Colori dai token (`input`,
 * `field`): sul grigio il campo è bianco con il bordo a 3:1, dentro la banda
 * verde diventa una lastra chiara sul verde. Il placeholder è un esempio,
 * mai l'etichetta.
 */
function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        "h-11 w-full min-w-0 rounded-xl border border-input bg-field px-3.5 text-base text-foreground outline-none md:text-sm",
        "transition-[border-color,box-shadow,background-color] duration-160 ease-(--ease-out)",
        "placeholder:text-muted-foreground",
        "hover:border-foreground/40",
        "focus-visible:border-brand focus-visible:ring-3 focus-visible:ring-ring",
        "aria-invalid:border-danger-foreground aria-invalid:ring-3 aria-invalid:ring-danger/20",
        "disabled:pointer-events-none disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
