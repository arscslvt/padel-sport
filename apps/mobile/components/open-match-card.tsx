import { Image } from "expo-image";
import { View } from "react-native";
import SmoothView from "@/components/smooth-view";
import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import Pill from "@/components/ui/pill";
import {
	formatLevelRange,
	formatMatchDate,
	getMatchCreator,
	joinModeMeta,
	matchesPlayerLevel,
	type OpenMatch,
} from "@/constants/mock-data";
import { useTheme } from "@/hooks/use-theme";

interface OpenMatchCardProps {
	match: OpenMatch;
	onPress: () => void;
}

/** Card verticale di una partita aperta in cerca di compagni di gioco. */
export default function OpenMatchCard({ match, onPress }: OpenMatchCardProps) {
	const theme = useTheme();
	const creator = getMatchCreator(match);
	const freeSlots = match.maxPlayers - match.players.length;
	// Evidenzia le partite adatte al livello dell'utente
	const forYourLevel = matchesPlayerLevel(match);

	return (
		<SmoothView
			radius={22}
			smoothing={1}
			onPress={onPress}
			backgroundColor={theme.elevated}
			borderColor={forYourLevel ? theme.tint : theme.border}
			borderWidth={forYourLevel ? 1.5 : 1}
		>
			<View style={{ padding: 16, gap: 14 }}>
				{/* Creatore + modalità di accesso */}
				<View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
					<Image
						source={creator.avatarUrl}
						style={{
							width: 42,
							height: 42,
							borderRadius: 999,
							borderWidth: 1,
							borderColor: theme.border,
						}}
					/>
					<View style={{ flex: 1 }}>
						<ThemedText
							style={{ fontSize: 16, fontWeight: "600", lineHeight: 22 }}
							numberOfLines={1}
						>
							{creator.name}
						</ThemedText>
						<ThemedText
							style={{ fontSize: 13, lineHeight: 18, color: theme.textMuted }}
							numberOfLines={1}
						>
							cerca {freeSlots === 1 ? "1 compagno" : `${freeSlots} compagni`}
						</ThemedText>
					</View>
					<Pill
						label={joinModeMeta[match.joinMode].label}
						icon={joinModeMeta[match.joinMode].icon}
						tinted={match.joinMode === "direct"}
					/>
				</View>

				{/* Data e club */}
				<View style={{ gap: 6 }}>
					<View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
						<IconSymbol name="calendar" size={16} color={theme.textMuted} />
						<ThemedText style={{ fontSize: 14, lineHeight: 20 }}>
							{formatMatchDate(match.dateISO)}
						</ThemedText>
					</View>
					{match.court && (
						<View
							style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
						>
							<IconSymbol
								name="mappin.and.ellipse"
								size={16}
								color={theme.textMuted}
							/>
							<ThemedText
								style={{ fontSize: 14, lineHeight: 20, color: theme.textMuted }}
								numberOfLines={1}
							>
								{match.court}
							</ThemedText>
						</View>
					)}
				</View>

				{/* Giocatori presenti + livello richiesto */}
				<View
					style={{
						flexDirection: "row",
						alignItems: "center",
						justifyContent: "space-between",
					}}
				>
					<View style={{ flexDirection: "row", alignItems: "center" }}>
						{match.players.map((player, index) => (
							<Image
								key={player.id}
								source={player.avatarUrl}
								style={{
									width: 28,
									height: 28,
									borderRadius: 999,
									borderWidth: 2,
									borderColor: theme.elevated,
									marginLeft: index === 0 ? 0 : -10,
								}}
							/>
						))}
						<ThemedText
							style={{
								fontSize: 13,
								lineHeight: 18,
								color: theme.textMuted,
								marginLeft: 8,
							}}
						>
							{match.players.length}/{match.maxPlayers} giocatori
						</ThemedText>
					</View>
					<Pill
						label={
							forYourLevel
								? `Liv. ${formatLevelRange(match.requiredLevel)} · Per te`
								: `Liv. ${formatLevelRange(match.requiredLevel)}`
						}
						icon={forYourLevel ? "checkmark.circle.fill" : undefined}
						tinted={forYourLevel}
					/>
				</View>
			</View>
		</SmoothView>
	);
}
