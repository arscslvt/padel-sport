import { z } from "zod";

import { MAX_PLAYERS } from "@/lib/booking";

/**
 * Contratto del modulo di prenotazione del sito.
 *
 * Vive qui, accanto alle regole di `lib/booking.ts`, perché il wizard lo usa
 * passo per passo (`form.trigger` su un sottoinsieme di campi) e la schermata
 * di riepilogo ne rilegge i valori: tenerlo dentro un componente vorrebbe dire
 * importarne uno dall'altro.
 *
 * La validazione vera resta comunque quella del backend
 * (packages/backend/convex/modules/openMatches/create.ts): qui si guadagna
 * solo un messaggio in italiano prima del giro di rete.
 */

/** Compagni di gioco: tre righe, tante quante i posti oltre al prenotante. */
export const PARTNER_SLOTS = MAX_PLAYERS - 1;

/** Le righe in ordine: servono al form come elenco stabile su cui iterare. */
export const PARTNER_ROWS = Array.from(
  { length: PARTNER_SLOTS },
  (_, index) => index,
);

/**
 * Un compagno si può lasciare in bianco — il club completerà la squadra — ma
 * se si scrive qualcosa il nome diventa obbligatorio: una mail senza nome non
 * dice a chi mandare il QR.
 */
const partnerSchema = z
  .object({
    name: z.string().trim().max(60, "Nome troppo lungo."),
    email: z.union([z.literal(""), z.email("Indirizzo email non valido.")]),
  })
  .refine((partner) => partner.name.length === 0 || partner.name.length >= 2, {
    message: "Il nome deve avere almeno due lettere.",
    path: ["name"],
  })
  .refine((partner) => partner.email.length === 0 || partner.name.length > 0, {
    message: "Scrivi il nome del giocatore a cui mandare il QR.",
    path: ["name"],
  });

export const bookingFormSchema = z.object({
  /** Giorno scelto in formato `yyyy-MM-dd`: la data vera la ricompone il wizard. */
  day: z.string().min(1, "Scegli il giorno in cui vuoi giocare."),
  time: z
    .string()
    .regex(/^([01]\d|2[0-3]):(00|30)$/, "Scegli un orario di inizio."),
  levelIndex: z.number().int().min(0).max(2),
  partners: z.array(partnerSchema).length(PARTNER_SLOTS),
  /** Chiesto solo a chi non ha ancora un profilo giocatore. */
  name: z.string().trim().max(60, "Nome troppo lungo."),
  phone: z
    .string()
    .trim()
    .regex(/^\+?[0-9\s]{8,20}$/, "Inserisci un numero di telefono valido."),
  notes: z.string().trim().max(500, "Nota troppo lunga.").optional(),
});

export type BookingFormValues = z.infer<typeof bookingFormSchema>;

export interface BookingPartner {
  name: string;
  email?: string;
}

/** Compagni davvero indicati, ripuliti e pronti per Convex. */
export function filledPartners(
  partners: BookingFormValues["partners"],
): BookingPartner[] {
  return partners
    .map((partner) => ({
      name: partner.name.trim(),
      email: partner.email.trim().toLowerCase() || undefined,
    }))
    .filter((partner) => partner.name.length > 0);
}
