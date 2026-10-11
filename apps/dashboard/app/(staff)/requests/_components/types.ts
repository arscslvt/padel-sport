import type { api } from "@padel-sport/backend/convex/_generated/api";
import type { Doc } from "@padel-sport/backend/convex/_generated/dataModel";
import type { FunctionReturnType } from "convex/server";

export type SupportRequest = Doc<"supportRequests">;
export type MatchRequest = Doc<"matchRequests">;

/** La segnalazione con scheda del cliente e movimento già affiancati. */
export type PointReport = FunctionReturnType<
  typeof api.modules.pointReports.list.default
>[number];

export type SupportStatus = SupportRequest["status"];
export type MatchStatus = MatchRequest["status"];

/**
 * Le due code hanno stati diversi perché finiscono in modo diverso: una
 * richiesta d'assistenza si risolve, una di giocatori si completa o sfuma.
 * Il vocabolario resta quello delle tabelle, qui si traduce solo in italiano.
 */
export const SUPPORT_STATUS_LABELS: Record<SupportStatus, string> = {
  new: "Da vedere",
  in_progress: "In carico",
  resolved: "Risolta",
  archived: "Archiviata",
};

export const MATCH_STATUS_LABELS: Record<MatchStatus, string> = {
  new: "Da vedere",
  in_progress: "Cerchiamo",
  fulfilled: "Completata",
  cancelled: "Annullata",
};

export const SUPPORT_STATUSES = Object.keys(
  SUPPORT_STATUS_LABELS,
) as SupportStatus[];

export const MATCH_STATUSES = Object.keys(MATCH_STATUS_LABELS) as MatchStatus[];

/** Quelle ancora da smaltire: è il conteggio che conta sulla pagina. */
export const isOpenSupport = (request: SupportRequest) =>
  request.status === "new" || request.status === "in_progress";

export const isOpenMatch = (request: MatchRequest) =>
  request.status === "new" || request.status === "in_progress";

/** Le segnalazioni si chiudono come l'assistenza: stessi stati, stesse parole. */
export const isOpenReport = (report: PointReport) =>
  report.status === "new" || report.status === "in_progress";

export { CATEGORY_LABELS as REPORT_CATEGORY_LABELS } from "@padel-sport/backend/convex/modules/pointReports/lib";
