import { internal } from "../../../_generated/api";
import { internalAction } from "../../../_generated/server";
import { accountInfo, instagramUserId, seedToken } from "./client";

/**
 * Su quale account Instagram è puntato questo deployment.
 *
 * Da lanciare a mano dopo aver configurato le credenziali, e prima di
 * pubblicare qualsiasi cosa. Confronta ciò che Meta dice del gettone con
 * l'identificativo che abbiamo messo nelle variabili: se non combaciano, il
 * contenuto uscirebbe da un profilo diverso da quello che ci aspettiamo — ed è
 * l'unico errore di configurazione di tutto l'impianto che non si può disfare,
 * perché l'API non permette di cancellare quello che ha pubblicato.
 *
 * Non restituisce mai il gettone: solo chi dice di essere.
 */
/**
 * Scritta a mano e non dedotta: l'azione referenzia `internal`, che a sua volta
 * la contiene, e TypeScript si morde la coda.
 */
interface Diagnosi {
  ok: boolean;
  forma?: {
    lunghezza: number;
    inizia: string;
    haSpazi: boolean;
    haVirgolette: boolean;
    rinnovato: boolean;
  };
  profilo?: string;
  tipoAccount?: string;
  idDalGettone?: string;
  idConfigurato?: string;
  problema?: string;
  suggerimento?: string;
}

export default internalAction({
  handler: async (ctx): Promise<Diagnosi> => {
    const configured = instagramUserId();

    const resolved = await ctx.runMutation(
      internal.modules.social.data.resolveToken,
      { channel: "instagram", seed: seedToken() ?? undefined },
    );

    const accessToken = resolved?.accessToken;

    if (!accessToken) {
      return { ok: false as const, problema: "Nessun gettone configurato." };
    }

    /**
     * La forma del gettone, mai il contenuto.
     *
     * «Failed to decode» da parte di Meta vuol dire quasi sempre che il gettone
     * e arrivato rotto, non che sia scaduto: sono stringhe da centinaia di
     * caratteri, e fra copia, incolla e virgolette della shell si troncano o si
     * sporcano con una facilita che il messaggio d'errore non lascia intuire.
     * Qui si guarda solo la sagoma — lunghezza, prefisso, caratteri che non
     * dovrebbero esserci — perche il valore non deve uscire da nessuna parte.
     */
    const forma = {
      lunghezza: accessToken.length,
      inizia: accessToken.slice(0, 4),
      haSpazi: /\s/.test(accessToken),
      haVirgolette: /['"]/.test(accessToken),
      rinnovato: Boolean(resolved?.refreshedAt),
    };

    try {
      const account = await accountInfo(accessToken);

      const combacia = !configured || !account.id || configured === account.id;

      return {
        ok: combacia,
        forma,
        profilo: account.username ? `@${account.username}` : "(nome ignoto)",
        tipoAccount: account.accountType ?? "(ignoto)",
        idDalGettone: account.id ?? "(ignoto)",
        idConfigurato: configured ?? "(non impostato)",
        ...(combacia
          ? {}
          : {
              problema:
                "L'identificativo configurato non è quello del gettone: pubblicherebbe altrove, o non pubblicherebbe affatto.",
            }),
      };
    } catch (error) {
      return {
        ok: false as const,
        forma,
        problema:
          error instanceof Error ? error.message : "Errore sconosciuto.",
        suggerimento:
          forma.haSpazi || forma.haVirgolette
            ? "Il gettone contiene spazi o virgolette: e stato incollato male."
            : forma.lunghezza < 100
              ? "Il gettone sembra troncato: quelli lunghi superano i cento caratteri."
              : "La forma sembra a posto: il gettone potrebbe essere scaduto o revocato.",
      };
    }
  },
});
