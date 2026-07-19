import {
	DarkTheme,
	DefaultTheme,
	ThemeProvider,
} from "@react-navigation/native";
import type React from "react";
import { useColorScheme } from "react-native";

interface AppThemeProviderProps {
	children: React.ReactNode;
}

export default function AppThemeProvider({ children }: AppThemeProviderProps) {
	const colorScheme = useColorScheme();
	return (
		<ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
			{children}
		</ThemeProvider>
	);
}
