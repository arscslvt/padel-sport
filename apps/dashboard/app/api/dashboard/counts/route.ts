import { api } from "@padel-sport/backend/convex/_generated/api";
import { NextResponse } from "next/server";

import { staffGate } from "@/lib/dashboard-api";

/**
 * Quante cose aspettano lo staff, sezione per sezione: i numeri sulla barra di
 * navigazione.
 *
 * Una route sola invece di tre: ogni chiamata alla dashboard paga la verifica
 * dello staff su Clerk, e i contatori si chiedono spesso. Le letture su Convex
 * partono insieme. Se una non risponde il suo numero resta zero: un badge che
 * manca è meglio di una barra che non si disegna.
 */

const OPEN = new Set(["new", "in_progress"]);

export async function GET() {
  const gate = await staffGate();
  if (!gate.ok) return gate.response;

  const { convex, secret } = gate;

  const [bookings, support, match, redemptions] = await Promise.allSettled([
    convex.query(api.bookings.list.default, { secret, includePast: false }),
    convex.query(api.modules.supportRequests.list.default, { secret }),
    convex.query(api.modules.matchRequests.list.default, { secret }),
    convex.query(api.modules.points.redemptions.pending, { secret }),
  ]);

  const value = <T>(result: PromiseSettledResult<T[]>): T[] =>
    result.status === "fulfilled" ? result.value : [];

  return NextResponse.json({
    agenda: value(bookings).filter(
      (booking) => booking.status === "pending_on_site_payment",
    ).length,
    requests:
      value(support).filter((row) => OPEN.has(row.status)).length +
      value(match).filter((row) => OPEN.has(row.status)).length,
    points: value(redemptions).length,
  });
}
