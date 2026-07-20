import { Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { USE_NATIVE_TABS } from "@/constants/routes";

/**
 * Altezza della tab bar flottante sopra la safe area inferiore: la BottomTab
 * custom è alta 72 (components/bottom-tab.tsx), la UITabBar nativa di iOS 54.
 */
const TAB_BAR_HEIGHT = USE_NATIVE_TABS && Platform.OS === "ios" ? 54 : 72;

/**
 * Padding inferiore da applicare al contenuto scrollabile delle schermate
 * tab, così che l'ultimo elemento non resti nascosto sotto la tab bar.
 */
export function useTabBarInset() {
	const { bottom } = useSafeAreaInsets();
	return bottom + TAB_BAR_HEIGHT + 16;
}
