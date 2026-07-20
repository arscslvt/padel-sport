import { api } from "@padel-sport/backend/convex/_generated/api";
import { useMutation } from "convex/react";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
	ActivityIndicator,
	Alert,
	Platform,
	Pressable,
	ScrollView,
	Switch,
	TextInput,
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
	type JoinMode,
	joinModeMeta,
} from "@/lib/format";

interface LevelRange {
	min: number;
	max: number;
}

const LEVEL_RANGES: LevelRange[] = [
	{ min: 1.0, max: 1.5 },
	{ min: 2.0, max: 2.5 },
	{ min: 3.0, max: 3.5 },
	{ min: 4.0, max: 5.0 },
];

const TIME_SLOTS = ["09:00", "10:30", "12:00", "17:00", "18:30", "20:00"];

const MAX_PLAYERS = 4;

function nextDays(count: number) {
	return Array.from({ length: count }, (_, i) => {
		const d = new Date();
		d.setDate(d.getDate() + i);
		const label =
			i === 0
				? "Oggi"
				: i === 1
					? "Domani"
					: d.toLocaleDateString("it-IT", { weekday: "short", day: "numeric" });
		return { date: d, label: label.charAt(0).toUpperCase() + label.slice(1) };
	});
}

/**
 * Flusso di prenotazione / creazione di una partita aperta,
 * presentato come sheet (modal nativo su iOS, drawer su Android).
 */
export default function BookMatch() {
	const theme = useTheme();
	const router = useRouter();
	const { player, gate } = usePlayerGate();
	const createBooking = useMutation(api.modules.openMatches.create.default);
	const [submitting, setSubmitting] = useState(false);

	const days = nextDays(7);

	// Il livello di default è quello dell'utente creatore
	const defaultRangeIndex = Math.max(
		0,
		player
			? LEVEL_RANGES.findIndex(
					(r) => player.level >= r.min - 0.5 && player.level <= r.max,
				)
			: 1,
	);

	const [levelIndex, setLevelIndex] = useState(defaultRangeIndex);
	const [dayIndex, setDayIndex] = useState(0);
	const [timeSlot, setTimeSlot] = useState<string | null>(null);
	const [notes, setNotes] = useState("");
	const [keepOpen, setKeepOpen] = useState(true);
	const [joinMode, setJoinMode] = useState<JoinMode>("direct");

	// L'unico giocatore certo è il creatore; gli altri si uniscono dopo
	const freeSlots = MAX_PLAYERS - 1;

	const handleConfirm = () =>
		gate(async () => {
			if (!timeSlot) {
				Alert.alert("Manca l'orario", "Scegli un orario per la partita.");
				return;
			}

			const [hours, minutes] = timeSlot.split(":").map(Number);
			const bookingDate = new Date(days[dayIndex].date);
			bookingDate.setHours(hours, minutes, 0, 0);

			const range = LEVEL_RANGES[levelIndex];

			setSubmitting(true);
			try {
				await createBooking({
					bookingDate: bookingDate.getTime(),
					levelMin: range.min,
					levelMax: range.max,
					open: keepOpen,
					joinMode: keepOpen ? joinMode : undefined,
					notes: notes.trim() || undefined,
				});

				const summary = [
					`${days[dayIndex].label} alle ${timeSlot}`,
					`Livello ${formatLevelRange(range.min, range.max)}`,
					keepOpen
						? `Partita aperta (${joinModeMeta[joinMode].label.toLowerCase()})`
						: "Partita privata",
				].join("\n");

				Alert.alert("Prenotazione confermata 🎾", summary, [
					{ text: "OK", onPress: () => router.back() },
				]);
			} catch (err) {
				Alert.alert("Ops", convexErrorMessage(err));
			} finally {
				setSubmitting(false);
			}
		});

	return (
		<ScrollView
			style={{ flex: 1, backgroundColor: theme.background }}
			contentContainerStyle={{ padding: 20, paddingBottom: 40, gap: 24 }}
			keyboardShouldPersistTaps="handled"
		>
			{/* Intestazione */}
			<View style={{ flexDirection: "row", alignItems: "flex-start" }}>
				<View style={{ flex: 1, gap: 4 }}>
					<ThemedText type="title">Prenota una partita</ThemedText>
					<ThemedText type="subtitle" style={{ fontSize: 15 }}>
						Scegli data e livello, poi riunisci la squadra.
					</ThemedText>
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

			{/* Livello richiesto */}
			<Section
				title="Livello richiesto"
				subtitle={
					player
						? `Di default il tuo livello (${formatLevel(player.level)})`
						: "Scegli il livello dei giocatori che cerchi"
				}
			>
				<View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
					{LEVEL_RANGES.map((range, index) => (
						<SelectChip
							key={range.min}
							label={formatLevelRange(range.min, range.max)}
							selected={index === levelIndex}
							onPress={() => setLevelIndex(index)}
						/>
					))}
				</View>
			</Section>

			{/* Data */}
			<Section title="Data e orario">
				<ScrollView
					horizontal
					showsHorizontalScrollIndicator={false}
					contentContainerStyle={{ gap: 8 }}
					style={{ marginHorizontal: -20, paddingHorizontal: 20 }}
				>
					{days.map((day, index) => (
						<SelectChip
							key={day.label}
							label={day.label}
							selected={index === dayIndex}
							onPress={() => setDayIndex(index)}
						/>
					))}
				</ScrollView>
				<View
					style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 }}
				>
					{TIME_SLOTS.map((slot) => (
						<SelectChip
							key={slot}
							label={slot}
							selected={slot === timeSlot}
							onPress={() => setTimeSlot(slot)}
						/>
					))}
				</View>
			</Section>

			{/* Note */}
			<Section title="Note" subtitle="Facoltative, visibili agli altri giocatori">
				<SmoothView
					radius={18}
					smoothing={1}
					backgroundColor={theme.elevated}
					borderColor={theme.border}
					borderWidth={1}
					shadow={false}
				>
					<TextInput
						value={notes}
						onChangeText={setNotes}
						placeholder="Es. partita amichevole, ritmo tranquillo…"
						placeholderTextColor={theme.textMuted}
						multiline
						style={{
							minHeight: 80,
							padding: 14,
							fontSize: 15,
							color: theme.text,
							textAlignVertical: "top",
						}}
					/>
				</SmoothView>
			</Section>

			{/* Giocatori già presenti */}
			<Section
				title={`Giocatori (1/${MAX_PLAYERS})`}
				subtitle="Gli inviti diretti arriveranno con un prossimo aggiornamento"
			>
				<View style={{ flexDirection: "row", gap: 10 }}>
					<View style={{ alignItems: "center", gap: 6 }}>
						<Avatar url={player?.avatarUrl} size={52} />
						<ThemedText style={{ fontSize: 12, color: theme.textMuted }}>
							Tu
						</ThemedText>
					</View>
					{Array.from({ length: freeSlots }).map((_, index) => (
						<Pressable
							key={`slot-${index}`}
							onPress={() =>
								Alert.alert("[MVP]", "Gli inviti diretti arriveranno presto.")
							}
							style={{ alignItems: "center", gap: 6 }}
						>
							<View
								style={{
									width: 52,
									height: 52,
									borderRadius: 999,
									borderWidth: 1,
									borderStyle: "dashed",
									borderColor: theme.border,
									backgroundColor: theme.muted,
									alignItems: "center",
									justifyContent: "center",
								}}
							>
								<IconSymbol name="plus" size={18} color={theme.textMuted} />
							</View>
							<ThemedText style={{ fontSize: 12, color: theme.textMuted }}>
								Invita
							</ThemedText>
						</Pressable>
					))}
				</View>
			</Section>

			{/* Partita aperta: proposta quando non si raggiungono i 4 giocatori */}
			{freeSlots > 0 && (
				<SmoothView
					radius={20}
					smoothing={1}
					backgroundColor={theme.elevated}
					borderColor={theme.border}
					borderWidth={1}
					shadow={false}
				>
					<View style={{ padding: 16, gap: 12 }}>
						<View
							style={{ flexDirection: "row", alignItems: "center", gap: 12 }}
						>
							<View style={{ flex: 1, gap: 2 }}>
								<ThemedText style={{ fontSize: 16, fontWeight: "600" }}>
									Lascia la partita aperta
								</ThemedText>
								<ThemedText
									style={{ fontSize: 13, lineHeight: 18, color: theme.textMuted }}
								>
									Mancano {freeSlots} giocatori: rendila visibile a chi cerca
									una partita.
								</ThemedText>
							</View>
							<Switch
								value={keepOpen}
								onValueChange={setKeepOpen}
								trackColor={{ true: theme.tint }}
							/>
						</View>

						{keepOpen && (
							<View style={{ gap: 8 }}>
								{(Object.keys(joinModeMeta) as JoinMode[]).map((mode) => (
									<Pressable
										key={mode}
										onPress={() => setJoinMode(mode)}
										style={{
											flexDirection: "row",
											alignItems: "center",
											gap: 10,
											padding: 12,
											borderRadius: 16,
											borderWidth: 1,
											borderColor:
												joinMode === mode ? theme.tint : theme.border,
											backgroundColor:
												joinMode === mode ? theme.muted : "transparent",
										}}
									>
										<IconSymbol
											name={joinModeMeta[mode].icon}
											size={18}
											color={joinMode === mode ? theme.tint : theme.textMuted}
										/>
										<View style={{ flex: 1 }}>
											<ThemedText style={{ fontSize: 15, fontWeight: "600" }}>
												{joinModeMeta[mode].label}
											</ThemedText>
											<ThemedText
												style={{
													fontSize: 12,
													lineHeight: 16,
													color: theme.textMuted,
												}}
											>
												{joinModeMeta[mode].description}
											</ThemedText>
										</View>
										{joinMode === mode && (
											<IconSymbol
												name="checkmark.circle.fill"
												size={20}
												color={theme.tint}
											/>
										)}
									</Pressable>
								))}
							</View>
						)}
					</View>
				</SmoothView>
			)}

			{/* CTA */}
			<SmoothView
				radius={20}
				smoothing={1}
				backgroundColor={theme.tint}
				onPress={submitting ? undefined : handleConfirm}
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
						<IconSymbol name="calendar" size={18} color={theme.tintForeground} />
						<ThemedText
							style={{
								fontSize: 17,
								fontWeight: "600",
								color: theme.tintForeground,
							}}
						>
							Conferma prenotazione
						</ThemedText>
					</>
				)}
			</SmoothView>
		</ScrollView>
	);
}

function Section({
	title,
	subtitle,
	children,
}: {
	title: string;
	subtitle?: string;
	children: React.ReactNode;
}) {
	const theme = useTheme();
	return (
		<View style={{ gap: 10 }}>
			<View style={{ gap: 2 }}>
				<ThemedText
					style={{
						fontSize: 14,
						fontWeight: "600",
						color: theme.textMuted,
						textTransform: "uppercase",
						letterSpacing: 0.4,
					}}
				>
					{title}
				</ThemedText>
				{subtitle && (
					<ThemedText
						style={{ fontSize: 13, lineHeight: 18, color: theme.textMuted }}
					>
						{subtitle}
					</ThemedText>
				)}
			</View>
			{children}
		</View>
	);
}

function SelectChip({
	label,
	selected,
	onPress,
}: {
	label: string;
	selected: boolean;
	onPress: () => void;
}) {
	const theme = useTheme();
	return (
		<Pressable
			onPress={onPress}
			style={{
				paddingHorizontal: 14,
				paddingVertical: 8,
				borderRadius: 999,
				borderWidth: 1,
				borderColor: selected ? theme.tint : theme.border,
				backgroundColor: selected ? theme.tint : theme.elevated,
			}}
		>
			<ThemedText
				style={{
					fontSize: 14,
					lineHeight: 18,
					fontWeight: "500",
					color: selected ? theme.tintForeground : theme.text,
				}}
			>
				{label}
			</ThemedText>
		</Pressable>
	);
}
