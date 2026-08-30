/**
 * Il minimo indispensabile della Graph API di Instagram.
 *
 * Solo `fetch`, quindi **niente `"use node"`**: gira nel runtime V8 come
 * `modules/notifications/alert.ts`. Nessun SDK — sono quattro chiamate REST, e
 * il commento in `modules/courtCalendar/client.ts` racconta già come è andata
 * l'ultima volta che si è installato un pacchetto intero per farne tre.
 *
 * L'host sta in una costante e non sparso nelle funzioni: quando arriverà
 * Facebook parlerà con `graph.facebook.com`, e quello sarà un altro file con la
 * sua costante — non un `if` dentro a queste.
 */

/** Instagram Login, non Facebook Login: sono due percorsi con due gettoni diversi. */
const HOST = "https://graph.instagram.com";

/** Le chiamate a Meta sono veloci o rotte: mezzo minuto è già generoso. */
const TIMEOUT_MS = 30_000;

export interface InstagramConfig {
  userId: string;
  accessToken: string;
}

/**
 * La configurazione, o `null` se manca l'identificativo dell'account.
 *
 * Stesso patto di `calendarConfig()`: il `null` non è un errore, è un pezzo di
 * configurazione che non c'è. Il gettone non si legge qui perché vive in
 * tabella e va rinnovato — lo passa chi chiama.
 */
export function instagramUserId(): string | null {
  return process.env.INSTAGRAM_USER_ID?.trim() || null;
}

/** Il gettone iniziale, quello messo a mano prima che il rinnovo prenda il via. */
export function seedToken(): string | null {
  return process.env.INSTAGRAM_ACCESS_TOKEN?.trim() || null;
}

async function call(
  path: string,
  params: Record<string, string>,
  method: "GET" | "POST" = "GET",
): Promise<Record<string, unknown>> {
  const query = new URLSearchParams(params);
  const url = `${HOST}/${path}${method === "GET" ? `?${query}` : ""}`;

  const response = await fetch(url, {
    method,
    ...(method === "POST"
      ? {
          body: query,
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
        }
      : {}),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });

  const body = (await response.json().catch(() => null)) as Record<
    string,
    unknown
  > | null;

  if (!response.ok || !body) {
    // Il messaggio di Meta è molto più utile del codice di stato, e finisce
    // sulla riga: «The image is too large» si risolve, «HTTP 400» no.
    const detail =
      (body?.error as { message?: string } | undefined)?.message ??
      `HTTP ${response.status}`;
    throw new Error(`Instagram: ${detail}`);
  }

  return body;
}

/**
 * Primo passo: si apre un contenitore con l'immagine.
 *
 * Meta non accetta il caricamento dei byte, vuole un indirizzo da cui
 * scaricarseli — è il motivo per cui la locandina è una route pubblica.
 *
 * La didascalia si manda comunque anche per le storie, dove Instagram la
 * ignora: costa zero e toglie un `if` che qualcuno prima o poi sbaglierebbe.
 */
export async function createContainer(
  config: InstagramConfig,
  input: { imageUrl: string; caption: string; isStory: boolean },
): Promise<string> {
  const body = await call(
    `${config.userId}/media`,
    {
      access_token: config.accessToken,
      image_url: input.imageUrl,
      caption: input.caption,
      ...(input.isStory ? { media_type: "STORIES" } : {}),
    },
    "POST",
  );

  const id = body.id;
  if (typeof id !== "string") {
    throw new Error("Instagram non ha restituito un contenitore.");
  }

  return id;
}

/**
 * Il contenitore è pronto?
 *
 * Meta scarica l'immagine per conto suo, quindi fra l'apertura e la
 * pubblicazione passa qualche secondo. Pubblicare un contenitore ancora in
 * lavorazione fallisce con un messaggio che non dice questo.
 */
export async function containerStatus(
  config: InstagramConfig,
  containerId: string,
): Promise<{ ready: boolean; error?: string }> {
  const body = await call(containerId, {
    access_token: config.accessToken,
    fields: "status_code,status",
  });

  const code = body.status_code;

  if (code === "FINISHED") return { ready: true };
  if (code === "ERROR" || code === "EXPIRED") {
    return {
      ready: false,
      error: typeof body.status === "string" ? body.status : String(code),
    };
  }

  return { ready: false };
}

/** Secondo passo: il contenitore diventa un post. */
export async function publishContainer(
  config: InstagramConfig,
  containerId: string,
): Promise<string> {
  const body = await call(
    `${config.userId}/media_publish`,
    { access_token: config.accessToken, creation_id: containerId },
    "POST",
  );

  const id = body.id;
  if (typeof id !== "string") {
    throw new Error("Instagram non ha restituito l'identificativo del post.");
  }

  return id;
}

/** L'indirizzo pubblico del post, da mettere in dashboard. */
export async function mediaPermalink(
  config: InstagramConfig,
  mediaId: string,
): Promise<string | undefined> {
  const body = await call(mediaId, {
    access_token: config.accessToken,
    fields: "permalink",
  });

  return typeof body.permalink === "string" ? body.permalink : undefined;
}

/**
 * Rinnova il gettone lungo.
 *
 * Funziona solo su gettoni vecchi almeno ventiquattr'ore: il primo rinnovo
 * dopo l'installazione va saltato, non trattato come guasto.
 */
export async function refreshToken(
  accessToken: string,
): Promise<{ accessToken: string; expiresAt: number }> {
  const body = await call("refresh_access_token", {
    grant_type: "ig_refresh_token",
    access_token: accessToken,
  });

  const token = body.access_token;
  const seconds = body.expires_in;

  if (typeof token !== "string" || typeof seconds !== "number") {
    throw new Error("Instagram non ha restituito un gettone rinnovato.");
  }

  return { accessToken: token, expiresAt: Date.now() + seconds * 1000 };
}

/**
 * Di chi è questo gettone.
 *
 * Serve prima di pubblicare qualunque cosa, e per una ragione concreta: il
 * gettone è legato all'account che ha autorizzato l'app, e nel portale di Meta
 * è facilissimo autorizzare il profilo sbagliato — quello personale invece di
 * quello del circolo. Un gettone così è perfettamente valido e pubblica nel
 * posto sbagliato.
 *
 * Il nome utente che torna da qui è l'unica risposta certa alla domanda «dove
 * finirà questo post». Costa una chiamata di sola lettura e toglie l'unico
 * errore di configurazione che non si può disfare.
 */
export async function accountInfo(
  accessToken: string,
): Promise<{ id?: string; username?: string; accountType?: string }> {
  const body = await call("me", {
    access_token: accessToken,
    fields: "user_id,username,account_type",
  }).catch(() =>
    // I nomi dei campi cambiano fra i due percorsi di login: se questa
    // combinazione non piace, si ripiega su quello che Meta restituisce di suo.
    call("me", { access_token: accessToken }),
  );

  return {
    id: (body.user_id ?? body.id) as string | undefined,
    username: body.username as string | undefined,
    accountType: body.account_type as string | undefined,
  };
}
