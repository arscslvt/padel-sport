import {
  createImageUrlBuilder,
  type SanityImageSource,
} from "@sanity/image-url";

import { dataset, projectId } from "./env";

const builder = createImageUrlBuilder({ projectId, dataset });

export function urlFor(source: SanityImageSource) {
  return builder.image(source).auto("format").fit("max");
}

/** Immagine ritagliata per le anteprime social (Open Graph / Twitter). */
export function ogImageUrl(source: SanityImageSource) {
  return builder
    .image(source)
    .width(1200)
    .height(630)
    .fit("crop")
    .auto("format")
    .url();
}
