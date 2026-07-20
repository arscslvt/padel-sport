import { api } from "@padel-sport/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import { useRouter } from "expo-router";
import { ActivityIndicator, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import BookingCard from "@/components/booking-card";
import KpiCard from "@/components/kpi-card";
import OpenMatchCard from "@/components/open-match-card";
import TabScreen from "@/components/tab-screen";
import { ThemedText } from "@/components/themed-text";
import { useCurrentPlayer } from "@/hooks/use-current-player";
import { useTabBarInset } from "@/hooks/use-tab-bar-inset";
import { useTheme } from "@/hooks/use-theme";
import { mockProfile } from "@/lib/mock-profile";

export default function TabsIndex() {
	const { top } = useSafeAreaInsets();
	const theme = useTheme();
	const router = useRouter();
	const tabBarInset = useTabBarInset();
	// Le partite create dall'utente sono già escluse lato server
	const openMatches = useQuery(api.modules.openMatches.list.default, {});
	const { player, isSignedIn } = useCurrentPlayer();
	const myBookings = useQuery(
		api.modules.openMatches.my.default,
		isSignedIn ? {} : "skip",
	);

	// Le prenotazioni arrivano ordinate per data crescente: la prima ancora
	// valida è la prossima in programma.
	const nextBooking = myBookings?.find((booking) => !booking.cancelled) ?? null;

	// Punteggio e partite giocate sono ancora dimostrativi (lib/mock-profile.ts):
	// stessi numeri del profilo, così le due schermate restano coerenti
	const profile = player ? mockProfile(player.id) : null;

	return (
		<TabScreen>
			<ScrollView
				contentContainerStyle={{
					paddingBottom: tabBarInset,
					paddingTop: top + 60, // Per spingere il primo contenuto visibile sotto la header
					flexGrow: 1,
				}}
				style={{
					width: "100%",
					flex: 1,
				}}
			>
				<View
					style={{
						flexDirection: "row",
						gap: 12,
						paddingHorizontal: 16,
						marginTop: 16,
						overflow: "visible",
					}}
				>
					<KpiCard
						title="Partite del mese"
						content={
							<ThemedText
								style={{
									fontSize: 32,
									fontWeight: "700",
									lineHeight: 32,
									color: theme.textTinted,
								}}
							>
								{profile?.stats.monthlyMatches ?? "–"}
							</ThemedText>
						}
						iconName="arrow.forward.circle.fill"
						onPress={() => router.push(isSignedIn ? "/profile" : "/auth")}
					/>

					<KpiCard
						title="Score totale"
						content={
							<ThemedText
								style={{
									fontSize: 32,
									fontWeight: "700",
									lineHeight: 32,
									color: theme.textTinted,
								}}
							>
								{profile?.stats.score.toFixed(1) ?? "–"}
							</ThemedText>
						}
						iconName="arrow.forward.circle.fill"
						onPress={() => router.push(isSignedIn ? "/profile" : "/auth")}
					/>
				</View>

				{/* La prossima prenotazione compare solo se esiste: l'elenco
				    completo vive nella tab dedicata */}
				{nextBooking && (
					<View style={{ paddingHorizontal: 16, marginTop: 24, gap: 14 }}>
						<ThemedText type="title">Prossima prenotazione</ThemedText>

						<BookingCard
							booking={nextBooking}
							onPress={() =>
								nextBooking.matchId
									? router.push({
											pathname: "/match/[id]",
											params: { id: nextBooking.matchId },
										})
									: router.navigate("/bookings")
							}
						/>
					</View>
				)}

				<View style={{ paddingHorizontal: 16, marginTop: 24, gap: 14 }}>
					<View style={{ gap: 2 }}>
						<ThemedText type="title">Partite aperte</ThemedText>
						<ThemedText
							type="subtitle"
							style={{ fontSize: 15, lineHeight: 22, fontWeight: 400 }}
						>
							Giocatori che cercano compagni di gioco
						</ThemedText>
					</View>

					{openMatches === undefined ? (
						<ActivityIndicator style={{ marginVertical: 24 }} />
					) : openMatches.length === 0 ? (
						<ThemedText
							type="subtitle"
							style={{ fontSize: 15, lineHeight: 22, marginVertical: 12 }}
						>
							Nessuna partita aperta al momento. Creane una tu!
						</ThemedText>
					) : (
						openMatches.map((match) => (
							<OpenMatchCard
								key={match.id}
								match={match}
								myLevel={player?.level}
								onPress={() =>
									router.push({
										pathname: "/match/[id]",
										params: { id: match.id },
									})
								}
							/>
						))
					)}
				</View>
			</ScrollView>
		</TabScreen>
	);
}
