import { api } from "@padel-sport/backend/convex/_generated/api";
import type { Id } from "@padel-sport/backend/convex/_generated/dataModel";
import { NextResponse } from "next/server";
import { z } from "zod";

import {
  clerkIdentities,
  convexMessage,
  staffClerkUserIds,
} from "@/lib/clients";
import { staffGate } from "@/lib/dashboard-api";

/**
 * L'anagrafica clienti per la dashboard: elenco, ricerca e inviti in sospeso.
 *
 * Passa da una route e non da `useQuery` perché qui ci sono dati personali —
 * telefoni, date di nascita, consensi — e una query Convex leggibile dal
 * browser sarebbe leggibile da chiunque: l'URL del deployment è pubblico. La
 * sessione dello staff la verifica `staffGate`, poi Convex vuole il segreto.
 *
 * L'ordine di quello che succede qui non è casuale: prima si prende tutto da
 * Convex, poi si completa con quello che sa solo Clerk (email e foto), e
 * **solo dopo** si filtra. Cercare prima vorrebbe dire non trovare per email
 * proprio chi quell'email ce l'ha solo su Clerk.
 */

/** Cerca su tutto quello che una persona allo sportello direbbe a voce. */
function matches(
  client: { name: string; email?: string; phone?: string; code?: string },
  needle: string,
) {
  return [client.name, client.email, client.phone, client.code]
    .filter(Boolean)
    .some((field) => (field as string).toLowerCase().includes(needle));
}

export async function GET(request: Request) {
  const gate = await staffGate();
  if (!gate.ok) return gate.response;

  const q = new URL(request.url).searchParams.get("q")?.trim().toLowerCase();

  try {
    const clients = await gate.convex.query(api.modules.clients.list.default, {
      secret: gate.secret,
      excludeClerkUserIds: await staffClerkUserIds(),
    });

    // Quello che Convex non sa: chi si è registrato dall'app non ha mai
    // scritto qui la propria email, che vive sull'account. Le schede aperte
    // allo sportello non hanno un account, e non c'è niente da chiedere.
    const identities = await clerkIdentities(
      clients
        .map((client) => client.clerkUserId)
        .filter((userId): userId is string => Boolean(userId)),
    );

    const hydrated = clients.map((client) => {
      const identity = client.clerkUserId
        ? identities.get(client.clerkUserId)
        : undefined;
      const email = client.email ?? identity?.email;

      return {
        ...client,
        email,
        avatarUrl: client.avatarUrl ?? identity?.avatarUrl,
        // `missingFields` l'ha calcolato Convex, che l'email non ce l'aveva:
        // lasciarcela direbbe «manca l'email» proprio sotto l'email.
        missingFields: email
          ? client.missingFields.filter((field) => field !== "email")
          : client.missingFields,
      };
    });

    // Ricopiato su Convex, la prossima ricerca per email lo trova senza dover
    // ripassare da Clerk. Non blocca la risposta: è manutenzione, non lettura.
    const stale = clients
      .filter((client) => {
        const identity = client.clerkUserId
          ? identities.get(client.clerkUserId)
          : undefined;
        if (!identity) return false;

        return (
          (identity.email && identity.email !== client.email) ||
          (identity.avatarUrl && identity.avatarUrl !== client.avatarUrl) ||
          (identity.firstName && !client.firstName) ||
          (identity.lastName && !client.lastName)
        );
      })
      .map((client) => ({
        playerId: client.id as Id<"players">,
        ...identities.get(client.clerkUserId as string),
      }));

    if (stale.length > 0) {
      void gate.convex
        .mutation(api.modules.clients.profile.syncFromClerk, {
          secret: gate.secret,
          people: stale,
        })
        .catch((error) =>
          console.error("Allineamento con Clerk non riuscito:", error),
        );
    }

    return NextResponse.json({
      clients: q ? hydrated.filter((client) => matches(client, q)) : hydrated,
    });
  } catch (error) {
    console.error("Elenco clienti non recuperato:", error);
    return NextResponse.json(
      { error: convexMessage(error, "Non riesco a leggere i clienti.") },
      { status: 502 },
    );
  }
}

const createSchema = z.object({
  firstName: z.string().trim().min(2).max(60),
  lastName: z.string().trim().min(2).max(60),
  email: z.email().optional().or(z.literal("")),
  phone: z.string().trim().max(30).optional(),
  birthDate: z.number().optional(),
  gender: z.enum(["f", "m", "other", "unspecified"]).optional(),
  level: z.number().min(1).max(5).optional(),
  taxCode: z.string().trim().max(16).optional(),
  health: z
    .object({
      allergies: z.string().trim().max(500).optional(),
      conditions: z.string().trim().max(500).optional(),
      disability: z.string().trim().max(500).optional(),
    })
    .optional(),
  clubNotes: z.string().trim().max(1000).optional(),
});

/**
 * Apre la scheda di un cliente. Nessuna mail, nessun account: quello è un
 * secondo gesto, deliberato, dalla scheda stessa.
 */
export async function POST(request: Request) {
  const gate = await staffGate();
  if (!gate.ok) return gate.response;

  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      {
        error:
          "Servono almeno nome e cognome, e un'email valida se la indichi.",
      },
      { status: 400 },
    );
  }

  const { email, ...rest } = parsed.data;

  try {
    const playerId = await gate.convex.mutation(
      api.modules.clients.profile.create,
      { secret: gate.secret, email: email || undefined, ...rest },
    );

    return NextResponse.json({ created: true, playerId });
  } catch (error) {
    console.error("Scheda cliente non creata:", error);
    return NextResponse.json(
      { error: convexMessage(error, "Non riesco a creare la scheda.") },
      { status: 400 },
    );
  }
}
