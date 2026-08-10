import Image from "next/image";

import { cn } from "@/lib/utils";
import { urlFor } from "@/sanity/image";
import type { SanityImage as SanityImageType } from "@/sanity/types";

interface SanityImageProps {
  image: SanityImageType;
  /** Sovrascrive il testo alternativo salvato su Sanity. */
  alt?: string;
  /** Proporzioni del contenitore. Di default usa quelle native dell'asset. */
  ratio?: number;
  sizes: string;
  /** Larghezza della sorgente richiesta al CDN di Sanity. */
  sourceWidth?: number;
  className?: string;
  imageClassName?: string;
  priority?: boolean;
}

export function SanityImage({
  image,
  alt,
  ratio,
  sizes,
  sourceWidth = 1600,
  className,
  imageClassName,
  priority,
}: SanityImageProps) {
  if (!image?.asset) return null;

  const src = urlFor(image).width(sourceWidth).url();
  const aspectRatio = ratio ?? image.aspectRatio ?? 16 / 9;

  return (
    <div
      className={cn("relative overflow-hidden bg-muted", className)}
      style={{ aspectRatio }}
    >
      <Image
        src={src}
        alt={alt ?? image.alt ?? ""}
        fill
        sizes={sizes}
        priority={priority}
        placeholder={image.lqip ? "blur" : "empty"}
        blurDataURL={image.lqip ?? undefined}
        className={cn("object-cover", imageClassName)}
      />
    </div>
  );
}
