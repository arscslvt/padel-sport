import { useAuth, useUser } from "@clerk/clerk-expo";
import { useRouter } from "expo-router";
import { useMemo } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Avatar } from "@/components/open-match-card";
import SmoothView from "@/components/smooth-view";
import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import Pill from "@/components/ui/pill";
import { useCurrentPlayer } from "@/hooks/use-current-player";
import { useTheme } from "@/hooks/use-theme";
import { formatLevel, formatMatchDay, formatMonthYear } from "@/lib/format";
import { mockProfile, type PlayedMatchMock } from "@/lib/mock-profile";

/**
 * Profilo dell'utente: dati account da Clerk, profilo giocatore da Convex.
 * Storico partite, punteggio e amici sono ancora dimostrativi
 * (vedi lib/mock-profile.ts).
 */
export default function ProfileScreen() {
	const theme = useTheme();
	const router = useRouter();
	const { top } = useSafeAreaInsets();
	const { user, isLoaded } = useUser();
	const { signOut } = useAuth();
	const { player, isLoading } = useCurrentPlayer();

	const profile = useMemo(
		() => (user ? mockProfile(player?.id ?? user.id) : null),
		[user, player?.id],
	);

	const displayName =
		player?.name ?? user?.fullName ?? user?.firstName ?? "Giocatore";
	const email = user?.primaryEmailAddress?.emailAddress;
	const memberSince = user?.createdAt ? formatMonthYear(+user.createdAt) : null;

	const handleSignOut = () =>
		Alert.alert("Esci", "Vuoi disconnetterti da questo account?", [
			{ text: "Annulla", style: "cancel" },
			{
				text: "Esci",
				style: "destructive",
				onPress: async () => {
					await signOut();
					router.dismissTo("/");
				},
			},
		]);

	if (!isLoaded || isLoading) {
		return (
			<View
				style={{
					flex: 1,
					backgroundColor: theme.background,
					justifyContent: "center",
				}}
			>
				<ActivityIndicator />
			</View>
		);
	}

	// Raggiungibile solo via deep link: dall'header i non autenticati vedono "Accedi"
	if (!user) {
		return (
			<View
				style={{
					flex: 1,
					backgroundColor: theme.background,
					alignItems: "center",
					justifyContent: "center",
					padding: 32,
					gap: 16,
				}}
			>
				<ThemedText type="subtitle" style={{ textAlign: "center" }}>
					Accedi per vedere il tuo profilo
				</ThemedText>
				<SmoothView
					radius={22}
					smoothing={6}
					backgroundColor={theme.tint}
					style={{ paddingHorizontal: 22, paddingVertical: 14 }}
					onPress={() => router.replace("/auth")}
				>
					<ThemedText
						style={{
							fontSize: 16,
							fontWeight: "600",
							color: theme.tintForeground,
						}}
					>
						Accedi
					</ThemedText>
				</SmoothView>
			</View>
		);
	}

	return (
		<ScrollView
			style={{ flex: 1, backgroundColor: theme.background }}
			contentContainerStyle={{
				padding: 20,
				paddingTop: top + 8,
				paddingBottom: 48,
				gap: 24,
			}}
		>
			{/* Barra di navigazione */}
			<View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
				<Pressable
					onPress={() => router.back()}
					hitSlop={10}
					accessibilityRole="button"
					accessibilityLabel="Indietro"
					style={{
						backgroundColor: theme.muted,
						borderRadius: 999,
						padding: 8,
					}}
				>
					<IconSymbol name="chevron.left" size={18} color={theme.text} />
				</Pressable>
				<ThemedText type="title" style={{ flex: 1 }}>
					Profilo
				</ThemedText>
				<Pressable
					onPress={() => router.push("/profile-setup")}
					hitSlop={10}
					accessibilityRole="button"
					accessibilityLabel="Modifica profilo"
					style={{
						backgroundColor: theme.muted,
						borderRadius: 999,
						padding: 8,
					}}
				>
					<IconSymbol name="pencil" size={18} color={theme.text} />
				</Pressable>
			</View>

			{/* Anagrafica */}
			<View style={{ alignItems: "center", gap: 12 }}>
				<Avatar url={player?.avatarUrl ?? user?.imageUrl} size={96} />
				<View style={{ alignItems: "center", gap: 4 }}>
					<ThemedText style={{ fontSize: 22, fontWeight: "700" }}>
						{displayName}
					</ThemedText>
					{email && (
						<ThemedText style={{ fontSize: 14, color: theme.textMuted }}>
							{email}
						</ThemedText>
					)}
				</View>
				<View style={{ flexDirection: "row", gap: 8 }}>
					{player && <Pill label={`Livello ${formatLevel(player.level)}`} tinted />}
					{profile && <Pill label={`#${profile.code}`} />}
				</View>
				{memberSince && (
					<ThemedText style={{ fontSize: 13, color: theme.textMuted }}>
						Iscritto da {memberSince}
					</ThemedText>
				)}
			</View>

			{!player && (
				<SmoothView
					radius={18}
					smoothing={1}
					backgroundColor={theme.muted}
					borderWidth={0}
					shadow={false}
					onPress={() => router.push("/profile-setup")}
				>
					<View
						style={{
							padding: 14,
							flexDirection: "row",
							alignItems: "center",
							gap: 10,
						}}
					>
						<IconSymbol
							name="person.crop.circle.badge.plus"
							size={20}
							color={theme.tint}
						/>
						<ThemedText style={{ flex: 1, fontSize: 14 }}>
							Completa il profilo giocatore per unirti alle partite
						</ThemedText>
						<IconSymbol name="chevron.right" size={16} color={theme.textMuted} />
					</View>
				</SmoothView>
			)}

			{profile && (
				<>
					{/* Statistiche */}
					<View style={{ flexDirection: "row", gap: 10 }}>
						<StatCard
							label="Punteggio"
							value={profile.stats.score.toFixed(1)}
							icon="trophy"
						/>
						<StatCard
							label="Partite"
							value={String(profile.stats.matchesPlayed)}
							icon="figure.tennis"
						/>
						<StatCard
							label="Amici"
							value={String(profile.stats.friends)}
							icon="person.2.fill"
						/>
					</View>

					<View style={{ flexDirection: "row", gap: 10 }}>
						<StatCard
							label="Vittorie"
							value={String(profile.stats.wins)}
							icon="checkmark.circle.fill"
						/>
						<StatCard
							label="Sconfitte"
							value={String(profile.stats.losses)}
							icon="xmark"
						/>
						<StatCard
							label="Questo mese"
							value={String(profile.stats.monthlyMatches)}
							icon="calendar"
						/>
					</View>

					{/* Cronologia */}
					<View style={{ gap: 12 }}>
						<View style={{ gap: 2 }}>
							<ThemedText type="title" style={{ fontSize: 20 }}>
								Partite giocate
							</ThemedText>
							<ThemedText style={{ fontSize: 13, color: theme.textMuted }}>
								Dati dimostrativi: lo storico non è ancora salvato sul backend
							</ThemedText>
						</View>

						{profile.history.map((match) => (
							<HistoryRow key={match.id} match={match} />
						))}
					</View>
				</>
			)}

			<SmoothView
				radius={18}
				smoothing={1}
				backgroundColor={theme.elevated}
				borderColor={theme.border}
				borderWidth={1}
				shadow={false}
				onPress={handleSignOut}
			>
				<View
					style={{
						padding: 16,
						flexDirection: "row",
						alignItems: "center",
						justifyContent: "center",
						gap: 8,
					}}
				>
					<ThemedText style={{ fontSize: 16, fontWeight: "600" }}>
						Esci
					</ThemedText>
				</View>
			</SmoothView>
		</ScrollView>
	);
}

function StatCard({
	label,
	value,
	icon,
}: {
	label: string;
	value: string;
	icon: string;
}) {
	const theme = useTheme();

	return (
		<SmoothView
			radius={20}
			smoothing={4}
			backgroundColor={theme.elevated}
			borderColor={theme.border}
			borderWidth={1}
			style={{ flex: 1 }}
		>
			<View style={{ padding: 14, gap: 8 }}>
				<IconSymbol name={icon} size={18} color={theme.tint} />
				<ThemedText
					style={{ fontSize: 24, fontWeight: "700", color: theme.textTinted }}
				>
					{value}
				</ThemedText>
				<ThemedText
					style={{ fontSize: 12, color: theme.textMuted }}
					numberOfLines={1}
					adjustsFontSizeToFit
				>
					{label}
				</ThemedText>
			</View>
		</SmoothView>
	);
}

function HistoryRow({ match }: { match: PlayedMatchMock }) {
	const theme = useTheme();
	const won = match.result === "win";

	return (
		<SmoothView
			radius={18}
			smoothing={1}
			backgroundColor={theme.elevated}
			borderColor={theme.border}
			borderWidth={1}
			shadow={false}
		>
			<View style={{ padding: 14, gap: 8 }}>
				<View
					style={{
						flexDirection: "row",
						alignItems: "center",
						justifyContent: "space-between",
						gap: 8,
					}}
				>
					<ThemedText style={{ fontSize: 15, fontWeight: "600" }}>
						{formatMatchDay(match.date)}
					</ThemedText>
					<Pill label={won ? "Vittoria" : "Sconfitta"} tinted={won} />
				</View>

				<ThemedText style={{ fontSize: 13, color: theme.textMuted }}>
					{match.sets.join("  ·  ")}
				</ThemedText>

				<View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
					<IconSymbol
						name="person.2.fill"
						size={13}
						color={theme.textMuted}
					/>
					<ThemedText
						style={{ fontSize: 13, color: theme.textMuted, flex: 1 }}
						numberOfLines={1}
					>
						con {match.partner} · contro {match.opponents.join(" e ")}
					</ThemedText>
				</View>

				<View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
					<IconSymbol
						name="mappin.and.ellipse"
						size={13}
						color={theme.textMuted}
					/>
					<ThemedText style={{ fontSize: 13, color: theme.textMuted }}>
						{match.court}
					</ThemedText>
				</View>
			</View>
		</SmoothView>
	);
}
