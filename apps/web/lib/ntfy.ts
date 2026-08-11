/**
 * Notifiche push via ntfy per le richieste che arrivano dai moduli del sito.
 *
 * È una sveglia, non un canale: la mail resta la notifica ufficiale, questa è
 * la spia che si accende sul telefono se il client di posta tarda. Per questo
 * non solleva mai: quando parte, la richiesta è già su Convex, e far fallire
 * la risposta per una notifica sarebbe il baratto sbagliato.
 *
 * Gemello di `convex/utils/notification_client.ts` nel backend, che serve le
 * prenotazioni e le partite aperte. Restano due implementazioni perché quella
 * lì vive in un modulo `"use node"` che importa Twilio a livello di modulo:
 * riusarla da qui vorrebbe dire trascinarsi Twilio dentro il bundle della
 * route. La forma degli argomenti è però la stessa, di proposito.
 */

type NtfyAlert = {
  title: string;
  message: string;
  tags?: string[];
  priority?: "min" | "low" | "default" | "high" | "urgent";
};

/** Oltre questa soglia il testo libero smette di essere leggibile in notifica. */
const MAX_EXCERPT = 300;

/** Taglia il testo libero sull'ultimo spazio utile, senza mozzare le parole. */
export function excerpt(text: string, max = MAX_EXCERPT) {
  if (text.length <= max) return text;

  const cut = text.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");

  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}

/**
 * Gli header HTTP viaggiano in ASCII: un «Niccolò» nel titolo arriverebbe
 * storpiato. La RFC 2047 è il modo previsto per infilarci UTF-8, e ntfy la
 * interpreta. Il corpo non ha questo problema, viaggia già in UTF-8.
 */
function encodeHeaderValue(value: string) {
  if (/^[\x20-\x7E]*$/.test(value)) return value;

  return `=?UTF-8?B?${Buffer.from(value, "utf-8").toString("base64")}?=`;
}

/**
 * Manda la notifica sul topic configurato in `NTFY_TOPIC_URL`.
 * Ritorna `false` — senza sollevare — se la variabile manca o ntfy non
 * risponde: chi chiama ha già salvato la richiesta e deve solo saperlo dai log.
 */
export async function sendNtfyAlert(alert: NtfyAlert) {
  const topicUrl = process.env.NTFY_TOPIC_URL;

  if (!topicUrl) {
    console.warn("NTFY_TOPIC_URL non configurata: nessuna notifica inviata.");
    return false;
  }

  const headers: Record<string, string> = {
    Title: encodeHeaderValue(alert.title),
  };

  if (alert.priority) {
    headers.Priority = alert.priority;
  }

  if (alert.tags?.length) {
    headers.Tags = alert.tags.join(",");
  }

  try {
    const response = await fetch(topicUrl, {
      method: "POST",
      headers,
      body: alert.message,
      // Un ntfy lento non deve tenere in ostaggio la risposta a chi ha appena
      // premuto «invia».
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      throw new Error(`ntfy ha risposto ${response.status}`);
    }

    return true;
  } catch (error) {
    console.error("Invio della notifica ntfy fallito:", error);
    return false;
  }
}
