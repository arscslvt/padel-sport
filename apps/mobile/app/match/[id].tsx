import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Alert, Platform, Pressable, ScrollView, View } from "react-native";
import SmoothView from "@/components/smooth-view";
import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import Pill from "@/components/ui/pill";
import {
	formatLevel,
	formatLevelRange,
	formatMatchDay,
	formatMatchTime,
	getMatchCreator,
	getOpenMatch,
	joinModeMeta,
	type Player,
} from "@/constants/mock-data";
import { useTheme } from "@/hooks/use-theme";

/**
 * Dettaglio di una partita aperta, presentato come sheet
 * (modal nativo su iOS, drawer su Android).
 */
export default function OpenMatchDetail() {
	const theme = useTheme();
	const router = useRouter();
	const { id } = useLocalSearchParams<{ id: string }>();
	const match = getOpenMatch(id);

	if (!match) {
		return (
			<View style={{ padding: 24, alignItems: "center", gap: 8 }}>
				<ThemedText type="title">Partita non trovata</ThemedText>
				<ThemedText type="subtitle">
					Forse è stata chiusa o completata.
				</ThemedText>
			</View>
		);
	}

	const creator = getMatchCreator(match);
	const freeSlots = match.maxPlayers - match.players.length;
	const emptySlots = Array.from({ length: freeSlots });
	const isDirect = match.joinMode === "direct";

	const handleJoin = () => {
		if (isDirect) {
			Alert.alert(
				"Sei in partita! 🎾",
				`Ti sei unito alla partita di ${creator.name}. Ci vediamo in campo!`,
				[{ text: "OK", onPress: () => router.back() }],
			);
		} else {
			Alert.alert(
				"Richiesta inviata",
				`${creator.name} riceverà la tua richiesta di partecipazione e potrà accettarla o rifiutarla.`,
				[{ text: "OK", onPress: () => router.back() }],
			);
		}
	};

	return (
		<ScrollView
			style={{ flex: 1, backgroundColor: theme.background }}
			contentContainerStyle={{ padding: 20, paddingBottom: 40, gap: 20 }}
		>
			{/* Intestazione */}
			<View style={{ flexDirection: "row", alignItems: "flex-start" }}>
				<View style={{ flex: 1, gap: 8 }}>
					<Pill
						label={joinModeMeta[match.joinMode].label}
						icon={joinModeMeta[match.joinMode].icon}
						tinted={isDirect}
					/>
					<ThemedText type="title">
						{formatMatchDay(match.dateISO)}, {formatMatchTime(match.dateISO)}
					</ThemedText>
					<View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
						<IconSymbol
							name="mappin.and.ellipse"
							size={16}
							color={theme.textMuted}
						/>
						<ThemedText type="subtitle" style={{ fontSize: 15 }}>
							{match.club}
							{match.court ? ` · ${match.court}` : ""}
						</ThemedText>
					</View>
				</View>
				{Platform.OS !== "ios" && (
					<Pressable
						onPress={() => router.back()}
						hitSlop={8}
						style={{
							backgroundColor: theme.muted,
							borderRadius: 999,
							padding: 8,
						}}
					>
						<IconSymbol name="xmark" size={18} color={theme.textMuted} />
					</Pressable>
				)}
			</View>

			{/* Info principali */}
			<View style={{ flexDirection: "row", gap: 10 }}>
				<InfoBox
					label="Livello richiesto"
					value={formatLevelRange(match.requiredLevel)}
				/>
				<InfoBox
					label="Posti liberi"
					value={`${freeSlots} su ${match.maxPlayers}`}
				/>
			</View>

			{/* Organizzatore */}
			<View style={{ gap: 10 }}>
				<SectionLabel>Organizzata da</SectionLabel>
				<PlayerRow player={creator} highlight="Creatore della partita" />
			</View>

			{/* Giocatori */}
			<View style={{ gap: 10 }}>
				<SectionLabel>Giocatori ({match.players.length}/{match.maxPlayers})</SectionLabel>
				<View style={{ gap: 8 }}>
					{match.players
						.filter((p) => p.id !== creator.id)
						.map((player) => (
							<PlayerRow key={player.id} player={player} />
						))}
					{emptySlots.map((_, index) => (
						<EmptySlotRow key={`slot-${index}`} />
					))}
				</View>
			</View>

			{/* Note */}
			{match.notes && (
				<View style={{ gap: 10 }}>
					<SectionLabel>Note</SectionLabel>
					<SmoothView
						radius={18}
						smoothing={1}
						backgroundColor={theme.muted}
						shadow={false}
					>
						<ThemedText
							style={{ padding: 14, fontSize: 15, lineHeight: 22 }}
						>
							{match.notes}
						</ThemedText>
					</SmoothView>
				</View>
			)}

			{/* Come funziona l'accesso */}
			<ThemedText
				style={{ fontSize: 13, lineHeight: 18, color: theme.textMuted }}
			>
				{joinModeMeta[match.joinMode].description}
			</ThemedText>

			{/* CTA */}
			<SmoothView
				radius={20}
				smoothing={1}
				backgroundColor={theme.tint}
				onPress={handleJoin}
				style={{
					height: 56,
					flexDirection: "row",
					alignItems: "center",
					justifyContent: "center",
					gap: 8,
				}}
			>
				<IconSymbol
					name={isDirect ? "bolt.fill" : "envelope.fill"}
					size={18}
					color={theme.tintForeground}
				/>
				<ThemedText
					style={{
						fontSize: 17,
						fontWeight: "600",
						color: theme.tintForeground,
					}}
				>
					{isDirect ? "Unisciti alla partita" : "Richiedi di partecipare"}
				</ThemedText>
			</SmoothView>
		</ScrollView>
	);
}

function SectionLabel({ children }: { children: React.ReactNode }) {
	const theme = useTheme();
	return (
		<ThemedText
			style={{
				fontSize: 14,
				fontWeight: "600",
				color: theme.textMuted,
				textTransform: "uppercase",
				letterSpacing: 0.4,
			}}
		>
			{children}
		</ThemedText>
	);
}

function InfoBox({ label, value }: { label: string; value: string }) {
	const theme = useTheme();
	return (
		<SmoothView
			radius={18}
			smoothing={1}
			backgroundColor={theme.elevated}
			borderColor={theme.border}
			borderWidth={1}
			shadow={false}
			style={{ flex: 1 }}
		>
			<View style={{ padding: 14, gap: 4 }}>
				<ThemedText
					style={{ fontSize: 13, lineHeight: 18, color: theme.textMuted }}
				>
					{label}
				</ThemedText>
				<ThemedText
					style={{ fontSize: 18, lineHeight: 24, fontWeight: "700" }}
				>
					{value}
				</ThemedText>
			</View>
		</SmoothView>
	);
}

function PlayerRow({
	player,
	highlight,
}: {
	player: Player;
	highlight?: string;
}) {
	const theme = useTheme();
	return (
		<SmoothView
			radius={18}
			smoothing={1}
			backgroundColor={theme.elevated}
			borderColor={theme.border}
			borderWidth={1}
			shadow={false}
		>
			<View
				style={{
					flexDirection: "row",
					alignItems: "center",
					gap: 10,
					padding: 12,
				}}
			>
				<Image
					source={player.avatarUrl}
					style={{
						width: 38,
						height: 38,
						borderRadius: 999,
						borderWidth: 1,
						borderColor: theme.border,
					}}
				/>
				<View style={{ flex: 1 }}>
					<ThemedText style={{ fontSize: 15, fontWeight: "600" }}>
						{player.name}
					</ThemedText>
					{highlight && (
						<ThemedText
							style={{ fontSize: 12, lineHeight: 16, color: theme.textMuted }}
						>
							{highlight}
						</ThemedText>
					)}
				</View>
				<Pill label={`Liv. ${formatLevel(player.level)}`} />
			</View>
		</SmoothView>
	);
}

function EmptySlotRow() {
	const theme = useTheme();
	return (
		<View
			style={{
				flexDirection: "row",
				alignItems: "center",
				gap: 10,
				padding: 12,
				borderWidth: 1,
				borderStyle: "dashed",
				borderColor: theme.border,
				borderRadius: 18,
			}}
		>
			<View
				style={{
					width: 38,
					height: 38,
					borderRadius: 999,
					backgroundColor: theme.muted,
					alignItems: "center",
					justifyContent: "center",
				}}
			>
				<IconSymbol name="plus" size={16} color={theme.textMuted} />
			</View>
			<ThemedText style={{ fontSize: 15, color: theme.textMuted }}>
				Posto libero
			</ThemedText>
		</View>
	);
}
