import { useUser } from "@clerk/clerk-expo";
import MaskedView from "@react-native-masked-view/masked-view";
import { BlurView } from "expo-blur";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import {
	Pressable,
	StyleSheet,
	Text,
	useColorScheme,
	View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Avatar } from "@/components/open-match-card";
import Pill from "@/components/ui/pill";
import { useCurrentPlayer } from "@/hooks/use-current-player";
import { useTheme } from "@/hooks/use-theme";
import { mockProfile } from "@/lib/mock-profile";

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
	const router = useRouter();
	const { user } = useUser();
	const { isSignedIn, player } = useCurrentPlayer();

	// Il profilo giocatore Convex ha la precedenza (nome scelto in app),
	// con fallback sui dati dell'account Clerk
	const displayName =
		player?.name ??
		user?.firstName ??
		user?.fullName ??
		user?.primaryEmailAddress?.emailAddress ??
		"Giocatore";
	const avatarUrl = player?.avatarUrl ?? user?.imageUrl;
	// Il codice giocatore non esiste ancora su Convex: derivato dall'utente
	const code = user ? mockProfile(player?.id ?? user.id).code : null;

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

			{isSignedIn ? (
				<Pressable
					style={({ pressed }) => [
						{ flexDirection: "row", alignItems: "center", gap: 6 },
						pressed && { opacity: 0.8 },
					]}
					hitSlop={8}
					accessibilityRole="button"
					accessibilityLabel="Il tuo profilo"
					onPress={() => router.push("/profile")}
				>
					<View style={{ flexDirection: "column", alignItems: "flex-end" }}>
						<Text style={{ fontWeight: "600", color: theme.text }}>
							{displayName}
						</Text>
						{code && (
							<Text style={{ fontWeight: "600", color: `${theme.textMuted}90` }}>
								#<Text style={{ color: theme.text, opacity: 0.7 }}>{code}</Text>
							</Text>
						)}
					</View>

					<View style={styles.avatarButton}>
						<View
							style={{
								...styles.avatarImageContainer,
								borderWidth: 1,
								borderColor: theme.border,
							}}
						>
							<Avatar url={avatarUrl} size={46} borderWidth={0} />
						</View>
					</View>
				</Pressable>
			) : (
				<Pressable
					style={({ pressed }) => [pressed && { opacity: 0.8 }]}
					hitSlop={8}
					onPress={() => router.push("/auth")}
				>
					<Pill label="Accedi" icon="person.crop.circle.badge.plus" tinted />
				</Pressable>
			)}
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
