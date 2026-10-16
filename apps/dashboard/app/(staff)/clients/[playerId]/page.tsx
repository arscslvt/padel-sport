import { requireStaffMember } from "@/lib/staff";

import { CLIENT_TABS, type ClientTab } from "../_components/types";
import { ClientPage } from "./client-page";

/** L'anagrafica cambia di continuo: mai servita dalla cache. */
export const dynamic = "force-dynamic";

export default async function DashboardClientPage({
  params,
  searchParams,
}: {
  params: Promise<{ playerId: string }>;
  searchParams: Promise<{ tab?: string; from?: string }>;
}) {
  await requireStaffMember();
  const { playerId } = await params;
  const { tab, from } = await searchParams;

  // `?tab=` sceglie la linguetta, `?from=points` o `?from=agenda` dice da
  // dove si arriva: il tasto in alto torna lì invece che all'elenco clienti.
  const initialTab = CLIENT_TABS.includes(tab as ClientTab)
    ? (tab as ClientTab)
    : undefined;

  return (
    // In alto lo spazio dell'incavo dell'iPhone: la dashboard si disegna fin
    // sotto la barra di stato, e il «Clienti» per tornare non ci deve finire.
    <div className="mx-auto w-full max-w-6xl space-y-4 p-4 pt-[calc(env(safe-area-inset-top)+1rem)] md:p-6">
      <ClientPage
        playerId={playerId}
        initialTab={initialTab}
        from={from === "points" || from === "agenda" ? from : undefined}
      />
    </div>
  );
}
