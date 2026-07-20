import { api } from "@padel-sport/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import { useRouter } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import SmoothView from "@/components/smooth-view";
import TabScreen from "@/components/tab-screen";
import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import Pill from "@/components/ui/pill";
import { useCurrentPlayer } from "@/hooks/use-current-player";
import { useTheme } from "@/hooks/use-theme";
import { formatMatchDate } from "@/lib/format";

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
									router.push(isSignedIn ? "/book" : "/auth")
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
								<SmoothView
									key={booking.bookingId}
									radius={18}
									smoothing={1}
									backgroundColor={theme.elevated}
									borderColor={theme.border}
									borderWidth={1}
									shadow={false}
									onPress={
										matchId
											? () =>
													router.push({
														pathname: "/match/[id]",
														params: { id: matchId },
													})
											: undefined
									}
								>
									<View style={{ padding: 14, gap: 8 }}>
										<View
											style={{
												flexDirection: "row",
												alignItems: "center",
												justifyContent: "space-between",
											}}
										>
											<ThemedText style={{ fontSize: 16, fontWeight: "600" }}>
												{formatMatchDate(booking.bookingDate)}
											</ThemedText>
											{booking.open && (
												<Pill
													label={
														booking.isCreator ? "Partita aperta" : "Ti sei unito"
													}
													tinted
												/>
											)}
										</View>
										{booking.court && (
											<View
												style={{
													flexDirection: "row",
													alignItems: "center",
													gap: 6,
												}}
											>
												<IconSymbol
													name="mappin.and.ellipse"
													size={14}
													color={theme.textMuted}
												/>
												<ThemedText
													style={{ fontSize: 13, color: theme.textMuted }}
												>
													{booking.court}
												</ThemedText>
											</View>
										)}
										<ThemedText style={{ fontSize: 13, color: theme.textMuted }}>
											{booking.playerNames.join(", ")}
										</ThemedText>
										{booking.code && (
											<ThemedText
												style={{
													fontSize: 12,
													color: theme.textMuted,
													letterSpacing: 1,
												}}
											>
												Codice {booking.code}
											</ThemedText>
										)}
									</View>
								</SmoothView>
								);
							})}
						</View>
					)}
				</View>
			</View>
		</TabScreen>
	);
}
