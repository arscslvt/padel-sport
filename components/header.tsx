import { useTheme } from "@/hooks/use-theme";
import { BlurView } from "expo-blur";
import { Image } from "expo-image";
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
		<BlurView
			intensity={80}
			tint="regular"
			style={[
				styles.header,
				{
					paddingTop: withSafeAreaInsets ? top : 0,
					backgroundColor: `${theme.background}60`, // Aggiungiamo trasparenza al colore di sfondo
				},
			]}
			{...props}
		>
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
					<Text style={{ fontWeight: "600", color: theme.text }}>Giulio</Text>
					<Text style={{ fontWeight: "600", color: theme.textMuted }}>
						1.2k punti
					</Text>
				</View>

				<Pressable
					style={({ pressed }) => [
						styles.avatarButton,
						pressed && { opacity: 0.8 },
					]}
					hitSlop={8}
				>
					<View style={styles.avatarImageContainer}>
						<Image
							source={"https://api.dicebear.com/9.x/glass/png?seed=Sadie"}
							style={{ objectFit: "contain", width: "100%", height: "100%" }}
						/>
					</View>
				</Pressable>
			</View>
		</BlurView>
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
	},
});
