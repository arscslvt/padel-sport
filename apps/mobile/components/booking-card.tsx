import { api } from "@padel-sport/backend/convex/_generated/api";
import type { Id } from "@padel-sport/backend/convex/_generated/dataModel";
import type { MyBookingView } from "@padel-sport/backend/convex/modules/openMatches/my";
import { useMutation } from "convex/react";
import { useState } from "react";
import { ActivityIndicator, Alert, Pressable, View } from "react-native";
import { useTheme } from "@/hooks/use-theme";
import { CANCEL_DEADLINE_MINUTES } from "@/lib/booking";
import { convexErrorMessage, formatMatchDate } from "@/lib/format";
import SmoothView from "./smooth-view";
import { ThemedText } from "./themed-text";
import { IconSymbol } from "./ui/icon-symbol";
import Pill from "./ui/pill";

interface BookingCardProps {
	booking: MyBookingView;
	onPress?: () => void;
}

/**
 * Riepilogo di una prenotazione dell'utente: usato nell'elenco della tab
 * Prenotazioni e per la prossima prenotazione in Home.
 */
export default function BookingCard({ booking, onPress }: BookingCardProps) {
	const theme = useTheme();
	const cancelMatch = useMutation(api.modules.openMatches.cancel.default);
	const [deleting, setDeleting] = useState(false);

	/**
	 * Stesse condizioni della mutation (modules/openMatches/cancel.ts): la
	 * partita è ancora solo di chi l'ha creata e mancano più di due ore.
	 * Con altri giocatori dentro si può solo uscirne, dal dettaglio.
	 */
	const canDelete =
		booking.isCreator &&
		booking.matchId !== null &&
		booking.playerNames.length <= 1 &&
		booking.bookingDate - Date.now() > CANCEL_DEADLINE_MINUTES * 60 * 1000;

	const handleDelete = () => {
		const matchId = booking.matchId;
		if (!matchId) return;

		Alert.alert(
			"Eliminare la partita?",
			"Anche la prenotazione del campo viene annullata e lo slot torna disponibile agli altri.",
			[
				{ text: "No, torna indietro", style: "cancel" },
				{
					text: "Elimina",
					style: "destructive",
					onPress: async () => {
						setDeleting(true);
						try {
							await cancelMatch({ matchId: matchId as Id<"openMatches"> });
						} catch (err) {
							Alert.alert("Ops", convexErrorMessage(err));
						} finally {
							setDeleting(false);
						}
					},
				},
			],
		);
	};

	return (
		<SmoothView
			radius={18}
			smoothing={1}
			backgroundColor={theme.elevated}
			borderColor={theme.border}
			borderWidth={1}
			shadow={false}
			onPress={onPress}
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

					<View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
						{booking.open && (
							<Pill
								label={booking.isCreator ? "Partita aperta" : "Ti sei unito"}
								tinted
							/>
						)}
						{canDelete && (
							<Pressable
								onPress={handleDelete}
								disabled={deleting}
								hitSlop={10}
								accessibilityRole="button"
								accessibilityLabel="Elimina la partita"
								style={({ pressed }) => ({
									width: 30,
									height: 30,
									borderRadius: 999,
									alignItems: "center",
									justifyContent: "center",
									backgroundColor: theme.muted,
									opacity: pressed || deleting ? 0.6 : 1,
								})}
							>
								{deleting ? (
									<ActivityIndicator size="small" color={theme.textMuted} />
								) : (
									<IconSymbol name="trash" size={15} color={theme.danger} />
								)}
							</Pressable>
						)}
					</View>
				</View>
				{booking.court && (
					<View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
						<IconSymbol
							name="mappin.and.ellipse"
							size={14}
							color={theme.textMuted}
						/>
						<ThemedText style={{ fontSize: 13, color: theme.textMuted }}>
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
}
