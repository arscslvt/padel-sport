import { useAuth, useUser } from "@clerk/clerk-expo";
import { api } from "@padel-sport/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import { useRouter } from "expo-router";
import { useMemo } from "react";
import { ActivityIndicator, Alert, ScrollView, View } from "react-native";
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
	const { user, isLoaded } = useUser();
	const { signOut } = useAuth();
	const { player, isSignedIn, isLoading } = useCurrentPlayer();

	// Gli amici sono l'unico dato reale tra le statistiche: il resto è ancora
	// dimostrativo (lib/mock-profile.ts).
	const friends = useQuery(
		api.modules.friends.list.default,
		isSignedIn ? {} : "skip",
	);
	const friendsCount = friends?.friends.length;

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
					// Il gate reagisce a isSignedIn e riporta al login: nessuna nav manuale.
					await signOut();
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
					onPress={() => router.replace("/login")}
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
			contentInsetAdjustmentBehavior="automatic"
			contentContainerStyle={{
				padding: 20,
				paddingBottom: 48,
				gap: 24,
			}}
		>
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
					{player && (
						<Pill label={`Livello ${formatLevel(player.level)}`} tinted />
					)}
					{(player?.code ?? profile?.code) && (
						<Pill label={`#${player?.code ?? profile?.code}`} />
					)}
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
						<IconSymbol
							name="chevron.right"
							size={16}
							color={theme.textMuted}
						/>
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
							value={friendsCount === undefined ? "–" : String(friendsCount)}
							icon="person.2.fill"
							onPress={() => router.push("/friends")}
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
	onPress,
}: {
	label: string;
	value: string;
	icon: string;
	/** Se presente, la card diventa premibile e porta al dettaglio. */
	onPress?: () => void;
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
			onPress={onPress}
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
					<IconSymbol name="person.2.fill" size={13} color={theme.textMuted} />
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
