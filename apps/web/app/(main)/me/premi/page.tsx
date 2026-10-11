import type { Metadata } from "next";

import { RewardsSection } from "../_components/rewards-section";

export const metadata: Metadata = { title: "Premi" };

export default function RewardsPage() {
  return <RewardsSection />;
}
