import { v } from "convex/values";
import { internalAction } from "../../_generated/server";
import { sendHark } from "../../utils/hark";

/**
 * L'avviso allo staff, da qualunque punto del backend.
 *
 * Passa da un'azione perché le mutation non possono uscire in rete: chi scrive
 * a database la schedula con `runAfter(0, …)` e va avanti. Gli indirizzi da
 * mettere in `url` si compongono con `utils/staffLinks`.
 */
export default internalAction({
  args: {
    title: v.string(),
    message: v.string(),
    url: v.optional(v.string()),
    idempotencyKey: v.optional(v.string()),
  },
  async handler(_, { title, message, url, idempotencyKey }) {
    await sendHark({ title, body: message, url, idempotencyKey });
  },
});
