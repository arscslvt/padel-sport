import { ResponsiveDrawerHeader } from "@/components/ui/responsive-drawer";

/**
 * L'intestazione dei pannelli della dashboard: titolo in Geist, allineato a
 * sinistra come le pagine, da telefono come da desktop.
 *
 * `ResponsiveDrawerHeader` di suo usa il carattere display del sito (lo vuole
 * /tournament) e il drawer dal basso centra il testo con una regola più
 * specifica di un semplice `text-left`: qui si sistemano entrambe le cose una
 * volta sola, e i pannelli della dashboard usano questo.
 */
export function SheetHeader({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <ResponsiveDrawerHeader
      title={title}
      description={description}
      className="text-left group-data-[vaul-drawer-direction=bottom]/drawer-content:text-left"
      titleClassName="font-sans text-lg font-semibold tracking-[-0.01em]"
    />
  );
}
