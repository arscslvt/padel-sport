import { v } from "convex/values";
import { mutation } from "../../_generated/server";

const DEFAULT_COUNTRY_CODE = "+39";

/**
 * Registra una richiesta di assistenza inviata dal modulo di supporto.
 *
 * Il salvataggio è la fonte di verità: le mail partono dopo, e un loro
 * fallimento non deve far perdere la richiesta.
 */
export default mutation({
  args: {
    name: v.string(),
    email: v.string(),
    phone: v.string(),
    memberId: v.optional(v.string()),
    message: v.string(),
  },
  handler: async (ctx, args) => {
    const name = args.name.trim();
    if (name.length < 2) {
      throw new Error("Inserisci il tuo nome completo.");
    }

    const email = args.email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
      throw new Error("Inserisci un indirizzo email valido.");
    }

    const normalizedPhone = args.phone.trim().replace(/\s+/g, "");
    const phone = normalizedPhone.startsWith("+")
      ? normalizedPhone
      : DEFAULT_COUNTRY_CODE + normalizedPhone;

    if (!/^\+?[0-9]{8,15}$/.test(phone)) {
      throw new Error("Inserisci un numero di telefono valido.");
    }

    const message = args.message.trim();
    if (message.length < 10) {
      throw new Error("Raccontaci qualcosa in più sulla tua richiesta.");
    }

    return await ctx.db.insert("supportRequests", {
      name,
      email,
      phone,
      memberId: args.memberId?.trim() || undefined,
      message,
      status: "new",
      createdAt: Date.now(),
    });
  },
});
