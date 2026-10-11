import type { Infer } from "convex/values";
import type { pointReportCategory } from "../../tables/pointReports";

export type PointReportCategory = Infer<typeof pointReportCategory>;

export const MIN_MESSAGE = 10;
export const MAX_MESSAGE = 1000;
export const MAX_REPLY = 1000;

/** Come lo staff legge la categoria, nella notifica e nel gestionale. */
export const CATEGORY_LABELS: Record<PointReportCategory, string> = {
  wrong_points: "Punti sbagliati",
  missing_points: "Punti mancanti",
  question: "Chiarimento",
};
