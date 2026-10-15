/**
 * Le forme che arrivano da `/api/dashboard/points`. Scritte a mano per la
 * stessa ragione di `clients/_components/types.ts`: descrivono la risposta
 * della route, non la query Convex.
 */

export interface Preset {
  id: string;
  label: string;
  points: number;
}

export interface Reward {
  id: string;
  title: string;
  description: string;
  cost: number;
  terms?: string;
  validityDays?: number;
  imageUrl: string | null;
  hasImage: boolean;
  /** Riscattati e non ancora consegnati. */
  pending: number;
  /** In pausa: fuori dalla vetrina dei clienti, ma ancora nel catalogo. */
  disabled: boolean;
}

export interface PendingRedemption {
  id: string;
  playerId: string;
  playerName: string;
  /** Foto del premio, se il premio ne ha una. */
  imageUrl: string | null;
  title: string;
  cost: number;
  code: string;
  state: "active" | "expired";
  expiresAt?: number;
  createdAt: number;
}

/** Un'azione che fa guadagnare punti da sola (modules/points/rules.ts). */
export interface PointRule {
  key: "first_match" | "weekly_three" | "online_payment" | "referral";
  label: string;
  description: string;
  points: number;
  /** Solo «Amico invitato»: i punti all'amico, accanto a quelli di chi invita. */
  friendPoints?: number;
  enabled: boolean;
  since?: number;
}
