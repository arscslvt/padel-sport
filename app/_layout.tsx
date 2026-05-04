import { StatusBar } from "expo-status-bar";
import "react-native-reanimated";

import RootStack from "@/components/root-stack";
import AppThemeProvider from "@/providers/theme.provider";

export const unstable_settings = {
	anchor: "(tabs)",
};

export default function RootLayout() {
	return (
		<AppThemeProvider>
			<RootStack />
			<StatusBar style="auto" />
		</AppThemeProvider>
	);
}
