import { useTheme } from "@/hooks/use-theme";
import { Stack } from "expo-router";

export default function RootStack() {
	const theme = useTheme();

	/**
	 * Opzioni condivise per gli sheet delle azioni (dettaglio partita,
	 * prenotazione): su iOS UISheetPresentationController (modal nativo),
	 * su Android il drawer bottom-sheet di react-native-screens.
	 */
	const sheetOptions = {
		headerShown: false,
		presentation: "formSheet",
		sheetGrabberVisible: true,
		sheetCornerRadius: 32,
		contentStyle: { backgroundColor: theme.background },
	} as const;

	return (
		<Stack
			screenOptions={{
				contentStyle: { backgroundColor: theme.background },
			}}
		>
			<Stack.Screen name="(tabs)" options={{ headerShown: false }} />
			<Stack.Screen
				name="match/[id]"
				options={{ ...sheetOptions, sheetAllowedDetents: [0.85, 1] }}
			/>
			<Stack.Screen
				name="book"
				options={{ ...sheetOptions, sheetAllowedDetents: [0.95] }}
			/>
			<Stack.Screen
				name="auth"
				options={{ ...sheetOptions, sheetAllowedDetents: [0.6, 1] }}
			/>
			<Stack.Screen
				name="profile-setup"
				options={{ ...sheetOptions, sheetAllowedDetents: [0.85, 1] }}
			/>
		</Stack>
	);
}
