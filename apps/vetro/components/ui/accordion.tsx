import { Accordion as AccordionPrimitive } from "@base-ui/react/accordion";
import { PlusIcon } from "@phosphor-icons/react/dist/ssr";

import { cn } from "@/lib/utils";

/**
 * L'accordion di shadcn (Base UI), per le domande.
 *
 * Il pannello si apre sull'altezza misurata da Base UI e il testo arriva con
 * un velo di blur che si scioglie: senza, durante l'apertura si vedrebbe il
 * testo tagliato di netto dal bordo che scende. Il più ruota in una croce,
 * così lo stesso segno dice «apri» e «chiudi».
 */
function Accordion({ className, ...props }: AccordionPrimitive.Root.Props) {
  return (
    <AccordionPrimitive.Root
      data-slot="accordion"
      className={cn("flex w-full flex-col", className)}
      {...props}
    />
  );
}

function AccordionItem({ className, ...props }: AccordionPrimitive.Item.Props) {
  return (
    <AccordionPrimitive.Item
      data-slot="accordion-item"
      className={cn("border-b border-border first:border-t", className)}
      {...props}
    />
  );
}

function AccordionTrigger({
  className,
  children,
  ...props
}: AccordionPrimitive.Trigger.Props) {
  return (
    <AccordionPrimitive.Header className="flex">
      <AccordionPrimitive.Trigger
        data-slot="accordion-trigger"
        className={cn(
          "group/trigger flex flex-1 items-center justify-between gap-6 py-6 text-left text-[17px] font-medium text-foreground outline-none",
          "transition-colors duration-160 hover:text-brand focus-visible:text-brand",
          className,
        )}
        {...props}
      >
        {children}
        <span className="grid size-8 shrink-0 place-content-center rounded-full border border-border text-muted-foreground transition-[transform,color,border-color] duration-300 ease-(--ease-out) group-hover/trigger:border-brand/40 group-hover/trigger:text-brand group-aria-expanded/trigger:rotate-45">
          <PlusIcon aria-hidden className="size-3.5" weight="bold" />
        </span>
      </AccordionPrimitive.Trigger>
    </AccordionPrimitive.Header>
  );
}

function AccordionContent({
  className,
  children,
  ...props
}: AccordionPrimitive.Panel.Props) {
  return (
    <AccordionPrimitive.Panel
      data-slot="accordion-content"
      className={cn(
        "h-(--accordion-panel-height) overflow-hidden",
        "transition-[height] duration-300 ease-(--ease-out) motion-reduce:transition-none",
        "data-ending-style:h-0 data-starting-style:h-0",
      )}
      {...props}
    >
      <div
        className={cn(
          "max-w-[62ch] pb-7 text-[15px] leading-relaxed text-muted-foreground",
          "transition-[opacity,filter] duration-300 ease-(--ease-out)",
          "in-data-starting-style:opacity-0 in-data-starting-style:blur-xs in-data-ending-style:opacity-0 in-data-ending-style:blur-xs",
          className,
        )}
      >
        {children}
      </div>
    </AccordionPrimitive.Panel>
  );
}

export { Accordion, AccordionContent, AccordionItem, AccordionTrigger };
