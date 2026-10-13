import { api } from "@padel-sport/backend/convex/_generated/api";
import { ConvexHttpClient } from "convex/browser";
import type { Metadata } from "next";
import Link from "next/link";

import { Heading } from "@/components/ui/heading";
import { PERSONAL_AREA_LINK } from "@/lib/links";
import { formatClubDate, pointsLabel } from "@/lib/points";

import { ConfirmExit } from "./confirm-exit";

export const metadata: Metadata = {
  title: "Esci dal programma punti | A.S.D. Padel Sport Melilli",
  robots: { index: false, follow: false },
};

/** La richiesta cambia stato appena viene confermata: mai dalla cache. */
export const dynamic = "force-dynamic";

/**
 * La pagina del link che la segreteria manda a chi chiede di uscire dal
 * programma punti.
 *
 * Lo staff non può far uscire nessuno da sé: può solo far partire questa mail,
 * e l'uscita vale quando la persona la conferma qui, dopo aver letto cosa
 * succede ai suoi punti (packages/backend/convex/modules/points/exit.ts). Il
 * token è la credenziale, come per gli inviti: chi ha la mail ha la pagina.
 */
export default async function ExitProgramPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  const request = convexUrl
    ? await new ConvexHttpClient(convexUrl)
        .query(api.modules.points.exit.requestByToken, { token })
        .catch(() => null)
    : null;

  if (
    !request ||
    request.status === "revoked" ||
    request.status === "expired"
  ) {
    return (
      <Shell title="Link non più valido">
        {request?.status === "expired"
          ? "Questo link è scaduto."
          : "Questo link non vale più. Succede quando la segreteria ne manda uno nuovo, o quando l'uscita è già stata fatta in un altro modo."}{" "}
        Se vuoi uscire dal programma punti, chiedi alla segreteria di mandartene
        un altro o esci dalla tua{" "}
        <Link
          href={PERSONAL_AREA_LINK}
          className="text-foreground underline underline-offset-2"
        >
          area personale
        </Link>
        .
      </Shell>
    );
  }

  if (request.status === "confirmed") {
    return (
      <Shell title="Sei uscito dal programma">
        {request.balance > 0 && request.deadline
          ? `Puoi riscattare i tuoi ${pointsLabel(request.balance)} fino al ${formatClubDate(request.deadline)}, dalla tua area personale. Poi i punti non usati decadono.`
          : "Non ricevi più punti nuovi. Puoi aderire di nuovo quando vuoi."}
      </Shell>
    );
  }

  return (
    <section className="mx-auto w-full max-w-3xl px-6 pb-24 lg:px-12">
      <header className="mb-10">
        <Heading as="h1" size="page">
          Vuoi uscire dal programma punti?
        </Heading>
        <p className="text-muted-foreground max-w-[52ch] pt-3 text-sm leading-relaxed">
          {request.firstName}, la segreteria ci ha detto che vuoi uscire dal
          programma. Esci solo se confermi qui. Se non l'hai chiesto tu, chiudi
          questa pagina e non cambia nulla.
        </p>
      </header>

      <ConfirmExit token={token} balance={request.balance} />
    </section>
  );
}

function Shell({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mx-auto w-full max-w-3xl px-6 pb-24 lg:px-12">
      <header className="mb-10">
        <Heading as="h1" size="page">
          {title}
        </Heading>
        <p className="text-muted-foreground max-w-[52ch] pt-3 text-sm leading-relaxed">
          {children}
        </p>
      </header>
    </section>
  );
}
