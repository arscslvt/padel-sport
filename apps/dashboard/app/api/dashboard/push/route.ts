import { currentUser } from "@clerk/nextjs/server";
import { api } from "@padel-sport/backend/convex/_generated/api";
import type { Id } from "@padel-sport/backend/convex/_generated/dataModel";
import { NextResponse } from "next/server";
import { z } from "zod";

import { convexMessage } from "@/lib/clients";
import { adminOnly, staffGate } from "@/lib/dashboard-api";

/**
 * I dispositivi dello staff che ricevono le notifiche push.
 *
 * GET dà quel che serve al gestionale per decidere cosa mostrare: la chiave
 * pubblica VAPID con cui abbonarsi, i dispositivi attivi e i tipi di avviso
 * che chi chiede ha spento. POST abbona (o riconferma) il dispositivo da cui
 * arriva la richiesta, DELETE ne toglie uno.
 *
 * L'abbonamento porta il nome di chi ha la sessione, non uno scritto dal
 * browser: è quello che dice di chi sono le preferenze da applicare.
 */

export async function GET() {
  const gate = await staffGate();
  if (!gate.ok) return gate.response;

  try {
    const [subscriptions, preferences] = await Promise.all([
      gate.convex.query(api.modules.push.subscriptions.list, {
        secret: gate.secret,
      }),
      gate.convex.query(api.modules.push.preferences.get, {
        secret: gate.secret,
        userId: gate.userId,
      }),
    ]);

    return NextResponse.json({
      publicKey: subscriptions.publicKey,
      devices: subscriptions.devices,
      muted: preferences.muted,
    });
  } catch (error) {
    console.error("Dispositivi per le notifiche non recuperati:", error);
    return NextResponse.json(
      { error: convexMessage(error, "Non riesco a leggere i dispositivi.") },
      { status: 502 },
    );
  }
}

const subscribeSchema = z.object({
  subscription: z.object({
    endpoint: z.url(),
    keys: z.object({ p256dh: z.string().min(1), auth: z.string().min(1) }),
  }),
  /** Calcolata dal browser; senza (il service worker) si ricava qui. */
  device: z.string().max(60).optional(),
  /** L'abbonamento che questo sostituisce, quando lo rinnova il browser. */
  replaces: z.string().optional(),
});

/** Ripiego per chi non manda l'etichetta: il service worker non sa se è installato. */
function deviceFromUserAgent(ua: string) {
  if (/iPhone|iPod/.test(ua)) return "iPhone";
  if (/iPad/.test(ua)) return "iPad";
  if (/Android/.test(ua)) return "Android";
  if (/Macintosh/.test(ua)) return "Mac";
  if (/Windows/.test(ua)) return "Windows";
  return "Dispositivo";
}

export async function POST(request: Request) {
  const gate = await staffGate();
  if (!gate.ok) return gate.response;

  const parsed = subscribeSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return NextResponse.json({ error: "Dati non validi." }, { status: 400 });
  }

  const { subscription, device, replaces } = parsed.data;
  const user = await currentUser();

  try {
    if (replaces && replaces !== subscription.endpoint) {
      await gate.convex.mutation(api.modules.push.subscriptions.remove, {
        secret: gate.secret,
        endpoint: replaces,
      });
    }

    await gate.convex.mutation(api.modules.push.subscriptions.subscribe, {
      secret: gate.secret,
      userId: gate.userId,
      userName:
        user?.fullName ?? user?.primaryEmailAddress?.emailAddress ?? undefined,
      device:
        device ?? deviceFromUserAgent(request.headers.get("user-agent") ?? ""),
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
    });

    return NextResponse.json({ subscribed: true });
  } catch (error) {
    console.error("Dispositivo non abbonato alle notifiche:", error);
    return NextResponse.json(
      { error: convexMessage(error, "Non riesco ad attivare le notifiche.") },
      { status: 502 },
    );
  }
}

const removeSchema = z.union([
  z.object({ endpoint: z.string().min(1) }),
  z.object({ id: z.string().min(1) }),
]);

export async function DELETE(request: Request) {
  const gate = await staffGate();
  if (!gate.ok) return gate.response;

  const parsed = removeSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Dati non validi." }, { status: 400 });
  }

  // Togliere il telefono di un collega è gestire lo staff: lo fa un
  // amministratore. I propri dispositivi ognuno li toglie da sé.
  if ("id" in parsed.data && !gate.isAdmin) {
    const { devices } = await gate.convex
      .query(api.modules.push.subscriptions.list, { secret: gate.secret })
      .catch(() => ({ devices: [] as { _id: string; userId: string }[] }));
    const id = parsed.data.id;
    const device = devices.find((row) => row._id === id);
    if (device?.userId !== gate.userId) return adminOnly();
  }

  try {
    await gate.convex.mutation(api.modules.push.subscriptions.remove, {
      secret: gate.secret,
      ...("id" in parsed.data
        ? { id: parsed.data.id as Id<"pushSubscriptions"> }
        : { endpoint: parsed.data.endpoint }),
    });

    return NextResponse.json({ removed: true });
  } catch (error) {
    console.error("Dispositivo non tolto dalle notifiche:", error);
    return NextResponse.json(
      { error: convexMessage(error, "Non riesco a togliere il dispositivo.") },
      { status: 502 },
    );
  }
}
