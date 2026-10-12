/**
 * Strato sottile sopra l'API dei pagamenti online di SumUp: quel tanto che
 * serve a creare, rileggere e disattivare un checkout.
 *
 * Niente SDK: come per Google (modules/courtCalendar/client.ts), tre chiamate
 * REST non valgono una dipendenza da impacchettare a ogni deploy. `fetch` c'è
 * già nel runtime di Convex, quindi questo file non chiede Node.
 *
 * Il contratto è quello di https://developer.sumup.com/api/checkouts.
 */

const API = "https://api.sumup.com";

export interface SumupConfig {
  apiKey: string;
  merchantCode: string;
}

/**
 * Configurazione dal deployment Convex, o `null` se manca.
 *
 * Il `null` non è un errore: finché le chiavi non ci sono, il pagamento online
 * semplicemente non si offre e si paga in struttura come sempre.
 */
export function sumupConfig(): SumupConfig | null {
  const apiKey = process.env.SUMUP_API_KEY?.trim();
  const merchantCode = process.env.SUMUP_MERCHANT_CODE?.trim();

  if (!apiKey || !merchantCode) return null;
  return { apiKey, merchantCode };
}

export type CheckoutStatus = "PENDING" | "FAILED" | "PAID" | "EXPIRED";

interface SumupTransaction {
  id: string;
  transaction_code?: string;
  status: "SUCCESSFUL" | "CANCELLED" | "FAILED" | "PENDING" | "REFUNDED";
  amount: number;
}

export interface SumupCheckout {
  id: string;
  checkout_reference: string;
  status: CheckoutStatus;
  amount: number;
  currency: string;
  hosted_checkout_url?: string;
  transaction_id?: string;
  transaction_code?: string;
  transactions?: SumupTransaction[];
}

export class SumupError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "SumupError";
  }
}

async function request<T>(
  config: SumupConfig,
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const response = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
      Accept: "application/json",
      ...init.headers,
    },
  });

  const text = await response.text();
  let body: Record<string, unknown> | null = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    // Una risposta che non è JSON la si racconta così com'è, più sotto.
  }

  if (!response.ok) {
    // SumUp non usa un formato d'errore solo: secondo l'endpoint il motivo sta
    // in `detail`, in `message` o in `error_message`.
    const detail =
      body?.detail ?? body?.message ?? body?.error_message ?? text.slice(0, 200);
    throw new SumupError(
      `SumUp ${response.status} su ${path}: ${String(detail)}`,
      response.status,
    );
  }

  return body as T;
}

export async function createCheckout(
  config: SumupConfig,
  input: {
    /** Il nostro riferimento, unico per tentativo. */
    reference: string;
    amount: number;
    description: string;
    /** Dove SumUp manda il webhook a ogni cambio di stato. */
    webhookUrl: string;
    /** Dove torna il cliente dalla pagina di esito. */
    redirectUrl: string;
    validUntil: number;
  },
): Promise<SumupCheckout> {
  return await request<SumupCheckout>(config, "/v0.1/checkouts", {
    method: "POST",
    body: JSON.stringify({
      checkout_reference: input.reference,
      amount: input.amount,
      currency: "EUR",
      merchant_code: config.merchantCode,
      description: input.description,
      return_url: input.webhookUrl,
      redirect_url: input.redirectUrl,
      valid_until: new Date(input.validUntil).toISOString(),
      hosted_checkout: { enabled: true },
    }),
  });
}

export async function getCheckout(
  config: SumupConfig,
  checkoutId: string,
): Promise<SumupCheckout> {
  return await request<SumupCheckout>(
    config,
    `/v0.1/checkouts/${encodeURIComponent(checkoutId)}`,
  );
}

/**
 * Chiude un checkout che non deve più accettare pagamenti: quello sostituito
 * da un tentativo nuovo, perché due pagine aperte sono due modi di pagare due
 * volte la stessa prenotazione.
 */
export async function deactivateCheckout(
  config: SumupConfig,
  checkoutId: string,
): Promise<void> {
  await request<unknown>(
    config,
    `/v0.1/checkouts/${encodeURIComponent(checkoutId)}`,
    { method: "DELETE" },
  );
}

/**
 * Rimborsa per intero una transazione online. I soldi tornano sul metodo con
 * cui il cliente ha pagato; la commissione del pagamento originale SumUp non
 * la restituisce.
 *
 * Senza `amount` il rimborso è totale: è l'unico che offriamo.
 */
export async function refundTransaction(
  config: SumupConfig,
  transactionId: string,
): Promise<void> {
  await request<unknown>(
    config,
    `/v1.0/merchants/${encodeURIComponent(config.merchantCode)}/payments/${encodeURIComponent(transactionId)}/refunds`,
    { method: "POST", body: JSON.stringify({}) },
  );
}

/** Quello che del checkout serve a noi: stato, importo e l'incasso, se c'è. */
export interface CheckoutSnapshot {
  status: CheckoutStatus;
  amount: number;
  currency: string;
  transactionId?: string;
  transactionCode?: string;
}

export function snapshot(checkout: SumupCheckout): CheckoutSnapshot {
  // La transazione riuscita è quella da rimborsare; i campi in cima al
  // checkout la ripetono, ma non sono documentati per tutti i flussi.
  const successful = checkout.transactions?.find(
    (transaction) => transaction.status === "SUCCESSFUL",
  );

  return {
    status: checkout.status,
    amount: checkout.amount,
    currency: checkout.currency,
    transactionId: successful?.id ?? checkout.transaction_id,
    transactionCode:
      successful?.transaction_code ?? checkout.transaction_code,
  };
}
