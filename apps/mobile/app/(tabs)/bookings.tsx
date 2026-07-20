import { api } from "@padel-sport/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import { useRouter } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import BookingCard from "@/components/booking-card";
import SmoothView from "@/components/smooth-view";
import TabScreen from "@/components/tab-screen";
import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useCurrentPlayer } from "@/hooks/use-current-player";
import { useTheme } from "@/hooks/use-theme";

export default function BookingsScreen() {
	const { top } = useSafeAreaInsets();
	const theme = useTheme();
	const router = useRouter();
	const { isSignedIn, isLoading: loadingPlayer } = useCurrentPlayer();
	const myBookings = useQuery(
		api.modules.openMatches.my.default,
		isSignedIn ? {} : "skip",
	);

	const loading = loadingPlayer || (isSignedIn && myBookings === undefined);
	const bookings = (myBookings ?? []).filter((b) => !b.cancelled);

	return (
		<TabScreen>
			<View style={{ flex: 1, paddingTop: top + 54 }}>
				<View style={{ paddingHorizontal: 16, marginTop: 24, flex: 1 }}>
					<View>
						<ThemedText type="title">Prenotazioni</ThemedText>
					</View>

					{loading ? (
						<ActivityIndicator style={{ marginTop: 38 }} />
					) : !isSignedIn || bookings.length === 0 ? (
						<View
							style={{
								justifyContent: "center",
								alignItems: "center",
								marginVertical: 38,
								gap: 22,
							}}
						>
							<View
								style={{
									justifyContent: "center",
									alignItems: "center",
									gap: 4,
								}}
							>
								<ThemedText type="subtitle" style={{ color: theme.textTinted }}>
									Non hai ancora prenotato
								</ThemedText>
								<ThemedText style={{ color: theme.textMuted }}>
									Che aspetti? Prenota e riunisci la tua squadra
								</ThemedText>
							</View>
							<SmoothView
								backgroundColor={theme.tint}
								style={{
									paddingHorizontal: 22,
									paddingVertical: 14,
									borderRadius: 8,
									flexDirection: "row",
									alignItems: "center",
									gap: 6,
								}}
								radius={22}
								smoothing={6}
								onPress={() =>
									isSignedIn ? router.navigate("/book") : router.push("/auth")
								}
							>
								<IconSymbol
									name="plus.circle.fill"
									color={theme.tintForeground}
								/>
								<ThemedText
									style={{
										fontSize: 18,
										lineHeight: 24,
										fontWeight: "500",
										color: theme.tintForeground,
									}}
								>
									Prenota
								</ThemedText>
							</SmoothView>
						</View>
					) : (
						<View style={{ marginTop: 18, gap: 10 }}>
							{bookings.map((booking) => {
								const matchId = booking.matchId;
								return (
									<BookingCard
										key={booking.bookingId}
										booking={booking}
										onPress={
											matchId
												? () =>
														router.push({
															pathname: "/match/[id]",
															params: { id: matchId },
														})
												: undefined
										}
									/>
								);
							})}
						</View>
					)}
				</View>
			</View>
		</TabScreen>
	);
}
