import { api } from "@padel-sport/backend/convex/_generated/api";
import { ConvexHttpClient } from "convex/browser";
import type { Metadata } from "next";

import { Heading } from "@/components/ui/heading";
import { getInfo } from "@/lib/info";

import { JoinWizard } from "./_components/join-wizard";

export const metadata: Metadata = {
  title: "Attiva il tuo account | A.S.D. Padel Sport Melilli",
  description:
    "Attiva l'account del club: conferma i tuoi dati e prenoti online.",
  robots: { index: false, follow: false },
};

/** L'invito cambia stato appena viene usato: mai servito dalla cache. */
export const dynamic = "force-dynamic";

/**
 * La pagina che attiva l'account collegato a una scheda già esistente.
 *
 * Al club la persona è già registrata: i suoi dati li ha presi lo staff allo
 * sportello. Qui non si compila da zero, si conferma — e si danno i consensi,
 * che nessun altro può dare al posto suo.
 *
 * L'invito si legge con il token, che è la credenziale: senza, non si ottiene
 * niente. I dati della scheda tornano insieme all'invito proprio perché sono
 * di chi quel link ce l'ha in mano.
 */
export default async function JoinPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  const invite = convexUrl
    ? await new ConvexHttpClient(convexUrl).query(
        api.modules.clients.invites.byToken,
        { token },
      )
    : null;

  const phone = getInfo("cell") ?? "";

  if (!invite || invite.status !== "pending") {
    return (
      <section className="mx-auto w-full max-w-3xl px-6 pb-24 lg:px-12">
        <header className="mb-10">
          <Heading as="h1" size="page">
            {invite?.status === "accepted"
              ? "Account già attivo"
              : "Invito non più valido"}
          </Heading>
          <p className="text-muted-foreground max-w-[52ch] pt-3 text-sm leading-relaxed">
            {invite?.status === "accepted"
              ? "Questo invito è già stato usato: il tuo account esiste. Per entrare ti basta la tua email, e ti mandiamo un codice."
              : invite?.status === "expired"
                ? "Questo invito è scaduto. Chiedine uno nuovo al club: bastano due minuti."
                : "Questo link non è più valido. Succede quando l'invito viene rimandato — vale solo l'ultimo che hai ricevuto — o se è stato annullato."}
          </p>
        </header>

        <div className="rounded-card bg-muted p-6 sm:p-8 lg:p-10">
          <p className="text-sm leading-relaxed">
            Siamo in {getInfo("address")}
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
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto w-full max-w-3xl px-6 pb-24 lg:px-12">
      <header className="mb-10">
        <Heading as="h1" size="page">
          Attiva il tuo account
        </Heading>
        <p className="text-muted-foreground max-w-[52ch] pt-3 text-sm leading-relaxed">
          Ci siamo quasi, {invite.firstName}. Al club sei già registrato:
          verifica il tuo indirizzo, controlla che i dati siano giusti e sei
          dentro. Nessuna password da inventare — per entrare ti manderemo
          sempre un codice via mail.
        </p>
      </header>

      <div className="rounded-card bg-muted p-6 sm:p-8 lg:p-10">
        <JoinWizard
          token={token}
          email={invite.email}
          firstName={invite.profile?.firstName ?? invite.firstName}
          lastName={invite.profile?.lastName ?? invite.lastName}
          phone={invite.profile?.phone}
          birthDate={invite.profile?.birthDate}
          gender={invite.profile?.gender}
          level={invite.profile?.level}
          taxCode={invite.profile?.taxCode}
          residence={invite.profile?.residence}
          health={invite.profile?.health}
        />
      </div>
    </section>
  );
}
