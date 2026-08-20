/**
 * Notifiche push allo staff via Hark.
 *
 * È una sveglia, non un canale: la mail resta la notifica ufficiale, questa è
 * la spia che si accende sul telefono se il client di posta tarda. Per questo
 * non solleva mai — quando parte, il fatto è già a database, e far fallire
 * un'azione per una notifica sarebbe il baratto sbagliato. Conta soprattutto
 * nei tre punti dove `sendHark` è chiamata *dentro* un `catch`
 * (bookingMail, courtCalendar/push, courtCalendar/pull): lì sollevare
 * trasformerebbe un errore gestito in un fallimento dell'azione.
 *
 * Un solo modulo per Convex e per il sito. Hark parla JSON, quindi qui non
 * serve niente di specifico a un runtime: né `Buffer` né i moduli di Node, che
 * nel runtime V8 di Convex non esistono. Il gemello che c'era ai tempi di ntfy
 * viveva solo perché quel client stava in un file `"use node"` che importava
 * Twilio a livello di modulo.
 */

/** Limiti dello schema del webhook: oltre, Hark risponde 400. */
const MAX_TITLE = 80;
const MAX_BODY = 2000;

/** Oltre questa soglia il testo libero smette di essere leggibile in notifica. */
const MAX_EXCERPT = 300;

/** Un Hark lento non deve tenere in ostaggio chi ha appena premuto «invia». */
const TIMEOUT_MS = 5000;

export type HarkNotification = {
  /** Il titolo della notifica. Deve bastare da solo a dire cos'è successo. */
  title: string;
  /** Il corpo del messaggio. */
  body: string;
  /** Dove porta il tocco sulla notifica. Senza, la notifica non è cliccabile. */
  url?: string;
  /**
   * Chiave stabile dell'evento: se Convex ritenta l'azione, Hark riconosce il
   * doppione invece di far squillare il telefono due volte. Stessa chiave con
   * un corpo diverso è però un 409, quindi va derivata solo da identificatori.
   */
  idempotencyKey?: string;
};

/** Taglia il testo libero sull'ultimo spazio utile, senza mozzare le parole. */
export function excerpt(text: string, max = MAX_EXCERPT) {
  if (text.length <= max) return text;

  const cut = text.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");

  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}

/**
 * Manda la notifica al webhook configurato in `HARK_WEBHOOK_URL`.
 * Ritorna `false` — senza sollevare — se la variabile manca o Hark non
 * risponde: chi chiama ha già fatto il suo lavoro e deve solo saperlo dai log.
 */
export async function sendHark(
  notification: HarkNotification,
): Promise<boolean> {
  const webhookUrl = process.env.HARK_WEBHOOK_URL;

  if (!webhookUrl) {
    console.warn("HARK_WEBHOOK_URL non configurata: nessuna notifica inviata.");
    return false;
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (notification.idempotencyKey) {
    headers["Idempotency-Key"] = notification.idempotencyKey;
  }

  const payload: Record<string, string> = {
    title: excerpt(notification.title, MAX_TITLE),
    body: excerpt(notification.body, MAX_BODY),
  };

  if (notification.url) {
    payload.url = notification.url;
  }

  // `AbortSignal.timeout` non è garantito nel runtime V8 di Convex: il
  // controller a mano funziona ovunque.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    // 202: una richiesta identica è ancora in lavorazione, la notifica arriva.
    if (response.status === 200 || response.status === 202) return true;

    // 409: stessa chiave, corpo diverso. È un errore nostro nel comporre la
    // chiave, non un guasto — va letto nei log, non trattato come disservizio.
    if (response.status === 409) {
      console.warn(
        `Notifica Hark scartata come doppione: la chiave "${notification.idempotencyKey}" era già stata usata con un altro contenuto.`,
      );
      return false;
    }

    throw new Error(`Hark ha risposto ${response.status}`);
  } catch (error) {
    console.error("Invio della notifica Hark fallito:", error);
    return false;
  } finally {
    clearTimeout(timer);
  }
}
