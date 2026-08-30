import { anthropic } from "@ai-sdk/anthropic";
import { deepseek } from "@ai-sdk/deepseek";
import { openai } from "@ai-sdk/openai";
import type { LanguageModel } from "ai";

/**
 * Quale modello scrive i contenuti, e come si cambia.
 *
 * Passiamo dall'SDK di Vercel invece che da quello di Anthropic per una ragione
 * che riguarda questo lavoro in particolare: scrivere tre righe di didascalia
 * partendo da fatti già strutturati è lavoro da fornitore intercambiabile, non
 * qualcosa che dipende dalle capacità di un modello preciso. Dove
 * l'intercambiabilità è reale, vale la pena non cablare nessuno.
 *
 * Il modello si sceglie con una variabile d'ambiente, `SOCIAL_AI_MODEL`, nella
 * forma `fornitore:modello`. Cambiarlo è un comando, non un rilascio:
 *
 *     bunx convex env set SOCIAL_AI_MODEL 'anthropic:claude-sonnet-5'
 *
 * Non sta nelle impostazioni modificabili da dashboard di proposito: un
 * identificativo scritto male lì dentro spegnerebbe la generazione senza che
 * nessuno capisca perché, e non è il genere di leva che serve avere sottomano.
 */

/** Cosa si usa se nessuno ha detto altrimenti. */
const DEFAULT_MODEL = "anthropic:claude-opus-5";

/**
 * I fornitori che questo deployment sa usare.
 *
 * Aggiungerne uno sono due passi: `bun add @ai-sdk/<nome>` nel package del
 * backend, e una riga qui.
 *
 * Ognuno vuole la propria chiave, e sono variabili distinte: si possono tenere
 * configurate tutte e tre insieme e spostarsi fra i modelli senza rimettere
 * mano a niente. Alcuni identificativi validi, letti dai pacchetti stessi:
 *
 *     anthropic:claude-opus-5     anthropic:claude-sonnet-5
 *     openai:gpt-5.2              openai:gpt-5-mini
 *     deepseek:deepseek-v4-pro    deepseek:deepseek-v4-flash
 */
const PROVIDERS: Record<
  string,
  { keyEnv: string; model: (id: string) => LanguageModel }
> = {
  anthropic: {
    keyEnv: "ANTHROPIC_API_KEY",
    model: (id) => anthropic(id),
  },
  openai: {
    keyEnv: "OPENAI_API_KEY",
    model: (id) => openai(id),
  },
  deepseek: {
    keyEnv: "DEEPSEEK_API_KEY",
    model: (id) => deepseek(id),
  },
};

export interface SocialModel {
  model: LanguageModel;
  /** Come è scritto per intero: finisce sulla riga, per sapere chi ha scritto cosa. */
  id: string;
}

/**
 * Il modello configurato, o il motivo per cui non c'è.
 *
 * Restituisce un errore leggibile invece di `null` secco — al contrario di
 * `calendarConfig()`, dove il silenzio va bene perché la sincronizzazione di un
 * calendario che nessuno ha configurato non è un problema di nessuno. Qui
 * invece qualcuno ha acceso il sistema aspettandosi dei contenuti, e «non
 * succede niente» sarebbe la risposta peggiore: la riga deve poter dire cosa
 * manca.
 */
export function socialModel(): { model: SocialModel } | { error: string } {
  const configured = process.env.SOCIAL_AI_MODEL?.trim() || DEFAULT_MODEL;
  const separator = configured.indexOf(":");

  if (separator < 1) {
    return {
      error: `SOCIAL_AI_MODEL va scritta come «fornitore:modello», non «${configured}».`,
    };
  }

  const name = configured.slice(0, separator);
  const modelId = configured.slice(separator + 1);
  const provider = PROVIDERS[name];

  if (!provider) {
    return {
      error: `Fornitore «${name}» non disponibile su questo deployment. Installati: ${Object.keys(PROVIDERS).join(", ")}.`,
    };
  }

  if (!process.env[provider.keyEnv]) {
    return {
      error: `Manca ${provider.keyEnv} sul deployment Convex: senza, «${name}» non può scrivere niente.`,
    };
  }

  return { model: { model: provider.model(modelId), id: configured } };
}
