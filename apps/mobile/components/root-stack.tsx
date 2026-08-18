import { useAuth } from "@clerk/clerk-expo";
import { Stack, useRouter } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { Platform, Pressable } from "react-native";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Fonts } from "@/constants/fonts";
import { useTheme } from "@/hooks/use-theme";

export default function RootStack() {
	const theme = useTheme();
	const router = useRouter();
	// Gate di autenticazione: mentre Clerk carica teniamo lo splash; quando è
	// pronto scegliamo il gruppo di route in base a `isSignedIn`.
	const { isLoaded, isSignedIn } = useAuth();

	useEffect(() => {
		if (isLoaded) {
			SplashScreen.hideAsync();
		}
	}, [isLoaded]);

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

	// Splash ancora visibile finché non conosciamo lo stato di autenticazione:
	// evita di mostrare per un istante l'app (o il login) prima del ripristino
	// della sessione dalla token cache.
	if (!isLoaded) {
		return null;
	}

	return (
		<Stack
			screenOptions={{
				contentStyle: { backgroundColor: theme.background },
			}}
		>
			{/* Utente autenticato: l'app vera e propria */}
			<Stack.Protected guard={!!isSignedIn}>
				<Stack.Screen name="(tabs)" options={{ headerShown: false }} />
				{/* Il profilo è una pagina (push): usa l'header nativo di navigazione
				    (sticky by default, con back automatico), configurato qui in modo
				    centralizzato invece di una barra custom che scorre col contenuto. */}
				<Stack.Screen
					name="profile"
					options={{
						headerShown: true,
						title: "Profilo",
						headerBackButtonDisplayMode: "minimal",
						headerTintColor: theme.text,
						headerTitleStyle: { color: theme.text, fontFamily: Fonts.semiBold },
						headerStyle: { backgroundColor: theme.background },
						// Niente linea/ombra sotto la testata
						headerShadowVisible: false,
						headerRight: () => (
							<Pressable
								onPress={() => router.push("/profile-setup")}
								hitSlop={10}
								accessibilityRole="button"
								accessibilityLabel="Modifica profilo"
							>
								<IconSymbol name="pencil" size={18} color={theme.text} />
							</Pressable>
						),
					}}
				/>
				{/* La lista amici vive nella tab (app/(tabs)/friends.tsx): qui resta
				    solo lo sheet di ricerca, che apre il pulsante con la lente */}
				<Stack.Screen
					name="friends/add"
					options={{ ...sheetOptions, sheetAllowedDetents: [0.85, 1] }}
				/>
				{/* Cerchie: la pagina di dettaglio è un push, il resto sono sheet */}
				<Stack.Screen
					name="circles/[id]/index"
					options={{
						headerShown: true,
						title: "Cerchia",
						headerBackButtonDisplayMode: "minimal",
						headerTintColor: theme.text,
						headerTitleStyle: { color: theme.text, fontFamily: Fonts.semiBold },
						headerStyle: { backgroundColor: theme.background },
						headerShadowVisible: false,
					}}
				/>
				<Stack.Screen
					name="circles/new"
					options={{ ...sheetOptions, sheetAllowedDetents: [0.85, 1] }}
				/>
				<Stack.Screen
					name="circles/[id]/invite"
					options={{ ...sheetOptions, sheetAllowedDetents: [0.85, 1] }}
				/>
				<Stack.Screen
					name="match/[id]"
					options={{ ...sheetOptions, sheetAllowedDetents: [0.85, 1] }}
				/>
				<Stack.Screen
					name="book"
					options={{ ...sheetOptions, sheetAllowedDetents: [0.95] }}
				/>
				<Stack.Screen
					name="profile-setup"
					options={{ ...sheetOptions, sheetAllowedDetents: [0.85, 1] }}
				/>
			</Stack.Protected>

			{/* Utente non autenticato: il login è la route principale */}
			<Stack.Protected guard={!isSignedIn}>
				<Stack.Screen name="login" options={{ headerShown: false }} />
			</Stack.Protected>
		</Stack>
	);
}
