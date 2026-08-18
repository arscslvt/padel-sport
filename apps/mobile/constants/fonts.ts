/**
 * Google Sans, il font dell'app.
 *
 * I nomi sono i PostScript name dei file (`GoogleSans17pt-Regular`, non
 * `GoogleSans_17pt-Regular`): caricando i font a runtime la chiave sarebbe
 * libera, ma tenendo il PostScript name la stessa stringa continuerebbe a
 * funzionare anche se un domani i font venissero registrati nativamente dal
 * config plugin di expo-font, dove su iOS è l'unico nome che conta.
 *
 * Si usa il taglio ottico 17pt, disegnato per il testo di interfaccia.
 * Gli italici non sono caricati: l'app non li usa e ogni peso pesa ~1.9 MB.
 */
export const Fonts = {
	regular: "GoogleSans17pt-Regular",
	medium: "GoogleSans17pt-Medium",
	semiBold: "GoogleSans17pt-SemiBold",
	bold: "GoogleSans17pt-Bold",
} as const;

/**
 * Mappa da passare a `useFonts` in app/_layout.tsx: la chiave diventa il nome
 * con cui `fontFamily` trova il font, su iOS come su Android.
 *
 * Il caricamento è a runtime e non tramite il config plugin di expo-font
 * perché il plugin ha effetto solo dopo un prebuild, e su Android
 * registrerebbe i font col nome del file (con l'underscore), costringendo a
 * due nomi diversi per piattaforma.
 */
export const fontAssets = {
	[Fonts.regular]: require("../assets/fonts/Google_Sans/static/GoogleSans_17pt-Regular.ttf"),
	[Fonts.medium]: require("../assets/fonts/Google_Sans/static/GoogleSans_17pt-Medium.ttf"),
	[Fonts.semiBold]: require("../assets/fonts/Google_Sans/static/GoogleSans_17pt-SemiBold.ttf"),
	[Fonts.bold]: require("../assets/fonts/Google_Sans/static/GoogleSans_17pt-Bold.ttf"),
};
