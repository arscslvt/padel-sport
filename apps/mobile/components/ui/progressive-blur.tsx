import MaskedView from "@react-native-masked-view/masked-view";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet, useColorScheme, View } from "react-native";
import { useTheme } from "@/hooks/use-theme";

type Gradient = readonly [string, string, ...string[]];

type ProgressiveBlurProps = {
	/**
	 * Lato da cui il blur è pieno e verso cui sfuma:
	 * `down` per una barra in alto, `up` per una barra in basso.
	 */
	direction?: "down" | "up";
	intensity?: number;
};

/**
 * Sfondo sfumato per le barre flottanti sopra il contenuto scorrevole:
 * il blur sfuma progressivamente tramite mask, e il gradiente del colore di
 * sfondo (pieno sul lato della barra → trasparente) copre il tint grigio del
 * materiale di sistema senza creare un velo uniforme.
 *
 * Va posato come primo figlio della barra: si dispone da solo su tutta la sua
 * superficie e non intercetta i tocchi.
 */
export default function ProgressiveBlur({
	direction = "down",
	intensity = 60,
}: ProgressiveBlurProps) {
	const theme = useTheme();
	const colorScheme = useColorScheme();
	const isDown = direction === "down";

	const maskColors: Gradient = isDown
		? ["black", "black", "transparent"]
		: ["transparent", "black", "black"];
	const maskLocations: readonly [number, number, number] = isDown
		? [0, 0.55, 1]
		: [0, 0.45, 1];

	const tintColors: Gradient = isDown
		? [theme.background, `${theme.background}00`]
		: [`${theme.background}00`, theme.background];
	const tintLocations: readonly [number, number] = isDown
		? [0.35, 1]
		: [0, 0.65];

	return (
		<View style={StyleSheet.absoluteFill} pointerEvents="none">
			<MaskedView
				style={StyleSheet.absoluteFill}
				maskElement={
					<LinearGradient
						colors={maskColors}
						locations={maskLocations}
						style={StyleSheet.absoluteFill}
					/>
				}
			>
				<BlurView
					intensity={intensity}
					tint={
						colorScheme === "dark"
							? "systemUltraThinMaterialDark"
							: "systemUltraThinMaterialLight"
					}
					style={StyleSheet.absoluteFill}
				/>
			</MaskedView>
			<LinearGradient
				colors={tintColors}
				locations={tintLocations}
				style={StyleSheet.absoluteFill}
			/>
		</View>
	);
}
