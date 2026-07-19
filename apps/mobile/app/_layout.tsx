import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import "react-native-reanimated";

import RootStack from "@/components/root-stack";
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

	useEffect(() => {
		if (loaded || error) {
			SplashScreen.hideAsync();
		}
	}, [loaded, error]);

	if (!loaded && !error) {
		return null;
	}

	return (
		<AppThemeProvider>
			<RootStack />
			<StatusBar style="auto" />
		</AppThemeProvider>
	);
}
