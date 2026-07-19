import type { SFSymbol } from "sf-symbols-typescript";

type SFSymbolName = SFSymbol;

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
