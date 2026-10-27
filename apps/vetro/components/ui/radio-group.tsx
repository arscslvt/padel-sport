"use client";

import { Radio as RadioPrimitive } from "@base-ui/react/radio";
import { RadioGroup as RadioGroupPrimitive } from "@base-ui/react/radio-group";

import { cn } from "@/lib/utils";

/**
 * Il radio group di shadcn (Base UI), in forma di pillole.
 *
 * Per scelte brevi e poche (il numero di campi) una fila di pillole si legge
 * e si tocca meglio di una colonna di pallini: l'opzione è il bersaglio
 * intero, alto 44px. La tastiera resta quella dei radio, frecce comprese.
 */
function RadioGroup({ className, ...props }: RadioGroupPrimitive.Props) {
  return (
    <RadioGroupPrimitive
      data-slot="radio-group"
      className={cn("flex flex-wrap gap-2", className)}
      {...props}
    />
  );
}

function RadioPill({
  className,
  children,
  ...props
}: RadioPrimitive.Root.Props) {
  return (
    <RadioPrimitive.Root
      data-slot="radio-group-item"
      className={cn(
        "inline-flex h-11 items-center justify-center rounded-full border border-input bg-field px-4.5 text-sm font-medium text-foreground outline-none select-none",
        "transition-[background-color,border-color,color,transform] duration-160 ease-(--ease-out) active:scale-[0.97]",
        "hover:border-foreground/40",
        "focus-visible:ring-3 focus-visible:ring-ring",
        "data-checked:border-primary data-checked:bg-primary data-checked:text-primary-foreground",
        "aria-invalid:border-danger-foreground",
        className,
      )}
      {...props}
    >
      {children}
    </RadioPrimitive.Root>
  );
}

export { RadioGroup, RadioPill };
