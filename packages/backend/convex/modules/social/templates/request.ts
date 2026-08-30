import { v } from "convex/values";

import { internal } from "../../../_generated/api";
import { mutation } from "../../../_generated/server";
import { assertServer } from "../../../utils/serverSecret";
import { socialPostKind } from "../lib";

/**
 * Lo staff chiede al modello di scrivere template per una situazione.
 *
 * Una mutation che accoda un'azione, e non l'azione direttamente, perché è la
 * dashboard a chiamare: aspettare in linea che un modello scriva sei varianti
 * vorrebbe dire una richiesta HTTP tenuta aperta per mezzo minuto. Le varianti
 * compaiono nell'elenco quando sono pronte.
 */
export default mutation({
  args: {
    secret: v.string(),
    kind: socialPostKind,
    situation: v.string(),
    count: v.optional(v.number()),
    feedback: v.optional(v.string()),
  },
  handler: async (ctx, { secret, ...args }) => {
    assertServer(secret);

    await ctx.scheduler.runAfter(
      0,
      internal.modules.social.templates.generate.default,
      args,
    );

    return { requested: true };
  },
});
