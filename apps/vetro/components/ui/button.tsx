import { Button as ButtonPrimitive } from "@base-ui/react/button";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * Il tasto di shadcn (Base UI), riportato al marchio.
 *
 * Sempre tondo pieno: è la regola dei controlli in tutta la pagina. Alla
 * pressione scende al 97%, abbastanza per sentire che ha risposto, e torna
 * su in 160ms. Le transizioni nominano le proprietà una per una, così il
 * browser non anima per sbaglio quello che non deve.
 */
const buttonVariants = cva(
  [
    "group/button relative inline-flex shrink-0 items-center justify-center rounded-full font-medium whitespace-nowrap select-none outline-none",
    "transition-[transform,background-color,box-shadow,color,border-color] duration-160 ease-(--ease-out)",
    "active:scale-[0.97] motion-reduce:active:scale-100",
    "focus-visible:ring-3 focus-visible:ring-ring/60",
    "disabled:pointer-events-none disabled:opacity-50",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  ],
  {
    variants: {
      variant: {
        // Il verde del club con il bianco sopra (13:1). Dentro la banda verde
        // i token lo girano in menta con il testo verde notte.
        default: [
          "bg-primary text-primary-foreground",
          "shadow-[inset_0_1px_0_oklch(1_0_0/18%),0_1px_2px_oklch(0.2_0.04_165/20%),0_10px_24px_-12px_oklch(0.29_0.055_165/55%)]",
          "hover:bg-[color-mix(in_oklab,var(--primary),white_9%)]",
        ],
        glass: ["glass text-foreground", "hover:bg-white"],
        ghost: "text-foreground/80 hover:bg-foreground/6 hover:text-foreground",
        link: "rounded-md text-foreground underline-offset-4 hover:underline",
      },
      size: {
        sm: "h-9 gap-1.5 px-4 text-[13px]",
        default: "h-11 gap-2 px-5 text-sm",
        lg: "h-12 gap-2 px-6 text-[15px]",
        icon: "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
