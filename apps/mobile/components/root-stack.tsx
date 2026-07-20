import { useTheme } from "@/hooks/use-theme";
import { Stack } from "expo-router";
import { Platform } from "react-native";

export default function RootStack() {
	const theme = useTheme();

	/**
	 * Opzioni condivise per gli sheet delle azioni (dettaglio partita,
	 * prenotazione): su iOS UISheetPresentationController (modal nativo),
	 * su Android il drawer bottom-sheet di react-native-screens.
	 *
	 * Su iOS il raggio degli angoli resta quello di sistema (valore negativo =
	 * `UISheetPresentationControllerAutomaticDimension`): da iOS 26 è
	 * concentrico agli angoli del display, mentre un valore fisso non seguirebbe
	 * la curvatura dello schermo. Su Android il default sarebbe 0.
	 */
	const sheetOptions = {
		headerShown: false,
		presentation: "formSheet",
		sheetGrabberVisible: true,
		sheetCornerRadius: Platform.OS === "ios" ? -1 : 32,
		contentStyle: { backgroundColor: theme.background },
	} as const;

	return (
		<Stack
			screenOptions={{
				contentStyle: { backgroundColor: theme.background },
			}}
		>
			<Stack.Screen name="(tabs)" options={{ headerShown: false }} />
			{/* Il profilo è una pagina (push), non uno sheet: ha contenuto lungo
			    e la sua barra di navigazione */}
			<Stack.Screen name="profile" options={{ headerShown: false }} />
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
