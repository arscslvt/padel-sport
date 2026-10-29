import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { api, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { MAINTENANCE_ERROR } from "./functions";
import { DEFAULT_CLUB_SLUG } from "./modules/clubs/lib";
import { clubCourts } from "./modules/settings/lib";
import { setupTest } from "./test.setup";

const SECRET = "segreto-dei-test";
const ADMIN = "user_piattaforma";

beforeEach(() => {
  vi.stubEnv("BOOKING_WEBHOOK_SECRET", SECRET);
  vi.stubEnv("PLATFORM_ADMIN_USER_IDS", ADMIN);
});
afterEach(() => vi.unstubAllEnvs());

/** Due club, ognuno con la sua organizzazione staff e un campo. */
async function twoClubs() {
  const t = setupTest();
  const ids = await t.run(async (ctx) => {
    const club = (slug: string, clerkOrgId: string) =>
      ctx.db.insert("clubs", {
        slug,
        name: slug,
        timeZone: "Europe/Rome",
        latitude: 0,
        longitude: 0,
        clerkOrgId,
      });
    const a = await club(DEFAULT_CLUB_SLUG, "org_a");
    const b = await club("altro-club", "org_b");
    const courtA = await ctx.db.insert("slots", {
      clubId: a,
      name: "Campo 1",
      active: true,
    });
    const courtB = await ctx.db.insert("slots", {
      clubId: b,
      name: "Campo B",
      active: true,
    });
    return { a, b, courtA, courtB };
  });
  return { t, ...ids };
}

const staffA = { secret: SECRET, clerkOrgId: "org_a" };
const staffB = { secret: SECRET, clerkOrgId: "org_b" };

const DAY_MS = 24 * 60 * 60 * 1000;

/** Una prenotazione domani a quest'ora, nel club e sul campo dati. */
function booking(clubId: Id<"clubs">, slot: Id<"slots">) {
  return {
    clubId,
    slot,
    bookingDate: Date.now() + DAY_MS,
    bookedBy: "Cliente",
    players: ["Cliente"],
    level: "intermedio" as const,
    bookForAll: false,
    pricePerPlayer: 0,
    paymentMode: "on_site" as const,
    status: "pending_on_site_payment" as const,
    createdAt: 0,
  };
}

/** Un giocatore con l'account, che si lascia trovare dagli altri. */
function player(clubId: Id<"clubs">, name: string, code?: string) {
  return {
    clubId,
    name,
    code,
    clerkUserId: `user_${name}`,
    level: 3,
    createdAt: 0,
    searchableSince: 0,
  };
}

describe("isolamento fra club", () => {
  test("le query pubbliche vedono solo il club dello slug", async () => {
    const { t } = await twoClubs();

    const fallback = await t.query(api.slots.listActive.default, {});
    const own = await t.query(api.slots.listActive.default, {
      clubSlug: "altro-club",
    });

    // Senza slug resta Padel Sport: le app già installate non lo mandano.
    expect(fallback.map((slot) => slot.name)).toEqual(["Campo 1"]);
    expect(own.map((slot) => slot.name)).toEqual(["Campo B"]);
  });

  test("lo staff scrive nel club della sua organizzazione", async () => {
    const { t, a, b } = await twoClubs();

    await t.mutation(api.modules.pricing.services.save, {
      ...staffB,
      kind: "match",
      price: 9,
    });
    // `first()` sull'indice vecchio troverebbe la riga dell'altro club:
    // le regole la nascondono, e Padel Sport ne scrive una sua.
    await t.mutation(api.modules.pricing.services.save, {
      ...staffA,
      kind: "match",
      price: 7,
    });

    const rows = await t.run((ctx) => ctx.db.query("services").collect());
    expect(rows.map((row) => [row.clubId, row.price])).toEqual([
      [b, 9],
      [a, 7],
    ]);
  });

  test("una riga di un altro club non si modifica", async () => {
    const { t, courtB } = await twoClubs();

    await expect(
      t.mutation(api.modules.settings.booking.saveCourt, {
        ...staffA,
        courtId: courtB,
        name: "Rubato",
        active: false,
      }),
    ).rejects.toThrow();

    const court = await t.run((ctx) => ctx.db.get(courtB));
    expect(court).toMatchObject({ name: "Campo B", active: true });
  });

  test("lo stesso nome di campo va bene in due club", async () => {
    const { t, b } = await twoClubs();

    const id = await t.mutation(api.modules.settings.booking.saveCourt, {
      ...staffB,
      name: "Campo 1",
      active: true,
    });

    expect(await t.run((ctx) => ctx.db.get(id))).toMatchObject({ clubId: b });
  });
});

describe("impostazioni e campi per club", () => {
  const settings = { secret: SECRET, windows: [], bookableDays: 14 };

  test("ogni club legge e salva la sua configurazione", async () => {
    const { t } = await twoClubs();

    await t.mutation(api.modules.settings.booking.update, {
      ...settings,
      ...staffB,
    });
    await t.mutation(api.modules.settings.booking.update, {
      ...settings,
      ...staffA,
      bookableDays: 3,
    });

    const own = (clubSlug?: string) =>
      t.query(api.modules.settings.booking.get, { clubSlug });
    expect((await own()).bookableDays).toBe(3);
    expect((await own("altro-club")).bookableDays).toBe(14);
    expect(
      await t.run((ctx) => ctx.db.query("bookingSettings").collect()),
    ).toHaveLength(2);
  });

  test("il cron dei giorni vuoti non legge gli orari di un altro club", async () => {
    const { t, b } = await twoClubs();
    // L'altro club è chiuso tutti i giorni, e la sua riga è la prima della
    // tabella: Padel Sport, che non ha mai salvato, resta aperto.
    await t.run((ctx) =>
      ctx.db.insert("bookingSettings", {
        clubId: b,
        windows: [],
        bookableDays: 7,
        updatedAt: 0,
      }),
    );

    const result = await t.mutation(
      internal.modules.reminders.emptyDays.default,
      { force: true },
    );
    expect(result.empty).toHaveLength(3);
  });

  test("i campi del club, anche fuori dai wrapper", async () => {
    const { t, a, b } = await twoClubs();
    const names = await t.run(async (ctx) => ({
      a: (await clubCourts(ctx, a)).map((court) => court.name),
      b: (await clubCourts(ctx, b)).map((court) => court.name),
    }));
    expect(names).toEqual({ a: ["Campo 1"], b: ["Campo B"] });
  });
});

describe("prenotazioni per club", () => {
  test("disponibilità e agenda vedono solo il club", async () => {
    const { t, a, b, courtA, courtB } = await twoClubs();
    await t.run(async (ctx) => {
      await ctx.db.insert("bookings", booking(b, courtB));
      await ctx.db.insert("bookings", booking(a, courtA));
    });
    const range = { from: Date.now(), to: Date.now() + 2 * DAY_MS };

    const own = await t.query(api.bookings.availability.default, range);
    const other = await t.query(api.bookings.availability.default, {
      ...range,
      clubSlug: "altro-club",
    });
    expect(own.busy.map((row) => row.slot)).toEqual([courtA]);
    expect(other.busy.map((row) => row.slot)).toEqual([courtB]);

    const agenda = await t.query(api.bookings.list.default, staffA);
    expect(agenda.map((row) => row.slot)).toEqual([courtA]);
    const pending = await t.query(api.bookings.list.default, {
      ...staffB,
      status: "pending_on_site_payment",
    });
    expect(pending.map((row) => row.slot)).toEqual([courtB]);
  });

  test("il cron dei giorni vuoti non conta le partite di un altro club", async () => {
    const { t, b, courtB } = await twoClubs();
    await t.run((ctx) => ctx.db.insert("bookings", booking(b, courtB)));

    const result = await t.mutation(
      internal.modules.reminders.emptyDays.default,
      { force: true },
    );
    // Domani ha una partita, ma nell'altro club: per Padel Sport è vuoto.
    expect(result.empty).toHaveLength(3);
  });
});

describe("partite, richieste e ricerche per club", () => {
  test("partite aperte, mie partite e richieste restano nel club", async () => {
    const { t, a, b, courtA, courtB } = await twoClubs();
    await t.run(async (ctx) => {
      for (const [clubId, slot, name] of [
        [a, courtA, "Anna"],
        [b, courtB, "Bruno"],
      ] as const) {
        const creatorId = await ctx.db.insert("players", player(clubId, name));
        const bookingId = await ctx.db.insert("bookings", booking(clubId, slot));
        await ctx.db.insert("openMatches", {
          clubId,
          bookingId,
          creatorId,
          playerIds: [creatorId],
          maxPlayers: 4,
          matchDate: Date.now() + DAY_MS,
          levelMin: 1,
          levelMax: 5,
          joinMode: "direct",
          status: "open",
          createdAt: 0,
        });
        await ctx.db.insert("matchRequests", {
          clubId,
          name,
          email: `${name}@esempio.it`,
          phone: "3330000000",
          matchDate: Date.now() + DAY_MS,
          level: "intermedio",
          missingPlayers: 1,
          status: "new",
          createdAt: 0,
        });
      }
    });

    const open = (clubSlug?: string) =>
      t.query(api.modules.openMatches.list.default, {
        clubSlug,
        includeOwn: true,
      });
    expect((await open()).map((match) => match.creator.name)).toEqual(["Anna"]);
    expect((await open("altro-club")).map((match) => match.creator.name)).toEqual(
      ["Bruno"],
    );

    const mine = await t
      .withIdentity({ subject: "user_Anna" })
      .query(api.modules.openMatches.my.default, {});
    expect(mine).toHaveLength(1);

    const requests = await t.query(api.modules.matchRequests.list.default, staffB);
    expect(requests.map((request) => request.name)).toEqual(["Bruno"]);
  });

  test("la ricerca trova i giocatori del club anche fra tanti omonimi altrove", async () => {
    const { t, a, b } = await twoClubs();
    await t.run(async (ctx) => {
      await ctx.db.insert("players", player(a, "Anna"));
      await ctx.db.insert("players", player(a, "Marco Bianchi", "12345"));
      // Omonimi nell'altro club, più dei candidati che la ricerca legge: non
      // devono prendere il posto di quelli del club.
      for (let i = 0; i < 50; i++) {
        await ctx.db.insert("players", player(b, `Marco ${i}`, "12345"));
      }
    });
    const asAnna = t.withIdentity({ subject: "user_Anna" });

    const invitable = await asAnna.query(api.modules.openMatches.search.default, {
      term: "Marco",
    });
    expect(invitable.map((row) => row.name)).toEqual(["Marco Bianchi"]);

    const byName = await asAnna.query(api.modules.friends.search.default, {
      term: "Marco",
    });
    expect(byName.map((row) => row.player.name)).toEqual(["Marco Bianchi"]);

    // Il codice è unico solo dentro il club: lo stesso sta anche nell'altro.
    const byCode = await asAnna.query(api.modules.friends.search.default, {
      term: "12345",
    });
    expect(byCode.map((row) => row.player.name)).toEqual(["Marco Bianchi"]);
  });
});

describe("schede per club", () => {
  /** Lo stesso account con una scheda in ognuno dei due club. */
  async function sameAccount() {
    const clubs = await twoClubs();
    await clubs.t.run(async (ctx) => {
      await ctx.db.insert("players", {
        ...player(clubs.a, "Anna"),
        email: "anna@esempio.it",
      });
      await ctx.db.insert("players", {
        ...player(clubs.b, "Anna B"),
        clerkUserId: "user_Anna",
        email: "anna@esempio.it",
      });
    });
    return { ...clubs, asAnna: clubs.t.withIdentity({ subject: "user_Anna" }) };
  }

  test("l'account trova la sua scheda in ogni club", async () => {
    const { asAnna } = await sameAccount();
    const me = (clubSlug?: string) =>
      asAnna.query(api.modules.openMatches.players.me, { clubSlug });
    expect((await me())?.name).toBe("Anna");
    expect((await me("altro-club"))?.name).toBe("Anna B");
  });

  test("le funzioni interne dei pagamenti non si confondono fra le schede", async () => {
    const { asAnna, a } = await sameAccount();
    // Senza il club, due schede per lo stesso account fanno fallire unique().
    await expect(
      asAnna.query(internal.modules.payments.checkout.ownAttempts, {
        code: "NESSUNA",
        clubId: a,
      }),
    ).resolves.toEqual([]);
  });

  test("un'email del club A è libera nel club B", async () => {
    const { t, a } = await twoClubs();
    await t.run((ctx) =>
      ctx.db.insert("players", {
        ...player(a, "Anna"),
        email: "anna@esempio.it",
      }),
    );
    const create = (staff: typeof staffA) =>
      t.mutation(api.modules.clients.profile.create, {
        ...staff,
        firstName: "Altra",
        lastName: "Persona",
        email: "anna@esempio.it",
      });

    await expect(create(staffA)).rejects.toThrow(
      "C'è già una scheda con questo indirizzo",
    );
    await create(staffB);

    const clients = await t.query(api.modules.clients.list.default, staffA);
    expect(clients.map((row) => row.name)).toEqual(["Anna"]);
  });
});

describe("pagamenti per club", () => {
  /** Una prenotazione col codice dato in ognuno dei due club, pagata in A. */
  async function paidInBothClubs() {
    const clubs = await twoClubs();
    const ids = await clubs.t.run(async (ctx) => {
      // Prima quella dell'altro club: un `first()` senza club troverebbe lei.
      await ctx.db.insert("bookings", {
        ...booking(clubs.b, clubs.courtB),
        code: "ABC123",
      });
      const anna = await ctx.db.insert("players", player(clubs.a, "Anna"));
      const bookingA = await ctx.db.insert("bookings", {
        ...booking(clubs.a, clubs.courtA),
        code: "ABC123",
        createdByPlayer: anna,
      });
      const payment = await ctx.db.insert("payments", {
        clubId: clubs.a,
        bookingId: bookingA,
        playerId: anna,
        provider: "sumup",
        amount: 28,
        currency: "EUR",
        status: "paid",
        expiresAt: 0,
        createdAt: 0,
        updatedAt: 0,
      });
      return { bookingA, payment };
    });
    return { ...clubs, ...ids };
  }

  test("il codice della prenotazione si cerca nel club", async () => {
    const { t, a, payment } = await paidInBothClubs();
    const attempts = await t
      .withIdentity({ subject: "user_Anna" })
      .query(internal.modules.payments.checkout.ownAttempts, {
        code: "ABC123",
        clubId: a,
      });
    expect(attempts.map((attempt) => attempt._id)).toEqual([payment]);
  });

  test("lo staff non rimborsa l'incasso di un altro club", async () => {
    vi.stubEnv("SUMUP_API_KEY", "chiave");
    vi.stubEnv("SUMUP_MERCHANT_CODE", "M123");
    const { t, bookingA, payment } = await paidInBothClubs();

    await expect(
      t.action(api.modules.payments.refund.default, {
        ...staffB,
        bookingId: bookingA,
      }),
    ).rejects.toThrow("Prenotazione non trovata.");
    const after = await t.run((ctx) => ctx.db.get(payment));
    expect(after?.status).toBe("paid");
    expect(after?.refundStartedAt).toBeUndefined();
  });
});

describe("punti e inviti per club", () => {
  test("lo staff crea un cliente col codice amico di chi l'ha invitato", async () => {
    const { t, a } = await twoClubs();
    const inviter = await t.run((ctx) =>
      ctx.db.insert("players", player(a, "Anna", "12345")),
    );

    const friend = await t.mutation(api.modules.clients.profile.create, {
      ...staffA,
      firstName: "Bea",
      lastName: "Amica",
      referralCode: "12345",
    });

    const referrals = await t.run((ctx) => ctx.db.query("referrals").collect());
    expect(referrals).toMatchObject([
      { clubId: a, inviterId: inviter, inviteeId: friend, status: "joined" },
    ]);
  });
});

describe("giocatori per club", () => {
  test("lo stesso account è un giocatore solo nel club dove ha la scheda", async () => {
    const { t, a, b } = await twoClubs();
    const [, other] = await t.run(async (ctx) => {
      const player = (clubId: typeof a, clerkUserId: string) =>
        ctx.db.insert("players", {
          clubId,
          clerkUserId,
          name: clerkUserId,
          level: 3,
          createdAt: 0,
        });
      return [await player(a, "user_1"), await player(b, "user_2")];
    });
    const asUser1 = t.withIdentity({ subject: "user_1" });

    // Nel club A user_1 esiste, ma il giocatore del club B per lui no.
    await expect(
      asUser1.mutation(api.modules.friends.request.default, {
        playerId: other,
      }),
    ).rejects.toThrow("Giocatore non trovato.");
    // Nel club B user_1 non ha una scheda.
    await expect(
      asUser1.mutation(api.modules.friends.request.default, {
        clubSlug: "altro-club",
        playerId: other,
      }),
    ).rejects.toThrow("Completa il tuo profilo");
    expect(await t.run((ctx) => ctx.db.query("friendships").collect())).toEqual(
      [],
    );
  });
});

describe("chi chiama", () => {
  test("senza il segreto giusto non passa niente", async () => {
    const { t } = await twoClubs();
    await expect(
      t.mutation(api.modules.pricing.services.save, {
        ...staffA,
        secret: "sbagliato",
        kind: "match",
        price: 7,
      }),
    ).rejects.toThrow("Operazione non consentita.");
  });

  test("un'organizzazione senza club non arriva a nessun club", async () => {
    const { t } = await twoClubs();
    await expect(
      t.query(api.modules.points.rules.list, {
        secret: SECRET,
        clerkOrgId: "org_sconosciuta",
      }),
    ).rejects.toThrow("non ha un club");
  });

  test("uno slug sconosciuto non diventa Padel Sport", async () => {
    const { t } = await twoClubs();
    await expect(
      t.query(api.slots.listActive.default, { clubSlug: "non-esiste" }),
    ).rejects.toThrow("Club non trovato.");
  });
});

describe("manutenzione", () => {
  test("le scritture si fermano, le letture no", async () => {
    const { t, b } = await twoClubs();
    await t.run((ctx) => ctx.db.patch(b, { maintenance: true }));

    const error = await t
      .mutation(api.modules.pricing.services.save, {
        ...staffB,
        kind: "match",
        price: 9,
      })
      .catch((e: unknown) => e);
    expect(error).toMatchObject({ data: { code: MAINTENANCE_ERROR } });

    await expect(
      t.query(api.slots.listActive.default, { clubSlug: "altro-club" }),
    ).resolves.toHaveLength(1);
  });

  test("l'amministratore della piattaforma lavora lo stesso", async () => {
    const { t, b } = await twoClubs();
    await t.run((ctx) => ctx.db.patch(b, { maintenance: true }));

    await t.mutation(api.modules.pricing.services.save, {
      ...staffB,
      actorUserId: ADMIN,
      kind: "match",
      price: 9,
    });
    expect(
      await t.run((ctx) => ctx.db.query("services").collect()),
    ).toHaveLength(1);

    // Dal sito: il giocatore qualunque si ferma alla manutenzione,
    // l'amministratore passa e arriva alla funzione vera.
    const playerId = await t.run((ctx) =>
      ctx.db.insert("players", {
        clubId: b,
        name: "B",
        level: 3,
        createdAt: 0,
      }),
    );
    const request = (as: string) =>
      t
        .withIdentity({ subject: as })
        .mutation(api.modules.friends.request.default, {
          clubSlug: "altro-club",
          playerId,
        })
        .catch((e: unknown) => e);
    expect(await request("user_qualunque")).toMatchObject({
      data: { code: MAINTENANCE_ERROR },
    });
    expect(await request(ADMIN)).toMatchObject({
      message: expect.stringContaining("Completa il tuo profilo"),
    });
  });

  test("gli altri club non si fermano", async () => {
    const { t, b } = await twoClubs();
    await t.run((ctx) => ctx.db.patch(b, { maintenance: true }));

    await t.mutation(api.modules.pricing.services.save, {
      ...staffA,
      kind: "match",
      price: 7,
    });
  });
});

describe("costruttori", () => {
  // Le funzioni nascono da functions.ts: da `_generated/server` arrivano
  // solo i tipi, e `httpAction` per i webhook.
  test("nessuna funzione salta i wrapper", () => {
    const root = import.meta.dirname;
    const allowed = new Set(["functions.ts", "http.ts"]);
    const offenders: string[] = [];

    const walk = (dir: string) => {
      for (const name of readdirSync(dir)) {
        const path = join(dir, name);
        if (statSync(path).isDirectory()) {
          if (name !== "_generated" && name !== "components") walk(path);
          continue;
        }
        if (!name.endsWith(".ts") || allowed.has(relative(root, path))) {
          continue;
        }
        const source = readFileSync(path, "utf8");
        for (const match of source.matchAll(
          /import\s*\{([^}]*)\}\s*from\s*"[./]*_generated\/server"/g,
        )) {
          const values = match[1]
            .split(",")
            .map((name) => name.trim())
            .filter((name) => name && !name.startsWith("type "));
          if (values.length)
            offenders.push(`${relative(root, path)}: ${values}`);
        }
      }
    };
    walk(root);

    expect(offenders).toEqual([]);
  });
});
