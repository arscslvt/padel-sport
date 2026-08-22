import { buildICS } from "@/lib/calendar";
import { isConcluded } from "@/lib/events";
import { client } from "@/sanity/client";
import { EVENT_CALENDAR_QUERY } from "@/sanity/queries";

export const revalidate = 60;

const SITE_URL = "https://www.asdpadelsport.com";

type CalendarEventDoc = {
  _id: string;
  title: string;
  slug: string;
  excerpt: string;
  seoDescription?: string | null;
  dateStart: string;
  dateEnd?: string | null;
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const event = await client.fetch<CalendarEventDoc | null>(
    EVENT_CALENDAR_QUERY,
    { slug },
  );

  if (!event) {
    return new Response("Evento non trovato", { status: 404 });
  }

  // 410 e non 404: l'evento è esistito, è solo passato. Nessuna mail punta qui,
  // quindi l'unico modo di arrivarci a evento finito è l'URL scritto a mano.
  if (isConcluded(event)) {
    return new Response("Evento concluso", { status: 410 });
  }

  const ics = buildICS(
    {
      title: event.title,
      description: event.seoDescription || event.excerpt,
      dateStart: event.dateStart,
      dateEnd: event.dateEnd,
      url: `${SITE_URL}/events/${event.slug}`,
    },
    `${event._id}@asdpadelsport.com`,
  );

  return new Response(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${event.slug}.ics"`,
    },
  });
}
