import { Img, Link, Section, Text } from "@react-email/components";
import type { PortableTextComponents } from "next-sanity";

import * as s from "../theme";

/**
 * Un'immagine del corpo con l'indirizzo già risolto.
 *
 * La risoluzione avviene prima, in `lib/event-communications.ts`, e non qui:
 * così questo file non tocca né Sanity né le sue variabili d'ambiente, e resta
 * un componente puro che l'anteprima di `react-email` può rendere con dei dati
 * finti. Nella posta l'immagine deve comunque stare su un URL pubblico —
 * incorporarla non si può — quindi risolverla a monte non toglie niente.
 */
export type ResolvedEmailImage = {
  _type: "emailImage";
  _key: string;
  url: string;
  /** Larghezza in pixel, mai oltre la colonna di testo */
  width: number;
  height?: number | null;
  alt?: string | null;
  caption?: string | null;
};

/**
 * Il corpo di una comunicazione, reso con i componenti di React Email.
 *
 * Gemello di `components/events/portable-text.tsx`, che fa la stessa cosa per
 * il sito. Sono due file e non uno perché la posta non è HTML col freno a
 * mano: niente classi, stili solo inline, e per gli elenchi nemmeno i valori
 * predefiniti del browser si possono dare per scontati.
 */
export const emailPortableTextComponents: PortableTextComponents = {
  block: {
    normal: ({ children }) => <Text style={s.paragraph}>{children}</Text>,
    h2: ({ children }) => <Text style={s.heading}>{children}</Text>,
    h3: ({ children }) => <Text style={s.subheading}>{children}</Text>,
    blockquote: ({ children }) => <Text style={s.quote}>{children}</Text>,
  },

  // `Text` di React Email è un `<p>`, che dentro un `<li>` non ci va: gli
  // elenchi usano i tag nudi con gli stili espliciti di `theme.ts`.
  list: {
    bullet: ({ children }) => <ul style={s.list}>{children}</ul>,
    number: ({ children }) => <ol style={s.list}>{children}</ol>,
  },
  listItem: {
    bullet: ({ children }) => <li style={s.listItem}>{children}</li>,
    number: ({ children }) => <li style={s.listItem}>{children}</li>,
  },

  marks: {
    strong: ({ children }) => (
      <strong style={{ color: s.color.foreground }}>{children}</strong>
    ),
    em: ({ children }) => <em>{children}</em>,
    link: ({ children, value }) => (
      <Link href={(value as { href?: string })?.href} style={s.link}>
        {children}
      </Link>
    ),
  },

  types: {
    emailImage: ({ value }: { value: ResolvedEmailImage }) => {
      if (!value?.url) return null;

      return (
        <Section style={s.figure}>
          {/*
            Larghezza e altezza anche come attributi, non solo nel CSS: Outlook
            non ricava le dimensioni dal foglio di stile, e senza queste
            allarga l'immagine a caso mentre la scarica.
          */}
          <Img
            src={value.url}
            alt={value.alt ?? ""}
            width={value.width}
            height={value.height ?? undefined}
            style={{ ...s.image, maxWidth: `${value.width}px` }}
          />
          {value.caption && <Text style={s.caption}>{value.caption}</Text>}
        </Section>
      );
    },
  },
};
