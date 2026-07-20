import { api } from "@padel-sport/backend/convex/_generated/api";
import type { Id } from "@padel-sport/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import {
	ActivityIndicator,
	Alert,
	Platform,
	Pressable,
	ScrollView,
	View,
} from "react-native";
import { Avatar } from "@/components/open-match-card";
import SmoothView from "@/components/smooth-view";
import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import Pill from "@/components/ui/pill";
import { usePlayerGate } from "@/hooks/use-current-player";
import { useTheme } from "@/hooks/use-theme";
import {
	convexErrorMessage,
	formatLevel,
	formatLevelRange,
	formatMatchDay,
	formatMatchTime,
	joinModeMeta,
	type PlayerView,
} from "@/lib/format";

/**
 * Dettaglio di una partita aperta, presentato come sheet
 * (modal nativo su iOS, drawer su Android).
 */
export default function OpenMatchDetail() {
	const theme = useTheme();
	const router = useRouter();
	const { id } = useLocalSearchParams<{ id: string }>();
	const matchId = id as Id<"openMatches">;

	const match = useQuery(api.modules.openMatches.get.default, { matchId });
	const join = useMutation(api.modules.openMatches.join.default);
	const sendRequest = useMutation(api.modules.openMatches.requests.request);
	const { gate } = usePlayerGate();
	const [submitting, setSubmitting] = useState(false);

	if (match === undefined) {
		return (
			<View style={{ padding: 48, alignItems: "center" }}>
				<ActivityIndicator />
			</View>
		);
	}

	if (match === null) {
		return (
			<View style={{ padding: 24, alignItems: "center", gap: 8 }}>
				<ThemedText type="title">Partita non trovata</ThemedText>
				<ThemedText type="subtitle">
					Forse è stata chiusa o completata.
				</ThemedText>
			</View>
		);
	}

	const creator = match.creator;
	const freeSlots = match.maxPlayers - match.players.length;
	const emptySlots = Array.from({ length: Math.max(0, freeSlots) });
	const isDirect = match.joinMode === "direct";
	const { viewer } = match;

	const handleJoin = () =>
		gate(async () => {
			setSubmitting(true);
			try {
				if (isDirect) {
					await join({ matchId });
					Alert.alert(
						"Sei in partita! 🎾",
						`Ti sei unito alla partita di ${creator.name}. Ci vediamo in campo!`,
						[{ text: "OK", onPress: () => router.back() }],
					);
				} else {
					await sendRequest({ matchId });
					Alert.alert(
						"Richiesta inviata",
						`${creator.name} riceverà la tua richiesta di partecipazione e potrà accettarla o rifiutarla.`,
						[{ text: "OK" }],
					);
				}
			} catch (err) {
				Alert.alert("Ops", convexErrorMessage(err));
			} finally {
				setSubmitting(false);
			}
		});

	// Stato della CTA in base al viewer
	const cta = (() => {
		if (viewer.isMember) {
			return { label: "Sei in partita", icon: "checkmark.circle.fill", disabled: true };
		}
		if (match.status === "full" || freeSlots <= 0) {
			return { label: "Partita completa", icon: "xmark", disabled: true };
		}
		if (match.status === "cancelled") {
			return { label: "Partita annullata", icon: "xmark", disabled: true };
		}
		if (viewer.requestStatus === "pending") {
			return { label: "Richiesta inviata", icon: "envelope.fill", disabled: true };
		}
		if (viewer.levelOk === false) {
			return { label: "Livello non adatto", icon: "xmark", disabled: true };
		}
		return isDirect
			? { label: "Unisciti alla partita", icon: "bolt.fill", disabled: false }
			: { label: "Richiedi di partecipare", icon: "envelope.fill", disabled: false };
	})();

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
						{formatMatchDay(match.matchDate)}, {formatMatchTime(match.matchDate)}
					</ThemedText>
					{match.court && (
						<View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
							<IconSymbol
								name="mappin.and.ellipse"
								size={16}
								color={theme.textMuted}
							/>
							<ThemedText type="subtitle" style={{ fontSize: 15 }}>
								{match.court}
							</ThemedText>
						</View>
					)}
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
					value={formatLevelRange(match.levelMin, match.levelMax)}
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
				<SectionLabel>
					Giocatori ({match.players.length}/{match.maxPlayers})
				</SectionLabel>
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

			{/* Richieste pendenti, visibili solo al creatore */}
			{viewer.isCreator && match.joinMode === "request" && (
				<PendingRequests matchId={matchId} />
			)}

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
						<ThemedText style={{ padding: 14, fontSize: 15, lineHeight: 22 }}>
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
				backgroundColor={cta.disabled ? theme.muted : theme.tint}
				onPress={cta.disabled || submitting ? undefined : handleJoin}
				style={{
					height: 56,
					flexDirection: "row",
					alignItems: "center",
					justifyContent: "center",
					gap: 8,
					opacity: submitting ? 0.7 : 1,
				}}
			>
				{submitting ? (
					<ActivityIndicator color={theme.tintForeground} />
				) : (
					<>
						<IconSymbol
							name={cta.icon}
							size={18}
							color={cta.disabled ? theme.textMuted : theme.tintForeground}
						/>
						<ThemedText
							style={{
								fontSize: 17,
								fontWeight: "600",
								color: cta.disabled ? theme.textMuted : theme.tintForeground,
							}}
						>
							{cta.label}
						</ThemedText>
					</>
				)}
			</SmoothView>
		</ScrollView>
	);
}

/** Richieste di partecipazione pendenti con azioni accetta/rifiuta. */
function PendingRequests({ matchId }: { matchId: Id<"openMatches"> }) {
	const theme = useTheme();
	const requests = useQuery(api.modules.openMatches.requests.listForMatch, {
		matchId,
	});
	const respond = useMutation(api.modules.openMatches.requests.respond);

	if (!requests || requests.length === 0) return null;

	const handleRespond = async (
		requestId: Id<"joinRequests">,
		accept: boolean,
	) => {
		try {
			await respond({ requestId, accept });
		} catch (err) {
			Alert.alert("Ops", convexErrorMessage(err));
		}
	};

	return (
		<View style={{ gap: 10 }}>
			<SectionLabel>Richieste di partecipazione</SectionLabel>
			<View style={{ gap: 8 }}>
				{requests.map((request) => (
					<SmoothView
						key={request.id}
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
							<Avatar url={request.player.avatarUrl} size={38} />
							<View style={{ flex: 1 }}>
								<ThemedText style={{ fontSize: 15, fontWeight: "600" }}>
									{request.player.name}
								</ThemedText>
								<ThemedText
									style={{ fontSize: 12, lineHeight: 16, color: theme.textMuted }}
								>
									Liv. {formatLevel(request.player.level)}
								</ThemedText>
							</View>
							<Pressable
								onPress={() => handleRespond(request.id, false)}
								hitSlop={8}
								style={{
									backgroundColor: theme.muted,
									borderRadius: 999,
									padding: 10,
								}}
							>
								<IconSymbol name="xmark" size={16} color={theme.textMuted} />
							</Pressable>
							<Pressable
								onPress={() => handleRespond(request.id, true)}
								hitSlop={8}
								style={{
									backgroundColor: theme.tint,
									borderRadius: 999,
									padding: 10,
								}}
							>
								<IconSymbol
									name="checkmark"
									size={16}
									color={theme.tintForeground}
								/>
							</Pressable>
						</View>
					</SmoothView>
				))}
			</View>
		</View>
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
				<ThemedText style={{ fontSize: 18, lineHeight: 24, fontWeight: "700" }}>
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
	player: PlayerView;
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
				<Avatar url={player.avatarUrl} size={38} />
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
