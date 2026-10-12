/**
 * Le firme dei webhook di Twilio e Resend, verificate con Web Crypto.
 *
 * Le route HTTP di Convex girano nel runtime V8, dove i moduli di Node non ci
 * sono: niente `twilio.validateRequest`, niente `svix`. Gli algoritmi però sono
 * pubblici e corti, ed è meglio riscriverli qui che fare un giro in più
 * attraverso un'azione Node per ogni evento.
 *
 * Una firma sbagliata è sempre un `false`, mai un'eccezione: la route risponde
 * 401 e il provider riprova, che è quel che vogliamo se il segreto è appena
 * cambiato.
 */

const encoder = new TextEncoder();

function toBase64(buffer: ArrayBuffer) {
  let binary = "";
  for (const byte of new Uint8Array(buffer)) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function fromBase64(value: string) {
  return Uint8Array.from(atob(value), (char) => char.charCodeAt(0));
}

/** Confronto a tempo costante: la durata non deve dire quanti caratteri tornano. */
function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let index = 0; index < a.length; index++) {
    diff |= a.charCodeAt(index) ^ b.charCodeAt(index);
  }
  return diff === 0;
}

async function hmacBase64(
  hash: "SHA-1" | "SHA-256",
  key: Uint8Array<ArrayBuffer>,
  data: string,
) {
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    key,
    { name: "HMAC", hash },
    false,
    ["sign"],
  );
  return toBase64(await crypto.subtle.sign("HMAC", cryptoKey, encoder.encode(data)));
}

/**
 * `X-Twilio-Signature`: HMAC-SHA1, con l'auth token come chiave, dell'URL
 * chiamato seguito dai parametri del form in ordine alfabetico, nome e valore
 * attaccati. L'URL deve essere quello esatto passato a Twilio come
 * `statusCallback`, query compresa.
 */
export async function verifyTwilioSignature({
  authToken,
  url,
  params,
  signature,
}: {
  authToken: string;
  url: string;
  params: URLSearchParams;
  signature: string;
}) {
  if (!signature) return false;

  const keys = [...new Set(params.keys())].sort();
  const data = keys.reduce(
    (acc, key) =>
      acc +
      params
        .getAll(key)
        .sort()
        .map((value) => key + value)
        .join(""),
    url,
  );

  const expected = await hmacBase64("SHA-1", encoder.encode(authToken), data);
  return safeEqual(expected, signature);
}

/** Oltre questo scarto un evento firmato è un evento riciclato. */
const SVIX_TOLERANCE_SECONDS = 5 * 60;

/**
 * Le firme di Resend, nello schema di Svix (Standard Webhooks): HMAC-SHA256 di
 * `id.timestamp.corpo` con il segreto `whsec_…` decodificato da base64.
 * L'intestazione può portare più firme separate da spazi — succede mentre si
 * ruota il segreto — e ne basta una buona.
 */
export async function verifySvixSignature({
  secret,
  id,
  timestamp,
  signatures,
  body,
}: {
  secret: string;
  id: string;
  timestamp: string;
  signatures: string;
  body: string;
}) {
  const seconds = Number(timestamp);
  if (!id || !Number.isFinite(seconds)) return false;
  if (Math.abs(Date.now() / 1000 - seconds) > SVIX_TOLERANCE_SECONDS) {
    return false;
  }

  let key: Uint8Array<ArrayBuffer>;
  try {
    key = fromBase64(secret.startsWith("whsec_") ? secret.slice(6) : secret);
  } catch {
    console.error("RESEND_WEBHOOK_SECRET non è un segreto Svix valido.");
    return false;
  }

  const expected = await hmacBase64("SHA-256", key, `${id}.${timestamp}.${body}`);

  return signatures.split(" ").some((entry) => {
    const [version, signature] = entry.split(",");
    return version === "v1" && Boolean(signature) && safeEqual(signature, expected);
  });
}
