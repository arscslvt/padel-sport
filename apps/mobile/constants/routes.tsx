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
}

/**
 * Azione staccata a destra della tab bar (come il tab di ricerca di iOS 26):
 * non è una tab ma apre lo sheet di prenotazione. Su iOS è resa dal pulsante
 * flottante in Liquid Glass (components/book-button.tsx), su Android/web dalla
 * pill accanto alla BottomTab custom.
 */
export const bookAction = {
	title: "Prenota",
	icon: "plus" as SFSymbolName,
	href: "/book",
} as const;

export const routes: TabRoute[] = [
	{
		name: "index",
		title: "Home",
		icon: "house.fill",
	},
	{
		name: "bookings",
		title: "Prenotazioni",
		icon: "calendar",
	},
	{
		name: "rankings",
		title: "Classifiche",
		icon: "trophy",
	},
];

export type { TabRoute };
