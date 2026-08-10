import { ArrowLeft, CalendarDays, Sparkles } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Script from "next/script";
import { PortableText } from "next-sanity";

import { AddToCalendar } from "@/components/events/add-to-calendar";
import { ArticleReveal } from "@/components/events/article-reveal";
import { portableTextComponents } from "@/components/events/portable-text";
import { SanityImage } from "@/components/events/sanity-image";
import { ShareRail } from "@/components/events/share-rail";
import { Heading } from "@/components/ui/heading";
import { formatEventDate } from "@/lib/events";
import { EVENTS_LINK } from "@/lib/links";
import { client } from "@/sanity/client";
import { ogImageUrl } from "@/sanity/image";
import { EVENT_BY_SLUG_QUERY, EVENT_SLUGS_QUERY } from "@/sanity/queries";
import type { EventArticle } from "@/sanity/types";

export const revalidate = 60;

const SITE_URL = "https://www.asdpadelsport.com";

type PageProps = { params: Promise<{ slug: string }> };

async function getEvent(slug: string) {
  return client.fetch<EventArticle | null>(EVENT_BY_SLUG_QUERY, { slug });
}

export async function generateStaticParams() {
  const slugs = await client.fetch<string[]>(EVENT_SLUGS_QUERY);
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const event = await getEvent(slug);

  if (!event) return { title: "Evento non trovato" };

  const description = event.seoDescription || event.excerpt;
  const path = `${EVENTS_LINK}/${event.slug}`;
  const image = event.banner?.asset ? ogImageUrl(event.banner) : undefined;

  return {
    title: event.title,
    description,
    keywords: event.tags ?? undefined,
    alternates: { canonical: path },
    openGraph: {
      type: "article",
      url: path,
      title: event.title,
      description,
      publishedTime: event.dateStart,
      tags: event.tags ?? undefined,
      images: image
        ? [{ url: image, width: 1200, height: 630, alt: event.title }]
        : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: event.title,
      description,
      images: image ? [image] : undefined,
    },
  };
}

export default async function EventArticlePage({ params }: PageProps) {
  const { slug } = await params;
  const event = await getEvent(slug);

  if (!event) notFound();

  const url = `${SITE_URL}${EVENTS_LINK}/${event.slug}`;
  const dateLabel = formatEventDate(event.dateStart, event.dateEnd);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: event.title,
    description: event.seoDescription || event.excerpt,
    startDate: event.dateStart,
    ...(event.dateEnd ? { endDate: event.dateEnd } : {}),
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    url,
    ...(event.banner?.asset ? { image: [ogImageUrl(event.banner)] } : {}),
    location: {
      "@type": "Place",
      name: "ASD Padel Sport Melilli",
      address: {
        "@type": "PostalAddress",
        streetAddress: "Via Pertini",
        addressLocality: "Melilli",
        postalCode: "96010",
        addressCountry: "IT",
      },
    },
    organizer: {
      "@type": "SportsClub",
      name: "ASD Padel Sport Melilli",
      url: SITE_URL,
    },
  };

  return (
    <div className="relative pb-20">
      {/* Rail social sticky: fuori dalla colonna di testo, come nel layout di riferimento. */}
      <div className="pointer-events-none absolute inset-y-0 left-4 hidden lg:block xl:left-10">
        <div className="pointer-events-auto sticky top-32">
          <ShareRail url={url} title={event.title} />
        </div>
      </div>

      <article className="mx-auto w-full max-w-3xl px-6">
        <ArticleReveal className="flex flex-col gap-5">
          <Link
            href={EVENTS_LINK}
            className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
            Tutti gli eventi
          </Link>

          <header className="flex flex-col gap-4">
            {Boolean(event.highlighted || event.tags?.length) && (
              <div className="flex flex-wrap items-center gap-1.5">
                {event.highlighted && (
                  <span className="bg-foreground text-background inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium tracking-wide uppercase">
                    <Sparkles className="size-3" />
                    In evidenza
                  </span>
                )}
                {event.tags?.map((tag) => (
                  <span
                    key={tag}
                    className="border-border text-muted-foreground rounded-full border px-2 py-0.5 text-[11px] font-medium"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}

            <Heading as="h1" size="page">
              {event.title}
            </Heading>

            <p className="text-muted-foreground text-lg text-pretty">
              {event.excerpt}
            </p>

            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 border-y border-border py-3">
              <span className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <CalendarDays className="size-4 shrink-0" />
                {dateLabel}
              </span>
              <div className="flex flex-wrap items-center gap-2">
                <AddToCalendar
                  event={{
                    title: event.title,
                    description: event.seoDescription || event.excerpt,
                    dateStart: event.dateStart,
                    dateEnd: event.dateEnd,
                    url,
                  }}
                  icsHref={`${EVENTS_LINK}/${event.slug}/ics`}
                />
                <ShareRail
                  url={url}
                  title={event.title}
                  orientation="horizontal"
                  className="lg:hidden"
                />
              </div>
            </div>
          </header>
        </ArticleReveal>

        {event.banner?.asset && (
          <ArticleReveal
            variant="zoom"
            delay={0.1}
            className="not-prose my-8 sm:relative sm:left-1/2 sm:w-[min(100vw-4rem,64rem)] sm:-translate-x-1/2"
          >
            <figure>
              <SanityImage
                image={event.banner}
                ratio={16 / 9}
                sizes="(min-width: 1024px) 64rem, 100vw"
                className="rounded-card"
                priority
              />
              {event.banner.caption && (
                <figcaption className="pt-3 text-center text-sm text-muted-foreground">
                  {event.banner.caption}
                </figcaption>
              )}
            </figure>
          </ArticleReveal>
        )}

        {event.body?.length ? (
          <ArticleReveal delay={0.18}>
            <div className="prose prose-event max-w-none">
              <PortableText
                value={event.body}
                components={portableTextComponents}
              />
            </div>
          </ArticleReveal>
        ) : null}
      </article>

      <Script
        id={`event-jsonld-${event.slug}`}
        type="application/ld+json"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: It's necessary for JSON-LD
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </div>
  );
}
