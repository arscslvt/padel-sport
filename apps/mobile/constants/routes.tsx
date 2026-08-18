import type { Href } from "expo-router";
import type { SFSymbol } from "sf-symbols-typescript";

type SFSymbolName = SFSymbol;

/**
 * Usa la tab bar nativa di iOS (components/native-tabs-layout.tsx) invece della
 * BottomTab custom. Disattivata: UIKit non permette di staccare una tab che
 * apra uno sheet, quindi il pulsante "Prenota" resterebbe un overlay
 * disallineato rispetto alla barra.
 */
export const USE_NATIVE_TABS = false;

interface TabRoute {
	/** Nome del file route dentro app/(tabs) */
	name: string;
	/** Etichetta mostrata nella tab bar */
	title: string;
	/**
	 * Nome SF Symbol: usato nativamente su iOS (NativeTabs / SymbolView),
	 * mappato a Material Icons su Android/web da components/ui/icon-symbol.tsx
	 */
	icon: SFSymbolName;
	/**
	 * Mostra `title` al posto del logo nell'header (components/header.tsx).
	 * Default: sì. La Home tiene il logo, che lì è l'identità dell'attività
	 * e non un'etichetta di navigazione.
	 */
	headerTitle?: boolean;
}

interface TabAction {
	/** Etichetta di accessibilità: il pulsante mostra solo l'icona */
	title: string;
	icon: SFSymbolName;
	href: Href;
}

/**
 * Azione staccata a destra della tab bar (come il tab di ricerca di iOS 26):
 * non è una tab ma apre uno sheet. Su iOS è resa dal pulsante flottante in
 * Liquid Glass (components/book-button.tsx), su Android/web dalla pill accanto
 * alla BottomTab custom.
 *
 * Questa è l'azione predefinita: prenotare è ciò che serve quasi ovunque.
 */
export const bookAction: TabAction = {
	title: "Prenota",
	icon: "plus",
	href: "/book",
};

/**
 * Tab che sostituiscono l'azione predefinita con una loro.
 *
 * Sulla schermata Amici il "+" non avrebbe un significato ovvio — creare cosa,
 * un amico? — mentre la lente dice esattamente cosa si va a fare: trovare
 * qualcuno da aggiungere. Le cerchie si creano dal loro pulsante nella pagina.
 */
export const tabActions: Record<string, TabAction> = {
	friends: {
		title: "Cerca giocatori",
		icon: "magnifyingglass",
		href: "/friends/add",
	},
};

/** L'azione della tab attiva, o quella predefinita. */
export function actionForRoute(routeName: string | undefined): TabAction {
	return (routeName && tabActions[routeName]) || bookAction;
}

export const routes: TabRoute[] = [
	{
		name: "index",
		title: "Home",
		icon: "house.fill",
		headerTitle: false,
	},
	{
		name: "bookings",
		title: "Prenotazioni",
		icon: "calendar",
	},
	{
		name: "friends",
		title: "Amici",
		icon: "person.2.fill",
	},
];

/**
 * Titolo da mostrare nell'header per una route, o `null` se lì va il logo.
 * Deriva dalla stessa tabella della tab bar, così l'etichetta della tab e il
 * titolo in cima alla schermata non possono divergere.
 */
export function headerTitleForRoute(routeName: string | undefined): string | null {
	const route = routes.find((entry) => entry.name === routeName);
	if (!route || route.headerTitle === false) return null;
	return route.title;
}

export type { TabAction, TabRoute };
