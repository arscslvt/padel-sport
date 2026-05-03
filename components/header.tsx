import { Colors } from "@/constants/theme";
import { Image } from "expo-image";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type HeaderProps = {
	withSafeAreaInsets?: boolean;
};

export default function Header({
	withSafeAreaInsets = true,
	...props
}: HeaderProps) {
	const { top } = useSafeAreaInsets();

	return (
		<View
			style={[
				styles.header,
				{
					paddingTop: withSafeAreaInsets ? top : 0,
					backgroundColor: "transparent",
				},
			]}
			{...props}
		>
			<View style={styles.leading}>
				<Image
					source={require("@/assets/branding/logotype.svg")}
					style={{ width: 68, height: 38, objectFit: "contain" }}
				/>
			</View>

			<View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
				<View style={{ flexDirection: "column", alignItems: "flex-end" }}>
					<Text style={{ fontWeight: "600" }}>Ciao Valentina,</Text>
					<Text style={{ fontWeight: "600", color: Colors.light.textMuted }}>
						pronta a giocare?
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
		</View>
	);
}

const styles = StyleSheet.create({
	header: {
		flexDirection: "row",
		paddingHorizontal: 16,
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
