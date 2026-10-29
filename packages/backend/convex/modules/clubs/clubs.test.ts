import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { api, internal } from "../../_generated/api";
import { setupTest } from "../../test.setup";
import { clubConfig } from "./config";

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

const day = (key: string, tempMax: number) => ({
  day: key,
  code: 0,
  tempMax,
  tempMin: 12,
  precipitation: 0,
  hours: [],
  fetchedAt: Date.now(),
});

describe("club di oggi", () => {
  test("la riga di Padel Sport nasce una volta sola", async () => {
    const t = setupTest();
    const first = await t.mutation(internal.modules.clubs.seed.padelSport, {});
    const second = await t.mutation(internal.modules.clubs.seed.padelSport, {});

    expect(first.created).toBe(true);
    expect(second).toEqual({ clubId: first.clubId, created: false });
    const clubs = await t.run((ctx) => ctx.db.query("clubs").collect());
    expect(clubs).toHaveLength(1);
  });

  test("l'organizzazione dello staff si collega a un club solo", async () => {
    const t = setupTest();
    const { clubId } = await t.mutation(
      internal.modules.clubs.seed.padelSport,
      {},
    );
    const link = (clerkOrgId: string, slug?: string) =>
      t.mutation(internal.modules.clubs.seed.linkOrganization, {
        clerkOrgId,
        slug,
      });

    expect(await link("org_staff")).toEqual({ clubId, changed: true });
    expect(await link("org_staff")).toEqual({ clubId, changed: false });

    await t.run((ctx) =>
      ctx.db.insert("clubs", {
        slug: "altro-club",
        name: "Altro",
        timeZone: "Europe/Rome",
        latitude: 0,
        longitude: 0,
      }),
    );
    await expect(link("org_staff", "altro-club")).rejects.toThrow(
      "già del club padel-sport",
    );
    await expect(link("staff")).rejects.toThrow("comincia con org_");
  });

  test("le righe nuove nascono col club, anche quando il meteo le riscrive", async () => {
    const t = setupTest();
    const { clubId } = await t.mutation(
      internal.modules.clubs.seed.padelSport,
      {},
    );

    await t.mutation(internal.modules.weather.data.store, {
      days: [day("2026-10-28", 20)],
      clubId,
    });
    // La seconda lettura passa da `replace`, che riscrive la riga intera.
    await t.mutation(internal.modules.weather.data.store, {
      days: [day("2026-10-28", 22)],
      clubId,
    });

    const rows = await t.run((ctx) => ctx.db.query("weatherDays").collect());
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ clubId, tempMax: 22 });
  });

  test("ogni club ha il suo meteo, anche nello stesso giorno", async () => {
    const t = setupTest();
    const { clubId } = await t.mutation(
      internal.modules.clubs.seed.padelSport,
      {},
    );
    const other = await t.run((ctx) =>
      ctx.db.insert("clubs", {
        slug: "altro-club",
        name: "Altro",
        timeZone: "Europe/Rome",
        latitude: 45.46,
        longitude: 9.19,
      }),
    );
    const store = (clubId: typeof other, tempMax: number) =>
      t.mutation(internal.modules.weather.data.store, {
        days: [day("2026-10-28", tempMax)],
        clubId,
      });

    await store(clubId, 22);
    await store(other, 14);
    await store(clubId, 23);

    const rows = await t.run((ctx) => ctx.db.query("weatherDays").collect());
    expect(rows.map((row) => [row.clubId, row.tempMax])).toEqual([
      [clubId, 23],
      [other, 14],
    ]);
  });
});

describe("configurazione del club", () => {
  afterEach(() => vi.unstubAllEnvs());

  test("le chiavi delle variabili d'ambiente sono solo di Padel Sport", async () => {
    vi.stubEnv("SUMUP_API_KEY", "chiave");
    vi.stubEnv("SUMUP_MERCHANT_CODE", "M123");
    vi.stubEnv("GOOGLE_CALENDAR_ID_READ", "calendario");
    vi.stubEnv("TWILIO_PHONE_SENDER", "+390000000000");

    expect(clubConfig({ slug: "padel-sport" })).toMatchObject({
      sumup: { apiKey: "chiave", merchantCode: "M123" },
      calendar: { readCalendarId: "calendario", writeCalendarId: "calendario" },
      whatsapp: { sender: "+390000000000" },
    });
    expect(clubConfig({ slug: "altro-club" })).toEqual({
      sumup: null,
      calendar: null,
      whatsapp: null,
    });

    // Anche dal gestionale: l'altro club non risulta collegato a SumUp.
    const t = setupTest();
    await t.mutation(internal.modules.clubs.seed.padelSport, {});
    await t.run((ctx) =>
      ctx.db.insert("clubs", {
        slug: "altro-club",
        name: "Altro",
        timeZone: "Europe/Rome",
        latitude: 0,
        longitude: 0,
      }),
    );
    const setup = (clubSlug: string) =>
      t.query(api.modules.payments.status.setup, { clubSlug });
    expect((await setup("padel-sport")).configured).toBe(true);
    expect((await setup("altro-club")).configured).toBe(false);
  });
});

describe("riempimento di clubId", () => {
  test("ogni riga senza club prende Padel Sport, le altre restano", async () => {
    const t = setupTest();

    // Righe di prima della migrazione: nessun club.
    await t.run(async (ctx) => {
      await ctx.db.insert("slots", { name: "Campo 1", active: true });
      await ctx.db.insert("slots", { name: "Campo 2", active: true });
      await ctx.db.insert("weatherDays", day("2026-10-27", 19));
    });
    const before = await t.query(internal.modules.clubs.backfill.missing, {});
    expect(before).toEqual({ slots: 2, weatherDays: 1 });

    const { clubId } = await t.mutation(
      internal.modules.clubs.seed.padelSport,
      {},
    );
    await t.mutation(internal.modules.clubs.backfill.run, {});
    await t.finishAllScheduledFunctions(vi.runAllTimers);

    expect(await t.query(internal.modules.clubs.backfill.missing, {})).toEqual(
      {},
    );
    const slots = await t.run((ctx) => ctx.db.query("slots").collect());
    expect(slots.map((slot) => slot.clubId)).toEqual([clubId, clubId]);
  });
});
