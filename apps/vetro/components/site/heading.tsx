import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

/**
 * La scala dei titoli, la stessa serif del sito del club.
 *
 * Instrument Serif esiste in un peso solo: l'enfasi viene dalla scala,
 * dall'interlinea stretta e dal corsivo, mai dal grassetto, che il browser
 * sintetizzerebbe sporcando i tratti. L'interlinea non scende sotto 1.02:
 * il corsivo ha le discendenti lunghe e verrebbero tagliate.
 */
export const headingVariants = cva(
  "font-display font-normal text-balance tracking-[-0.02em] text-foreground",
  {
    variants: {
      size: {
        hero: "text-[3.25rem] leading-[1.02] sm:text-[clamp(4rem,8.4vw,7.5rem)] sm:leading-[0.98]",
        section:
          "text-[2.6rem] leading-[1.04] sm:text-[clamp(3rem,5.6vw,4.75rem)]",
        card: "text-[1.75rem] leading-[1.08] lg:text-[2rem]",
      },
    },
    defaultVariants: { size: "section" },
  },
);

type HeadingTag = "h1" | "h2" | "h3" | "p";

export function Heading({
  as: Tag = "h2",
  size,
  className,
  ...props
}: ComponentProps<"h2"> &
  VariantProps<typeof headingVariants> & { as?: HeadingTag }) {
  return (
    <Tag className={cn(headingVariants({ size }), className)} {...props} />
  );
}
