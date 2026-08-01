import * as SecureStore from "expo-secure-store";

/** Stessa forma di `TokenCache` di @clerk/clerk-expo (definita inline per non
 *  dipendere da un path interno di `dist`). */
type TokenCache = {
	getToken: (key: string) => Promise<string | undefined | null>;
	saveToken: (key: string, token: string) => Promise<void>;
	clearToken?: (key: string) => void;
};

/**
 * ⚠️ DIAGNOSTICO TEMPORANEO — token cache di Clerk con log.
 *
 * Stessa logica della `tokenCache` ufficiale (`@clerk/clerk-expo/token-cache`),
 * ma stampa in console ogni scrittura/lettura su Keychain con la dimensione in
 * byte e gli eventuali errori. Serve a capire perché la sessione non persiste:
 *  - al login dovremmo vedere `saveToken ... OK`
 *  - alla riapertura dell'app dovremmo vedere `getToken ... -> N bytes`
 *    (se invece è `NULL` o `THREW`, il problema è la persistenza su Keychain).
 *
 * Da rimuovere una volta trovata la causa: ripristinare
 * `tokenCache` da `@clerk/clerk-expo/token-cache` nel provider.
 */
const secureStoreOpts: SecureStore.SecureStoreOptions = {
	keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
};

export const debugTokenCache: TokenCache = {
	getToken: async (key) => {
		try {
			const item = await SecureStore.getItemAsync(key, secureStoreOpts);
			console.log(
				`[tokenCache] getToken key=${key} -> ${
					item ? `${item.length} bytes` : "NULL"
				}`,
			);
			return item;
		} catch (err) {
			console.log(`[tokenCache] getToken key=${key} THREW`, err);
			await SecureStore.deleteItemAsync(key, secureStoreOpts);
			return null;
		}
	},
	saveToken: async (key, token) => {
		try {
			await SecureStore.setItemAsync(key, token, secureStoreOpts);
			console.log(`[tokenCache] saveToken key=${key} OK (${token.length} bytes)`);
		} catch (err) {
			console.log(
				`[tokenCache] saveToken key=${key} FAILED (${token.length} bytes)`,
				err,
			);
		}
	},
};
