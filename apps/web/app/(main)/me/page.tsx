import type { Metadata } from "next";

import { PointsSection } from "./_components/points-section";

export const metadata: Metadata = { title: "Punti" };

export default function PointsPage() {
  return <PointsSection />;
}
