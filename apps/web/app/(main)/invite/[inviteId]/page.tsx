import type { Metadata } from "next";

import { InviteScreen } from "./invite-screen";

export const metadata: Metadata = {
  title: "Invito a una partita",
  robots: { index: false, follow: false },
};

/**
 * La pagina a cui porta il WhatsApp d'invito
 * (packages/backend/convex/modules/notifications/matchInvite.ts): una partita
 * sola, quella a cui si è stati invitati, con la risposta a portata di dito.
 *
 * Sta fuori dall'area personale apposta: niente dock né elenco intorno, il
 * messaggio porta qui e qui c'è solo l'invito.
 */
export default async function InvitePage({
  params,
}: {
  params: Promise<{ inviteId: string }>;
}) {
  const { inviteId } = await params;
  return <InviteScreen inviteId={inviteId} />;
}
