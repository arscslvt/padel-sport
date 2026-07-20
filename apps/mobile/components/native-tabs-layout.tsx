import { NativeTabs } from "expo-router/unstable-native-tabs";
import { View } from "react-native";
import BookButton from "@/components/book-button";
import { routes } from "@/constants/routes";
import { useTheme } from "@/hooks/use-theme";

/**
 * Layout tab basato sulla tab bar nativa di sistema (UITabBarController), che
 * su iOS 26 rende l'effetto Liquid Glass. Attualmente non in uso: lo attiva
 * `USE_NATIVE_TABS` in constants/routes.tsx.
 *
 * Limite noto: il pulsante "Prenota" non può essere una tab nativa staccata.
 * Il ruolo di sistema `search` — l'unico che UIKit stacca sulla destra — al tap
 * si trasforma in campo di ricerca e non può presentare uno sheet. Resta quindi
 * un overlay (components/book-button.tsx), che però UIKit non allinea alla
 * barra: è il motivo per cui per ora usiamo la BottomTab custom.
 */
export default function NativeTabsLayout() {
	const theme = useTheme();

	return (
		<View style={{ flex: 1 }}>
			<NativeTabs tintColor={theme.tint} minimizeBehavior="never">
				{routes.map((route) => (
					<NativeTabs.Trigger key={route.name} name={route.name}>
						<NativeTabs.Trigger.Icon sf={route.icon} />
						<NativeTabs.Trigger.Label>{route.title}</NativeTabs.Trigger.Label>
					</NativeTabs.Trigger>
				))}
			</NativeTabs>
			<BookButton />
		</View>
	);
}
