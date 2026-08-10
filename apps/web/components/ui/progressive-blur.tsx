import { cn } from "@/lib/utils";

type ProgressiveBlurProps = {
  /**
   * Lato da cui il blur è pieno e verso cui sfuma:
   * `down` per una barra in alto, `up` per una barra in basso.
   */
  direction?: "down" | "up";
  /** Strati sovrapposti: più strati = sfumatura più morbida, più costo di compositing. */
  layers?: number;
  /** Raggio del primo strato in px; ogni strato successivo raddoppia. */
  blur?: number;
  /** Serve a dare l'altezza (es. `h-[46%]`): il componente non ne ha una propria. */
  className?: string;
};

/**
 * Sfumatura di blur sopra il contenuto sottostante, per staccare testo e
 * controlli da una foto senza velarla per intero.
 *
 * Ogni strato ha un `backdrop-filter` più forte del precedente e una maschera a
 * banda che scorre lungo l'asse; le bande si sovrappongono di uno step, ed è
 * quella sovrapposizione a eliminare il gradino netto che produrrebbe un
 * singolo blur mascherato. Essendo fratelli, ogni strato sfoca già il risultato
 * di quello sotto: il raggio si compone.
 *
 * Va posato dentro un genitore `relative`/`isolate` e — se il genitore è
 * arrotondato — dentro il suo `overflow-hidden`, altrimenti `backdrop-filter`
 * campiona anche lo sfondo pagina fuori dalla cornice.
 */
export function ProgressiveBlur({
  direction = "up",
  layers = 6,
  blur = 1,
  className,
}: ProgressiveBlurProps) {
  const axis = direction === "up" ? "to bottom" : "to top";
  const step = 100 / (layers + 1);

  return (
    <div
      aria-hidden
      data-slot="progressive-blur"
      // Niente `isolate` qui: un contesto di impilamento sul contenitore rischia
      // di renderlo un backdrop root, e gli strati si ritroverebbero senza nulla
      // da sfocare.
      className={cn(
        "pointer-events-none absolute inset-x-0",
        direction === "up" ? "bottom-0" : "top-0",
        className,
      )}
    >
      {Array.from({ length: layers }, (_, index) => {
        const layer = index + 1;
        const radius = blur * 2 ** index;
        const mask = `linear-gradient(${axis}, rgba(0,0,0,0) ${step * (layer - 1)}%, rgba(0,0,0,1) ${step * layer}%, rgba(0,0,0,1) ${step * (layer + 1)}%, rgba(0,0,0,0) ${step * (layer + 2)}%)`;

        return (
          <div
            key={layer}
            className="absolute inset-0"
            style={{
              backdropFilter: `blur(${radius}px)`,
              WebkitBackdropFilter: `blur(${radius}px)`,
              maskImage: mask,
              WebkitMaskImage: mask,
            }}
          />
        );
      })}
    </div>
  );
}
