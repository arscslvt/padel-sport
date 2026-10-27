import { NextResponse } from "next/server";
import { Resend } from "resend";

import { BRAND } from "@/lib/brand";
import { demoRequestSchema } from "@/lib/demo-request";
import { choiceLabel } from "@/lib/plans";

const INBOX = process.env.DEMO_REQUEST_INBOX;
const FROM = process.env.EMAIL_FROM ?? `${BRAND.name} <noreply@vetro.club>`;

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`);

/**
 * Una richiesta di demo: arriva per email a chi segue le vendite.
 *
 * Non c'è un database dietro, la mail è la richiesta. Per questo, se l'invio
 * non riesce, chi l'ha compilata deve saperlo e poter riprovare: niente
 * successo finto. In sviluppo, senza chiavi, la richiesta finisce nei log.
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Richiesta non valida." },
      { status: 400 },
    );
  }

  const parsed = demoRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Alcuni campi non sono validi." },
      { status: 400 },
    );
  }

  const values = parsed.data;

  // Il campo trappola è pieno: un bot. Gli si risponde come a tutti, così
  // non impara a evitarlo.
  if (values.website) return NextResponse.json({ ok: true });

  const lines = [
    ["Nome", values.name],
    ["Club", values.club],
    ["Città", values.city],
    ["Campi", values.courts],
    ["Piano", values.plan ? choiceLabel(values.plan) : "Non scelto"],
    ["Codice di invito", values.promoCode?.toUpperCase() || "Nessuno"],
    ["Email", values.email],
    ["Telefono", values.phone || "Non indicato"],
    ["Messaggio", values.message || "Nessuno"],
  ] as const;

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || !INBOX) {
    if (process.env.NODE_ENV !== "production") {
      console.info("Richiesta di demo (email non configurata):", values);
      return NextResponse.json({ ok: true });
    }
    console.error("RESEND_API_KEY o DEMO_REQUEST_INBOX non configurate.");
    return NextResponse.json(
      { error: "Servizio non disponibile. Riprova più tardi." },
      { status: 503 },
    );
  }

  try {
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from: FROM,
      to: INBOX,
      replyTo: values.email,
      subject: `Demo: ${values.club}, ${values.city}`,
      text: lines.map(([label, value]) => `${label}: ${value}`).join("\n"),
      html: `<table cellpadding="6" style="font-family:system-ui,sans-serif;font-size:14px">${lines
        .map(
          ([label, value]) =>
            `<tr><td style="color:#71717a;vertical-align:top">${label}</td><td>${escapeHtml(value).replace(/\n/g, "<br>")}</td></tr>`,
        )
        .join("")}</table>`,
    });
    if (error) throw error;
  } catch (error) {
    console.error("Invio della richiesta di demo fallito:", error);
    return NextResponse.json(
      { error: "Invio non riuscito. Riprova." },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true });
}
