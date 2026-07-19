import { useTheme } from "@/hooks/use-theme";
import MaskedView from "@react-native-masked-view/masked-view";
import { BlurView } from "expo-blur";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import {
	Pressable,
	StyleSheet,
	Text,
	useColorScheme,
	View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type HeaderProps = {
	withSafeAreaInsets?: boolean;
};

export default function Header({
	withSafeAreaInsets = true,
	...props
}: HeaderProps) {
	const { top } = useSafeAreaInsets();
	const theme = useTheme();
	const colorScheme = useColorScheme();

	return (
		<View
			style={[styles.header, { paddingTop: withSafeAreaInsets ? top : 0 }]}
			{...props}
		>
			{/* Progressive blur: il blur sfuma verso il basso tramite mask, e il gradiente
			    del colore di sfondo (pieno in alto → trasparente) copre il tint grigio
			    del materiale di sistema senza creare un velo uniforme */}
			<View style={StyleSheet.absoluteFill} pointerEvents="none">
				<MaskedView
					style={StyleSheet.absoluteFill}
					maskElement={
						<LinearGradient
							colors={["black", "black", "transparent"]}
							locations={[0, 0.55, 1]}
							style={StyleSheet.absoluteFill}
						/>
					}
				>
					<BlurView
						intensity={60}
						tint={
							colorScheme === "dark"
								? "systemUltraThinMaterialDark"
								: "systemUltraThinMaterialLight"
						}
						style={StyleSheet.absoluteFill}
					/>
				</MaskedView>
				<LinearGradient
					colors={[theme.background, `${theme.background}00`]}
					locations={[0.35, 1]}
					style={StyleSheet.absoluteFill}
				/>
			</View>
			<View style={{ ...styles.leading, paddingLeft: 14 }}>
				<Image
					source={
						colorScheme === "dark"
							? require("@/assets/branding/logotype-dark.svg")
							: require("@/assets/branding/logotype.svg")
					}
					style={{ width: 68, height: 38, objectFit: "contain" }}
				/>
			</View>

			<View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
				<View style={{ flexDirection: "column", alignItems: "flex-end" }}>
					<Text style={{ fontWeight: "600", color: theme.text }}>Antonio</Text>
					<Text style={{ fontWeight: "600", color: `${theme.textMuted}90` }}>
						#<Text style={{ color: theme.text, opacity: 0.7 }}>29103</Text>
					</Text>
				</View>

				<Pressable
					style={({ pressed }) => [
						styles.avatarButton,
						pressed && { opacity: 0.8 },
					]}
					hitSlop={8}
				>
					<View
						style={{
							...styles.avatarImageContainer,
							borderWidth: 1,
							borderColor: theme.border,
						}}
					>
						<Image
							source={"https://api.dicebear.com/9.x/glass/png?seed=Sadie"}
							style={{
								objectFit: "contain",
								width: "100%",
								height: "100%",
								borderRadius: 9999,
							}}
						/>
					</View>
				</Pressable>
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	header: {
		flexDirection: "row",
		paddingHorizontal: 16,
		paddingBottom: 8,
	},
	leading: {
		flexDirection: "row",
		flex: 1,
		alignItems: "center",
	},
	avatarButton: {
		borderRadius: 9999,
		overflow: "hidden",
		width: 52,
		height: 52,
		marginLeft: 12,
	},
	avatarImageContainer: {
		width: "100%",
		height: "100%",
		borderRadius: 9999,
		overflow: "hidden",
		padding: 3,
	},
});
