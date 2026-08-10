import type { PortableTextBlock } from "next-sanity";

export type SanityImage = {
  _type?: string;
  asset?: { _ref: string; _type: string };
  hotspot?: { x: number; y: number; height: number; width: number };
  crop?: { top: number; bottom: number; left: number; right: number };
  alt?: string | null;
  caption?: string | null;
  lqip?: string | null;
  aspectRatio?: number | null;
};

export type EventCardData = {
  _id: string;
  title: string;
  slug: string;
  excerpt: string;
  dateStart: string;
  dateEnd?: string | null;
  highlighted?: boolean | null;
  tags?: string[] | null;
  banner?: SanityImage | null;
};

export type EventContentImage = SanityImage & {
  _type: "contentImage";
  _key: string;
};

export type EventArticle = EventCardData & {
  seoDescription?: string | null;
  body?: PortableTextBlock[] | null;
};
