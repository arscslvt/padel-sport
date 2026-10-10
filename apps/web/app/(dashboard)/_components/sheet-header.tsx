import { ChevronLeft } from "lucide-react";

import { ResponsiveDrawerHeader } from "@/components/ui/responsive-drawer";
import { cn } from "@/lib/utils";

/**
 * L'intestazione dei pannelli della dashboard: titolo in Geist, allineato a
 * sinistra come le pagine, da telefono come da desktop.
 *
 * `ResponsiveDrawerHeader` di suo usa il carattere display del sito (lo vuole
 * /tournament) e il drawer dal basso centra il testo con una regola più
 * specifica di un semplice `text-left`: qui si sistemano entrambe le cose una
 * volta sola, e i pannelli della dashboard usano questo.
 *
 * `back` serve ai pannelli a più passaggi: la freccia sta a sinistra del
 * titolo, dove iOS mette l'indietro dentro un foglio, con un bersaglio di
 * 44px. L'etichetta dice dove porta, per chi usa lo screen reader.
 */
export function SheetHeader({
  title,
  description,
  back,
}: {
  title: string;
  description?: string;
  back?: { label: string; onClick: () => void };
}) {
  const header = (
    <ResponsiveDrawerHeader
      title={title}
      description={description}
      className={cn(
        "text-left group-data-[vaul-drawer-direction=bottom]/drawer-content:text-left",
        back && "min-w-0 flex-1 px-0 md:px-0",
      )}
      titleClassName="font-sans text-lg font-semibold tracking-[-0.01em] truncate"
    />
  );

  if (!back) return header;

  return (
    <div className="flex items-center gap-1 px-2 md:px-0">
      <button
        type="button"
        onClick={back.onClick}
        aria-label={back.label}
        title={back.label}
        className="hover:bg-muted active:bg-muted flex size-11 shrink-0 items-center justify-center rounded-full transition-colors md:-ml-2.5"
      >
        <ChevronLeft className="size-6" />
      </button>
      {header}
    </div>
  );
}
