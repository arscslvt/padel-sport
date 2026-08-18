import { useUser } from "@clerk/clerk-expo";
import { Image } from "expo-image";
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
import { ThemedText } from "@/components/themed-text";
import Crossfade from "@/components/ui/crossfade";
import Pill from "@/components/ui/pill";
import ProgressiveBlur from "@/components/ui/progressive-blur";
import { Fonts } from "@/constants/fonts";
import { useCurrentPlayer } from "@/hooks/use-current-player";
import { useTheme } from "@/hooks/use-theme";
import { mockProfile } from "@/lib/mock-profile";

type HeaderProps = {
	withSafeAreaInsets?: boolean;
	/**
	 * Titolo della schermata, al posto del logo. Con `null` (la Home) resta il
	 * logo dell'attività.
	 */
	title?: string | null;
};

export default function Header({
	withSafeAreaInsets = true,
	title = null,
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
	const fullName =
		player?.name ??
		user?.firstName ??
		user?.fullName ??
		user?.primaryEmailAddress?.emailAddress ??
		"Giocatore";
	// Solo il nome di battesimo: accanto al titolo della schermata lo spazio è
	// poco, e il cognome non aggiunge nulla a chi sta guardando il proprio profilo
	const displayName = fullName.trim().split(/\s+/)[0];
	const avatarUrl = player?.avatarUrl ?? user?.imageUrl;
	// Il codice arriva dal profilo giocatore; per chi non l'ha ancora ricevuto
	// (profili creati prima dei codici) resta quello dimostrativo
	const code = player?.code ?? (user ? mockProfile(user.id).code : null);

	return (
		<View
			style={[styles.header, { paddingTop: withSafeAreaInsets ? top : 0 }]}
			{...props}
		>
			<ProgressiveBlur />
			{/* Logo o titolo occupano lo stesso posto e si sostituiscono in
			    dissolvenza: la chiave distingue il logo dai singoli titoli, così
			    anche il passaggio da un titolo all'altro è una transizione */}
			<Crossfade
				itemKey={title ? `title:${title}` : "brand"}
				style={styles.leading}
			>
				{title ? (
					<ThemedText type="title" numberOfLines={1}>
						{title}
					</ThemedText>
				) : (
					<Image
						source={
							colorScheme === "dark"
								? require("@/assets/branding/logotype-dark.svg")
								: require("@/assets/branding/logotype.svg")
						}
						style={{ width: 68, height: 38, objectFit: "contain" }}
					/>
				)}
			</Crossfade>

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
						<Text style={{ fontFamily: Fonts.semiBold, color: theme.text }}>
							{displayName}
						</Text>
						{code && (
							<Text
								style={{ fontFamily: Fonts.semiBold, color: `${theme.textMuted}90` }}
							>
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
					onPress={() => router.push("/login")}
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
	/**
	 * Colonna e non riga: `Crossfade` centra i suoi strati verticalmente con
	 * `justifyContent`, e il contenuto resta allineato a sinistra.
	 */
	leading: {
		flex: 1,
		paddingLeft: 14,
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
