import type { PosterAccent } from "@padel-sport/backend/convex/modules/social/lib";
import {
  GENERATED_BACKGROUND,
  PHOTO_SCRIM,
  treatment,
} from "@/lib/poster/theme";

/**
 * Lo strato sotto il testo di una locandina.
 *
 * Tre casi, in ordine di preferenza: la fotografia scelta dallo staff, il
 * fondo pieno del trattamento, il gradiente generato. L'ultimo non è un
 * ripiego provvisorio — la libreria foto può essere vuota e Sanity può non
 * rispondere, e nessuna delle due è una ragione per saltare una pubblicazione.
 *
 * Tutto è in posizione assoluta con misure esplicite perché satori non deduce
 * le dimensioni da `inset`: un riquadro senza `width` e `height` scritti a
 * chiare lettere collassa a zero e sparisce senza dire niente.
 */
export function PosterBackground({
  accent,
  width,
  height,
  backgroundUrl,
}: {
  accent: PosterAccent;
  width: number;
  height: number;
  backgroundUrl?: string;
}) {
  const box = { position: "absolute" as const, top: 0, left: 0, width, height };

  // La fotografia vale solo con il trattamento che la prevede: una foto sotto
  // il fondo chiaro renderebbe illeggibile il testo scuro, ed è il genere di
  // combinazione che il modello può proporre per distrazione.
  if (accent === "photo" && backgroundUrl) {
    return (
      <>
        <div
          style={{
            ...box,
            display: "flex",
            backgroundImage: `url(${backgroundUrl})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
        <div
          style={{ ...box, display: "flex", backgroundImage: PHOTO_SCRIM }}
        />
      </>
    );
  }

  return (
    <div
      style={{
        ...box,
        display: "flex",
        backgroundColor: treatment[accent].background,
        ...(accent === "photo" || accent === "ink"
          ? { backgroundImage: GENERATED_BACKGROUND }
          : {}),
      }}
    />
  );
}
