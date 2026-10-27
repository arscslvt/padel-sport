import { z } from "zod";

import { PLAN_CHOICES } from "@/lib/plans";

/** Le misure di club fra cui scegliere: bastano a preparare la demo giusta. */
export const COURT_RANGES = ["1-2", "3-4", "5-8", "Più di 8"] as const;

/**
 * Il contratto della richiesta di demo, condiviso fra il modulo e la route.
 * La route lo rivalida: quella del client è una comodità, non una garanzia.
 */
export const demoRequestSchema = z.object({
  name: z.string().trim().min(2, "Inserisci nome e cognome.").max(120),
  club: z.string().trim().min(2, "Inserisci il nome del club.").max(120),
  city: z.string().trim().min(2, "Inserisci la città del club.").max(80),
  email: z.email("Inserisci un indirizzo email valido."),
  phone: z
    .string()
    .trim()
    .regex(/^(\+?[0-9\s]{8,20})?$/, "Inserisci un numero di telefono valido.")
    .optional(),
  courts: z.enum(COURT_RANGES, { error: "Scegli quanti campi ha il club." }),
  message: z.string().trim().max(2000).optional(),
  /** Il piano scelto dalla pagina dei prezzi, se si arriva da lì. */
  plan: z.enum(PLAN_CHOICES).optional(),
  /** Il codice di invito: lo verifica chi riceve la richiesta. */
  promoCode: z
    .string()
    .trim()
    .max(40, "Il codice è troppo lungo.")
    .regex(/^[\p{L}\p{N}_-]*$/u, "Usa solo lettere, numeri e trattini.")
    .optional(),
  /** Il campo trappola: lo compilano solo i bot. */
  website: z.string().max(0).optional(),
});

export type DemoRequestValues = z.infer<typeof demoRequestSchema>;
export type DemoRequestErrors = Partial<
  Record<keyof DemoRequestValues, string>
>;

/** Il primo errore di ogni campo, nel formato che il modulo mostra. */
export function fieldErrors(error: z.ZodError): DemoRequestErrors {
  const errors: DemoRequestErrors = {};
  for (const issue of error.issues) {
    const key = issue.path[0] as keyof DemoRequestValues;
    if (key && !errors[key]) errors[key] = issue.message;
  }
  return errors;
}
