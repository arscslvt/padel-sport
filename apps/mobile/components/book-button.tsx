import { BlurView } from "expo-blur";
import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect";
import { useRouter } from "expo-router";
import {
	Pressable,
	StyleSheet,
	useColorScheme,
	View,
	type ViewProps,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { bookAction } from "@/constants/routes";
import { useTheme } from "@/hooks/use-theme";
import { IconSymbol } from "./ui/icon-symbol";

/** Diametro del pulsante: allineato all'altezza della tab bar nativa. */
const SIZE = 54;
/** Distanza dal bordo destro dello schermo. */
const MARGIN = 14;

/**
 * Pulsante "Prenota" flottante accanto alla tab bar nativa di iOS, sullo stile
 * del tab di ricerca staccato di iOS 26. Non è una tab: apre lo sheet di
 * prenotazione, quindi resta sopra la schermata corrente.
 *
 * Il ruolo nativo `search` non è utilizzabile qui perché UIKit lo trasforma in
 * un campo di ricerca al tap e non permette di presentare un modal.
 */
export default function BookButton() {
	const { bottom } = useSafeAreaInsets();
	const router = useRouter();
	const theme = useTheme();

	return (
		<Glass style={[styles.button, { right: MARGIN, bottom }]}>
			<Pressable
				accessibilityRole="button"
				accessibilityLabel={bookAction.title}
				style={styles.pressable}
				onPress={() => router.push(bookAction.href)}
			>
				<IconSymbol name={bookAction.icon} size={26} color={theme.text} />
			</Pressable>
		</Glass>
	);
}

/**
 * Materiale del pulsante: Liquid Glass su iOS 26, altrimenti il blur di
 * sistema con un bordo sottile per staccarlo dal contenuto.
 */
function Glass({ style, children }: ViewProps) {
	const theme = useTheme();
	const colorScheme = useColorScheme();

	if (isLiquidGlassAvailable()) {
		return (
			<GlassView style={style} glassEffectStyle="regular" isInteractive>
				{children}
			</GlassView>
		);
	}

	return (
		<View
			style={[style, { borderWidth: 1, borderColor: theme.tabBarBorder }]}
		>
			<BlurView
				intensity={80}
				tint={
					colorScheme === "dark"
						? "systemThickMaterialDark"
						: "systemThickMaterialLight"
				}
				style={StyleSheet.absoluteFill}
			/>
			{children}
		</View>
	);
}

const styles = StyleSheet.create({
	button: {
		position: "absolute",
		width: SIZE,
		height: SIZE,
		borderRadius: SIZE / 2,
		overflow: "hidden",
	},
	pressable: {
		flex: 1,
		alignItems: "center",
		justifyContent: "center",
	},
});
