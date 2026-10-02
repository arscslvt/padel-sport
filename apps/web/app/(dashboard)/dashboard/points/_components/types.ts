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
}

export interface PendingRedemption {
  id: string;
  playerId: string;
  playerName: string;
  title: string;
  cost: number;
  code: string;
  state: "active" | "expired";
  expiresAt?: number;
  createdAt: number;
}
