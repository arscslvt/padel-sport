import { httpRouter } from "convex/server";

import { internal } from "./_generated/api";
import { httpAction } from "./_generated/server";
import {
  fromResendEvent,
  fromTwilioStatus,
  twilioErrorDetail,
} from "./modules/deliveries/lib";
import {
  verifySvixSignature,
  verifyTwilioSignature,
} from "./utils/webhookSignatures";

/**
 * Le porte HTTP del deployment: per ora solo i webhook che raccontano com'è
 * finito un avviso al cliente (tables/bookingDeliveries.ts).
 *
 * Stanno su `CONVEX_SITE_URL` (`https://<deployment>.convex.site`):
 *
 * - `/webhooks/resend` va registrato a mano nel pannello di Resend, con gli
 *   eventi delle email, e il suo segreto `whsec_…` va in
 *   `RESEND_WEBHOOK_SECRET`;
 * - `/webhooks/twilio` non si registra: lo passa ogni messaggio WhatsApp come
 *   `statusCallback` (notifications/confirmation.ts), e la firma si verifica
 *   con lo stesso `TWILIO_AUTH` che serve a spedire.
 *
 * - `/webhooks/sumup` non si registra nemmeno: lo passa ogni checkout come
 *   `return_url` (modules/payments/checkout.ts).
 *
 * Rispondono 2xx anche agli eventi che non riguardano le prenotazioni: un
 * errore farebbe solo ritentare il provider per ore.
 */
const http = httpRouter();

http.route({
  path: "/webhooks/resend",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const secret = process.env.RESEND_WEBHOOK_SECRET;
    if (!secret) {
      console.error("RESEND_WEBHOOK_SECRET non configurata: evento scartato.");
      return new Response("Webhook non configurato", { status: 500 });
    }

    // Il corpo va firmato così com'è arrivato: si legge come testo, e si
    // interpreta solo dopo.
    const body = await request.text();
    const header = (name: string) =>
      request.headers.get(`svix-${name}`) ??
      request.headers.get(`webhook-${name}`) ??
      "";

    const valid = await verifySvixSignature({
      secret,
      id: header("id"),
      timestamp: header("timestamp"),
      signatures: header("signature"),
      body,
    });
    if (!valid) return new Response("Firma non valida", { status: 401 });

    let event: Parameters<typeof fromResendEvent>[0];
    try {
      event = JSON.parse(body);
    } catch {
      return new Response("Corpo non valido", { status: 400 });
    }

    const update = fromResendEvent(event);
    const emailId = event.data?.email_id;

    if (update && emailId) {
      await ctx.runMutation(internal.modules.deliveries.record.fromProvider, {
        providerId: emailId,
        ...update,
      });
    }

    return new Response(null, { status: 200 });
  }),
});

http.route({
  path: "/webhooks/twilio",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const authToken = process.env.TWILIO_AUTH;
    if (!authToken) {
      console.error("TWILIO_AUTH non configurata: evento scartato.");
      return new Response("Webhook non configurato", { status: 500 });
    }

    const params = new URLSearchParams(await request.text());
    const signature = request.headers.get("x-twilio-signature") ?? "";

    // Twilio firma l'URL che gli abbiamo dato noi, cioè quello costruito su
    // `CONVEX_SITE_URL`. `request.url` dovrebbe coincidere; si provano tutti e
    // due perché un dominio personalizzato davanti al deployment li separa.
    const { pathname, search } = new URL(request.url);
    const urls = new Set([
      request.url,
      `${process.env.CONVEX_SITE_URL}${pathname}${search}`,
    ]);

    let valid = false;
    for (const url of urls) {
      if (await verifyTwilioSignature({ authToken, url, params, signature })) {
        valid = true;
        break;
      }
    }
    if (!valid) return new Response("Firma non valida", { status: 403 });

    const sid = params.get("MessageSid");
    const status = fromTwilioStatus(params.get("MessageStatus") ?? "");

    if (sid && status) {
      await ctx.runMutation(internal.modules.deliveries.record.fromProvider, {
        providerId: sid,
        status,
        detail:
          status === "failed"
            ? twilioErrorDetail(
                params.get("ErrorCode"),
                params.get("ErrorMessage") ?? undefined,
              )
            : undefined,
      });
    }

    return new Response(null, { status: 200 });
  }),
});

http.route({
  path: "/webhooks/sumup",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    // SumUp non firma i webhook, e il corpo dice solo *quale* checkout è
    // cambiato: lo stato vero si rilegge dall'API con la nostra chiave. Chi
    // chiamasse questo indirizzo a vuoto otterrebbe al più una rilettura.
    let event: { event_type?: unknown; id?: unknown };
    try {
      event = await request.json();
    } catch {
      return new Response("Corpo non valido", { status: 400 });
    }

    // Altri tipi di evento possono arrivare senza preavviso: si ignorano.
    if (
      event.event_type !== "CHECKOUT_STATUS_CHANGED" ||
      typeof event.id !== "string"
    ) {
      return new Response(null, { status: 200 });
    }

    // La rilettura avviene qui e non in differita: se SumUp non risponde, il
    // 500 fa ritentare il webhook (dopo 1, 5, 20 minuti e 2 ore).
    try {
      await ctx.runAction(internal.modules.payments.checkout.syncCheckout, {
        checkoutId: event.id,
      });
    } catch (error) {
      console.error("Esito del checkout SumUp non riletto:", error);
      return new Response("Rilettura non riuscita", { status: 500 });
    }

    return new Response(null, { status: 200 });
  }),
});

export default http;
