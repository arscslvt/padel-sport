import "server-only";

import { render } from "@react-email/render";
import type { PortableTextBlock } from "next-sanity";

import { EventCommunicationEmail } from "@/emails/event-communication";
import { CONTENT_WIDTH } from "@/emails/theme";
import { normalizeCta } from "@/lib/event-communications";
import { urlFor } from "@/sanity/image";
import type { EventCommunicationDocument } from "@/sanity/types";

/**
 * Composizione dell'HTML di una comunicazione.
 *
 * Sta qui e non nel template perché richiede Sanity — e quindi le sue
 * variabili d'ambiente — mentre `emails/event-communication.tsx` deve restare
 * un componente puro, che l'anteprima di `react-email` sa rendere da sola.
 */

type EmailImageNode = {
  _type: "emailImage";
  _key: string;
  asset?: { _ref: string; _type: string };
  alt?: string | null;
  caption?: string | null;
  aspectRatio?: number | null;
  sourceWidth?: number | null;
};

/**
 * Sostituisce le immagini del corpo con il loro indirizzo sul CDN di Sanity.
 *
 * Nella posta le immagini non si incorporano: servono URL pubblici, ed è
 * proprio questo che rende Sanity il posto giusto in cui scrivere una
 * comunicazione — l'asset pipeline li produce da sé.
 *
 * La larghezza non supera mai la colonna di testo, ma nemmeno la misura
 * originale: allargare un'immagine piccola fino a 496px la sgrana e basta. Al
 * CDN si chiede il doppio, per gli schermi a densità alta.
 */
function resolveEmailImages(body: PortableTextBlock[]) {
  return body.map((block) => {
    if (block?._type !== "emailImage") return block;

    const image = block as unknown as EmailImageNode;
    if (!image.asset) return block;

    const width = Math.min(image.sourceWidth ?? CONTENT_WIDTH, CONTENT_WIDTH);
    const height = image.aspectRatio
      ? Math.round(width / image.aspectRatio)
      : null;

    return {
      ...block,
      url: urlFor(image)
        .width(width * 2)
        .url(),
      width,
      height,
    };
  }) as PortableTextBlock[];
}

/**
 * L'HTML pronto da spedire.
 *
 * `unsubscribeUrl` è un indirizzo già composto: la route dell'invio ci mette
 * il segnaposto e lo sostituisce per ogni destinatario, quella dell'anteprima
 * ci mette un indirizzo finto.
 */
export async function renderCommunication(
  document: EventCommunicationDocument,
  unsubscribeUrl: string,
) {
  return await render(
    EventCommunicationEmail({
      subject: document.subject,
      preheader: document.preheader,
      eventTitle: document.event?.title ?? "",
      body: resolveEmailImages(document.body ?? []),
      cta: normalizeCta(document.cta),
      unsubscribeUrl,
    }),
  );
}
