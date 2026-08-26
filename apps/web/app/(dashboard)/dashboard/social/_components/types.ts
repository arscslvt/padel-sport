import type { api } from "@padel-sport/backend/convex/_generated/api";
import type {
  SocialPostKind,
  SocialPostStatus,
} from "@padel-sport/backend/convex/modules/social/lib";
import type { FunctionReturnType } from "convex/server";

/**
 * La forma delle bozze, presa da dove nasce.
 *
 * Dedotta dal tipo di ritorno della query invece che riscritta a mano: quella
 * restituisce una proiezione, non un documento, e ricopiarne i campi qui
 * significherebbe accorgersi di un disallineamento solo guardando una schermata
 * vuota. Il vocabolario — i `kind`, gli stati — arriva invece da `social/lib`,
 * che è il posto in cui vive.
 */
type SocialList = FunctionReturnType<typeof api.modules.social.list.default>;

export type SocialPost = SocialList["posts"][number];

export const KIND_LABELS: Record<SocialPostKind, string> = {
  tournament_result: "Risultato",
  courts_tomorrow: "Campi liberi",
  tip: "Consiglio",
  event_announce: "Nuovo evento",
  event_reminder: "Promemoria",
  open_match: "Partita aperta",
  player_request: "Richiesta dal sito",
};

export const STATUS_LABELS: Record<SocialPostStatus, string> = {
  drafting: "In composizione",
  pending_review: "Da approvare",
  queued: "In coda",
  publishing: "In pubblicazione",
  published: "Pubblicato",
  rejected: "Scartato",
  skipped: "Saltato",
  failed: "Non riuscito",
  needs_attention: "Da controllare",
};

export const FORMAT_LABELS = {
  feed: "Post",
  story: "Storia",
} as const;

/** Le bozze su cui lo staff deve ancora fare qualcosa. */
export const needsStaff = (post: SocialPost) =>
  post.status === "pending_review" || post.status === "needs_attention";

/** L'indirizzo dell'immagine: il token fa parte della chiave, non è un extra. */
export const posterUrl = (post: SocialPost) =>
  `/api/social/poster/${post.id}?token=${post.posterToken}`;
