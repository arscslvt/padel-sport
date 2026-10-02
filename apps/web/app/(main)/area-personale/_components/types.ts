import type { api } from "@padel-sport/backend/convex/_generated/api";
import type { FunctionReturnType } from "convex/server";

/** Il portafoglio come lo restituisce Convex, per chi è autenticato e ha una scheda. */
export type Wallet = NonNullable<
  FunctionReturnType<typeof api.modules.points.wallet.default>
>;

export type WalletReward = Wallet["rewards"][number];
export type WalletRedemption = Wallet["redemptions"][number];
