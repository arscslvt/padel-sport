/**
 * Prepara una foto per il caricamento: la riduce dentro un riquadro e la
 * ricodifica in WebP.
 *
 * Gira nel browser e non sul server perché le foto dei premi vanno dritte allo
 * storage di Convex, senza passare dal sito: questo è l'unico punto in cui
 * possiamo ancora toccarle. Il vantaggio è doppio — la persona carica
 * qualunque formato il browser sappia leggere (JPG, PNG, WebP, GIF, AVIF, HEIC
 * su Safari) e il cliente scarica una foto da qualche decina di KB invece di
 * uno scatto da cinque mega.
 *
 * La foto si riduce senza deformarla e senza ingrandirla: un'immagine più
 * piccola del riquadro resta com'è, cambia solo il formato.
 *
 * Safari non sa scrivere WebP da un canvas e restituisce un PNG: in quel caso
 * ripieghiamo su JPEG, che pesa poco quanto basta.
 */

export interface PreparedImage {
  file: File;
  width: number;
  height: number;
}

const QUALITY = 0.82;

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number,
): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

export async function prepareImage(
  source: File,
  maxSize = 600,
): Promise<PreparedImage> {
  let bitmap: ImageBitmap;

  try {
    // `from-image` rispetta l'orientamento EXIF: senza, le foto scattate in
    // verticale col telefono arriverebbero coricate.
    bitmap = await createImageBitmap(source, {
      imageOrientation: "from-image",
    });
  } catch {
    throw new Error(
      "Questo formato non si apre nel browser: prova con un JPG o un PNG.",
    );
  }

  const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  if (!context) throw new Error("Il browser non riesce a elaborare la foto.");

  context.imageSmoothingQuality = "high";
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  let blob = await canvasToBlob(canvas, "image/webp", QUALITY);
  let type = "image/webp";

  if (!blob || blob.type !== "image/webp") {
    blob = await canvasToBlob(canvas, "image/jpeg", QUALITY);
    type = "image/jpeg";
  }

  if (!blob) throw new Error("Il browser non riesce a convertire la foto.");

  const name = `${source.name.replace(/\.[^.]+$/, "") || "foto"}.${
    type === "image/webp" ? "webp" : "jpg"
  }`;

  return { file: new File([blob], name, { type }), width, height };
}
