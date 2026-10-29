import { clubQuery, isPlatformAdmin } from "../../functions";

/**
 * Lo stato del club per sito, gestionale e app: se è in manutenzione, e se
 * chi guarda può lavorare lo stesso perché è un amministratore della
 * piattaforma (`PLATFORM_ADMIN_USER_IDS`, functions.ts).
 *
 * Pubblica come gli orari: dice solo se il club è aperto, niente di più.
 */
export default clubQuery({
  args: {},
  handler: async (ctx) => {
    const maintenance = Boolean(ctx.club.maintenance);
    const userId = (await ctx.auth.getUserIdentity())?.subject;
    return { maintenance, bypass: maintenance && isPlatformAdmin(userId) };
  },
});
