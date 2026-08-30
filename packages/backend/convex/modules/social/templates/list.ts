import { v } from "convex/values";

import { query } from "../../../_generated/server";
import { assertServer } from "../../../utils/serverSecret";
import { formatsFor, templateFormats } from "../lib";
import { SITUATIONS } from "../situations";

/**
 * I template, e soprattutto i buchi.
 *
 * Restituisce due cose: i template che esistono, e la **mappa di copertura** —
 * per ogni situazione prevista, quanti template approvati ci sono.
 *
 * La seconda è la più importante. Senza, un buco nella copertura si scopre solo
 * quando una finale non esce e qualcuno va a leggere il motivo dentro una riga
 * saltata; con, si vede a colpo d'occhio quali situazioni non sanno ancora
 * raccontarsi. È la differenza fra un sistema che si sorveglia e uno che si
 * spiega.
 */
export default query({
  args: { secret: v.string() },
  handler: async (ctx, { secret }) => {
    assertServer(secret);

    const rows = await ctx.db
      .query("socialTemplates")
      .withIndex("by_status_created")
      .order("desc")
      .take(300);

    /**
     * Una riga per situazione, non più una per formato.
     *
     * Da quando un template può servire più formati, la domanda «questa
     * situazione sa raccontarsi?» ha una risposta sola. I formati mancanti
     * restano elencati accanto, perché un buco parziale — copre il post ma non
     * la storia — da fuori sembra copertura piena, e invece metà dei contenuti
     * verrebbe saltata.
     */
    const coverage = Object.entries(SITUATIONS).flatMap(([kind, situations]) =>
      situations.map((situation) => {
        const slot = rows.filter(
          (row) => row.kind === kind && row.situation === situation,
        );
        const approved = slot.filter((row) => row.status === "approved");
        const wanted = formatsFor(kind as keyof typeof SITUATIONS);

        return {
          kind,
          situation,
          formats: wanted,
          missingFormats: wanted.filter(
            (format) =>
              !approved.some((row) => templateFormats(row).includes(format)),
          ),
          approved: approved.length,
          pending: slot.filter((row) => row.status === "pending_review").length,
        };
      }),
    );

    return {
      coverage,
      templates: rows
        .filter((row) => row.status !== "retired")
        .map((row) => ({
          id: row._id,
          kind: row.kind,
          situation: row.situation,
          formats: templateFormats(row),
          status: row.status,
          caption: row.caption,
          hashtags: row.hashtags,
          poster: row.poster,
          backgroundAssetRef: row.backgroundAssetRef,
          usageCount: row.usageCount,
          lastUsedAt: row.lastUsedAt,
          reviewedBy: row.reviewedBy,
          feedback: row.feedback,
          model: row.model,
          createdAt: row.createdAt,
        })),
    };
  },
});
