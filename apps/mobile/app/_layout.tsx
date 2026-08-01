import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import "react-native-reanimated";

import RootStack from "@/components/root-stack";
import ConvexClerkProvider from "@/providers/convex.provider";
import AppThemeProvider from "@/providers/theme.provider";

export const unstable_settings = {
	anchor: "(tabs)",
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
	const [loaded, error] = useFonts({
		GoogleSans: require("../assets/fonts/Google_Sans/GoogleSans-VariableFont_GRAD,opsz,wght.ttf"),
	});

	// Lo splash resta finché i font non sono pronti; poi lo nasconde RootStack
	// una volta noto lo stato di autenticazione Clerk (vedi components/root-stack).
	if (!loaded && !error) {
		return null;
	}

	return (
		<ConvexClerkProvider>
			<AppThemeProvider>
				<RootStack />
				<StatusBar style="auto" />
			</AppThemeProvider>
		</ConvexClerkProvider>
	);
}
