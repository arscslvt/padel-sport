import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { api, internal } from "./_generated/api";
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
