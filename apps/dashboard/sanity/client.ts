import "server-only";

import { createClient } from "next-sanity";

import { apiVersion, dataset, projectId } from "./env";

/**
 * Serve solo per i dataset **privati**: senza token una query su un dataset
 * privato non fallisce con 401, risponde 200 con `result: []`. Che è
 * indistinguibile da un dataset vuoto, quindi vale la pena ricordarselo.
 *
 * Non ha il prefisso NEXT_PUBLIC_ e questo modulo è `server-only`: il token
 * non finisce mai nel bundle del browser.
 */
const token = process.env.SANITY_API_READ_TOKEN;

export const client = createClient({
  projectId,
  dataset,
  apiVersion,
  token,
  // Con un token leggiamo dall'API diretta: la CDN è pensata per contenuti pubblici.
  useCdn: !token,
  perspective: "published",
});
