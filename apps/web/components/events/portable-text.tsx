import Link from "next/link";
import type { PortableTextComponents } from "next-sanity";
import { toPlainText } from "next-sanity";

import { SanityImage } from "@/components/events/sanity-image";
import type { EventContentImage } from "@/sanity/types";

/** Il breakout dei media rispetto alla colonna di testo, come nel layout di riferimento. */
const BREAKOUT =
  "not-prose my-8 sm:relative sm:left-1/2 sm:w-[min(100vw-4rem,64rem)] sm:-translate-x-1/2";

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function headingId(children: React.ReactNode, value: unknown) {
  // `value` è il blocco Portable Text: ne ricaviamo il testo puro per l'ancora.
  const text = value ? toPlainText(value as never) : String(children ?? "");
  return slugify(text) || undefined;
}

export const portableTextComponents: PortableTextComponents = {
  types: {
    contentImage: ({ value }: { value: EventContentImage }) => {
      if (!value?.asset) return null;

      return (
        <figure className={BREAKOUT}>
          <SanityImage
            image={value}
            sizes="(min-width: 1024px) 64rem, 100vw"
            className="rounded-2xl"
          />
          {value.caption && (
            <figcaption className="pt-3 text-center text-sm text-muted-foreground">
              {value.caption}
            </figcaption>
          )}
        </figure>
      );
    },
  },
  block: {
    h2: ({ children, value }) => (
      <h2 id={headingId(children, value)}>{children}</h2>
    ),
    h3: ({ children, value }) => (
      <h3 id={headingId(children, value)}>{children}</h3>
    ),
    h4: ({ children, value }) => (
      <h4 id={headingId(children, value)}>{children}</h4>
    ),
  },
  marks: {
    link: ({ children, value }) => {
      const href: string = value?.href ?? "#";
      const isExternal =
        /^https?:\/\//.test(href) && !href.includes("asdpadelsport.com");

      if (isExternal || value?.blank) {
        return (
          <a href={href} target="_blank" rel="noopener noreferrer">
            {children}
          </a>
        );
      }

      return <Link href={href}>{children}</Link>;
    },
  },
};
