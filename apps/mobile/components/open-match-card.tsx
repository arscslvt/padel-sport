import { Image } from "expo-image";
import { View } from "react-native";
import SmoothView from "@/components/smooth-view";
import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import Pill from "@/components/ui/pill";
import { useTheme } from "@/hooks/use-theme";
import {
	formatLevelRange,
	formatMatchDate,
	joinModeMeta,
	type OpenMatchView,
} from "@/lib/format";

interface OpenMatchCardProps {
	match: OpenMatchView;
	/** Livello del giocatore corrente, per evidenziare le partite adatte */
	myLevel?: number;
	onPress: () => void;
}

/** Card verticale di una partita aperta in cerca di compagni di gioco. */
export default function OpenMatchCard({
	match,
	myLevel,
	onPress,
}: OpenMatchCardProps) {
	const theme = useTheme();
	const creator = match.creator;
	const freeSlots = match.maxPlayers - match.players.length;
	// Evidenzia le partite adatte al livello dell'utente
	const forYourLevel =
		myLevel !== undefined &&
		myLevel >= match.levelMin &&
		myLevel <= match.levelMax;

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
					<Avatar url={creator?.avatarUrl} size={42} />
					<View style={{ flex: 1 }}>
						<ThemedText
							style={{ fontSize: 16, fontWeight: "600", lineHeight: 22 }}
							numberOfLines={1}
						>
							{creator?.name ?? "Giocatore"}
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

				{/* Data e campo */}
				<View style={{ gap: 6 }}>
					<View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
						<IconSymbol name="calendar" size={16} color={theme.textMuted} />
						<ThemedText style={{ fontSize: 14, lineHeight: 20 }}>
							{formatMatchDate(match.matchDate)}
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
							<View
								key={player.id}
								style={{ marginLeft: index === 0 ? 0 : -10 }}
							>
								<Avatar url={player.avatarUrl} size={28} borderWidth={2} />
							</View>
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
								? `Liv. ${formatLevelRange(match.levelMin, match.levelMax)} · Per te`
								: `Liv. ${formatLevelRange(match.levelMin, match.levelMax)}`
						}
						icon={forYourLevel ? "checkmark.circle.fill" : undefined}
						tinted={forYourLevel}
					/>
				</View>
			</View>
		</SmoothView>
	);
}

/** Avatar con fallback a un cerchio neutro quando il giocatore non ha immagine. */
export function Avatar({
	url,
	size,
	borderWidth = 1,
}: {
	url?: string;
	size: number;
	borderWidth?: number;
}) {
	const theme = useTheme();

	if (!url) {
		return (
			<View
				style={{
					width: size,
					height: size,
					borderRadius: 999,
					borderWidth,
					borderColor: theme.elevated,
					backgroundColor: theme.muted,
					alignItems: "center",
					justifyContent: "center",
				}}
			>
				<IconSymbol
					name="person.fill"
					size={size * 0.5}
					color={theme.textMuted}
				/>
			</View>
		);
	}

	return (
		<Image
			source={url}
			style={{
				width: size,
				height: size,
				borderRadius: 999,
				borderWidth,
				borderColor: theme.elevated,
			}}
		/>
	);
}
