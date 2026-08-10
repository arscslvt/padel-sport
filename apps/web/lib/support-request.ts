import { z } from "zod";

import { getInfo } from "@/lib/info";

/**
 * Contratto della richiesta di assistenza, condiviso fra il modulo e la route.
 * La route lo rivalida lato server: quella del client è comodità, non sicurezza.
 */
export const supportRequestSchema = z.object({
  name: z.string().trim().min(2, "Inserisci il tuo nome completo."),
  email: z.email("Inserisci un indirizzo email valido."),
  phone: z
    .string()
    .trim()
    .regex(/^\+?[0-9\s]{8,20}$/, "Inserisci un numero di telefono valido."),
  memberId: z.string().trim().max(20).optional(),
  message: z
    .string()
    .trim()
    .min(10, "Raccontaci qualcosa in più sulla tua richiesta.")
    .max(2000),
});

export type SupportRequestValues = z.infer<typeof supportRequestSchema>;

/** Assistenza diretta: WhatsApp e telefono, tutti i giorni. */
export const SUPPORT_HOURS = "Tutti i giorni, 9:00 – 21:00";

/**
 * Messaggio precompilato per WhatsApp.
 *
 * Lascia il campo aperto in fondo: l'utente arriva su WhatsApp con la traccia
 * già pronta e deve solo scrivere la richiesta.
 */
const WHATSAPP_TEMPLATE = [
  "Ciao Padel Sport Melilli! 👋",
  "",
  "Nome e cognome: ",
  "Matricola socio (se sei tesserato): ",
  "",
  "La mia richiesta: ",
].join("\n");

export function whatsappSupportHref() {
  const number = (getInfo("whatsapp") ?? "").replace(/\D/g, "");
  if (!number) return "https://wa.me/";

  return `https://wa.me/${number}?text=${encodeURIComponent(WHATSAPP_TEMPLATE)}`;
}

export function phoneSupportHref() {
  const phone = (getInfo("cell") ?? "").replace(/\s+/g, "");
  return `tel:${phone}`;
}

const dateFormatter = new Intl.DateTimeFormat("it-IT", {
  day: "numeric",
  month: "long",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Rome",
});

/** Data leggibile per le mail: sempre sul fuso del club, non su quello del server. */
export function formatSupportDate(timestamp: number) {
  return dateFormatter.format(new Date(timestamp));
}
