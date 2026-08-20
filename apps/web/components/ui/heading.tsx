import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

/**
 * Tipografia dei titoli, in un posto solo.
 *
 * Instrument Serif esiste nel solo peso 400: l'enfasi si costruisce con la
 * scala, l'interlinea stretta e il corsivo, mai con `font-bold` — il browser
 * lo sintetizzerebbe sporcando i tratti. Per questo le classi stanno qui e non
 * sparse nelle pagine: cambiare la scala non deve voler dire rincorrere venti
 * file.
 */
const headingVariants = cva("font-display text-balance tracking-[-0.02em]", {
  variants: {
    size: {
      /**
       * Titolo dell'hero, il più grande della scala. Su mobile la `vw` da sola
       * lo lascerebbe minuto: sotto `sm` vale una misura fissa più generosa,
       * da lì in su riprende la scala fluida.
       */
      hero: "text-[2.75rem] leading-[1.02] sm:text-[clamp(2.25rem,4.2vw,4rem)]",
      /** Titolo di pagina (h1 di /events, /where, torneo…). */
      page: "text-4xl leading-[1.05] md:text-5xl lg:text-6xl",
      /** Titolo di sezione dentro una pagina. */
      section: "text-[clamp(1.875rem,4.5vw,3.25rem)] leading-[1.1]",
      /** Titolo di una card grande (le tre feature della home). */
      card: "text-4xl leading-tight lg:text-5xl",
      /** Titolo minore: card evento, blocchi di regolamento. */
      sub: "text-2xl leading-tight tracking-[-0.01em]",
    },
  },
  defaultVariants: {
    size: "section",
  },
});

type HeadingTag = "h1" | "h2" | "h3" | "h4" | "p";

interface HeadingProps
  extends ComponentProps<"h2">,
    VariantProps<typeof headingVariants> {
  as?: HeadingTag;
}

export function Heading({
  as: Tag = "h2",
  size,
  className,
  ...props
}: HeadingProps) {
  return (
    <Tag
      data-slot="heading"
      className={cn(headingVariants({ size }), className)}
      {...props}
    />
  );
}

interface SectionHeadingProps extends Omit<HeadingProps, "children"> {
  /** Prima parte, in tondo. */
  lead: string;
  /** Seconda parte, in corsivo: è l'accento della frase. */
  accent: string;
}

/**
 * Titolo di sezione che alterna tondo e corsivo nella stessa riga: lo stacco
 * fra i due tagli è tutta l'enfasi che serve.
 */
export function SectionHeading({
  lead,
  accent,
  ...props
}: SectionHeadingProps) {
  return (
    <Heading {...props}>
      {lead} <em className="italic">{accent}</em>
    </Heading>
  );
}

export { headingVariants };
