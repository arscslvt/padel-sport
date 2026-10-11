import type { Metadata } from "next";

import { MyReports } from "../_components/my-reports";

export const metadata: Metadata = { title: "Segnalazioni" };

export default function ReportsPage() {
  return <MyReports />;
}
