import { api } from "@padel-sport/backend/convex/_generated/api";
import { ConvexHttpClient } from "convex/browser";
import type { Metadata } from "next";

import { Heading } from "@/components/ui/heading";
import { getInfo } from "@/lib/info";

export const metadata: Metadata = {
  title: "Un amico ti invita | A.S.D. Padel Sport Melilli",
  description: "Come iscriversi al club su invito di un amico.",
  robots: { index: false, follow: false },
};

/** L'invito cambia stato quando l'amico si iscrive: mai servito dalla cache. */
export const dynamic = "force-dynamic";

/**
 * La pagina a cui porta la mail d'invito di un cliente a un amico
 * (app/api/referrals).
 *
 * L'iscrizione si fa in struttura, con un documento davanti: qui non c'è un
 * modulo, c'è come farsi riconoscere allo sportello perché chi ha invitato
 * riceva i suoi punti. Il token è la credenziale: senza, non si legge niente.
 */
export default async function ReferralPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  const invite = convexUrl
    ? await new ConvexHttpClient(convexUrl).query(
        api.modules.referrals.invite.byToken,
        { token },
      )
    : null;

  const phone = getInfo("cell") ?? "";
  const address = getInfo("address");

  const where = (
    <p className="text-sm leading-relaxed">
      Siamo in {address}
      {phone ? (
        <>
          , e ci trovi al{" "}
          <a
            href={`tel:${phone.replace(/\s/g, "")}`}
            className="underline underline-offset-4"
          >
            {phone}
          </a>
        </>
      ) : null}
      .
    </p>
  );

  if (!invite || invite.joined) {
    return (
      <section className="mx-auto w-full max-w-3xl px-(--gutter) pb-24">
        <header className="mb-10">
          <Heading as="h1" size="page">
            {invite?.joined ? "Sei già dei nostri" : "Invito non più valido"}
          </Heading>
          <p className="text-muted-foreground max-w-[52ch] pt-3 text-sm leading-relaxed">
            {invite?.joined
              ? "Ti sei già iscritto al club con questo invito. Ci vediamo in campo."
              : "Questo link non è più valido. Succede quando l'invito viene rimandato: vale solo l'ultimo che hai ricevuto."}
          </p>
        </header>
        <div className="rounded-card bg-muted p-6 sm:p-8 lg:p-10">{where}</div>
      </section>
    );
  }

  return (
    <section className="mx-auto w-full max-w-3xl px-(--gutter) pb-24">
      <header className="mb-10">
        <Heading as="h1" size="page">
          {invite.inviterName} ti invita a giocare con noi
        </Heading>
        <p className="text-muted-foreground max-w-[52ch] pt-3 text-sm leading-relaxed">
          {invite.name ? `Ciao ${invite.name.split(" ")[0]}! ` : ""}
          Per iscriverti al Padel Sport passa in struttura: la segreteria apre
          la tua scheda in pochi minuti, con un documento d&apos;identità.
        </p>
      </header>

      <div className="rounded-card bg-muted space-y-8 p-6 sm:p-8 lg:p-10">
        <div className="space-y-3">
          <p className="font-medium">Allo sportello fatti riconoscere così</p>
          <ol className="text-muted-foreground list-decimal space-y-2 pl-5 text-sm leading-relaxed">
            <li>
              Iscriviti con questa mail:{" "}
              <span className="text-foreground font-medium break-all">
                {invite.email}
              </span>
            </li>
            <li>
              oppure, se usi un&apos;altra mail, dai il codice amico di{" "}
              {invite.inviterName}:{" "}
              <span className="text-foreground font-mono text-base font-medium tracking-[0.2em]">
                {invite.code}
              </span>
            </li>
          </ol>
          <p className="text-muted-foreground text-sm leading-relaxed">
            {invite.points
              ? `Quando paghi la tua prima tessera ricevi ${invite.points} punti di benvenuto nel programma fedeltà${invite.inviterPoints ? `, e ${invite.inviterName} riceve i suoi per averti invitato` : ""}.`
              : `Così il club sa che ti ha invitato ${invite.inviterName}.`}
          </p>
        </div>

        {where}
      </div>
    </section>
  );
}
