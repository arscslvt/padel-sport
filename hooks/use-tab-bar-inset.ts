import { Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/**
 * Altezza della tab bar flottante sopra la safe area inferiore:
 * su iOS la UITabBar nativa (Liquid Glass), su Android/web la
 * BottomTab custom alta 72 (components/bottom-tab.tsx).
 */
const TAB_BAR_HEIGHT = Platform.OS === "ios" ? 54 : 72;

/**
 * Padding inferiore da applicare al contenuto scrollabile delle schermate
 * tab, così che l'ultimo elemento non resti nascosto sotto la tab bar.
 */
export function useTabBarInset() {
	const { bottom } = useSafeAreaInsets();
	return bottom + TAB_BAR_HEIGHT + 16;
}
