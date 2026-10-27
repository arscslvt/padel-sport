/// <reference types="vite/client" />
import migrationsTest from "@convex-dev/migrations/test";
import { convexTest } from "convex-test";

import schema from "./schema";

/**
 * Il backend dei test: lo schema vero, tutte le funzioni e il componente delle
 * migrazioni. Il file ha due punti nel nome, quindi Convex non lo pubblica.
 */
export const modules = import.meta.glob("./**/*.*s");

export function setupTest() {
  const t = convexTest(schema, modules);
  migrationsTest.register(t);
  return t;
}
