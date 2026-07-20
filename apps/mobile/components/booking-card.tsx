import type { MyBookingView } from "@padel-sport/backend/convex/modules/openMatches/my";
import { View } from "react-native";
import { useTheme } from "@/hooks/use-theme";
import { formatMatchDate } from "@/lib/format";
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
					{booking.open && (
						<Pill
							label={booking.isCreator ? "Partita aperta" : "Ti sei unito"}
							tinted
						/>
					)}
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
