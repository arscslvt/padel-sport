import { api } from "@padel-sport/backend/convex/_generated/api";
import { useMutation } from "convex/react";
import { useRouter } from "expo-router";
import { useMemo, useRef, useState } from "react";
import {
	Alert,
	type LayoutChangeEvent,
	Platform,
	Pressable,
	ScrollView,
	StyleSheet,
	View,
} from "react-native";
import Animated, {
	useAnimatedKeyboard,
	useAnimatedStyle,
	useSharedValue,
	withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StepProgress, selectionFeedback } from "@/components/book/primitives";
import StepLevel from "@/components/book/step-level";
import StepPlayers from "@/components/book/step-players";
import StepSchedule from "@/components/book/step-schedule";
import StepSummary from "@/components/book/step-summary";
import { ThemedText } from "@/components/themed-text";
import { Button } from "@/components/ui/button";
import { IconSymbol } from "@/components/ui/icon-symbol";
import ProgressiveBlur from "@/components/ui/progressive-blur";
import { usePlayerGate } from "@/hooks/use-current-player";
import { useTheme } from "@/hooks/use-theme";
import {
	availableSlots,
	bookableDays,
	combineDateAndTime,
	findLevelRangeIndex,
	formatDayLong,
	formatSlotRange,
	LEVEL_RANGES,
} from "@/lib/booking";
import { convexErrorMessage, type JoinMode } from "@/lib/format";

const CONTENT_PADDING = 20;

/** I passi del flusso, nell'ordine in cui vengono presentati. */
const STEPS = [
	{
		title: "Che livello cerchi?",
		subtitle: "Di default usiamo il tuo, ma puoi cambiarlo.",
	},
	{
		title: "Quando vuoi giocare?",
		subtitle: "Scegli il giorno e l'orario di inizio.",
	},
	{
		title: "Con chi giochi?",
		subtitle: "Riunisci la squadra o lascia la partita aperta.",
	},
	{
		title: "Tutto pronto?",
		subtitle: "Controlla il riepilogo e conferma la prenotazione.",
	},
] as const;

/**
 * Etichetta dell'azione principale: dice sempre cosa succede toccandola,
 * anche quando manca ancora una scelta per proseguire.
 */
function primaryLabel(step: number, confirmsLevel: boolean, hasTime: boolean) {
	if (step === 0) return confirmsLevel ? "Conferma livello" : "Continua";
	if (step === 1) return hasTime ? "Continua" : "Scegli un orario";
	if (step === STEPS.length - 1) return "Conferma prenotazione";
	return "Continua";
}

/**
 * Scelte accumulate durante il flusso. Livello e giorno restano `null` finché
 * l'utente non li tocca: fino a quel momento seguono i valori proposti
 * (il livello del profilo, che arriva in modo asincrono, e il primo giorno
 * con orari ancora liberi).
 */
interface BookingDraft {
	levelIndex: number | null;
	dayIndex: number | null;
	time: string | null;
	keepOpen: boolean;
	joinMode: JoinMode;
	notes: string;
}

/**
 * Flusso di prenotazione / creazione di una partita aperta, presentato come
 * sheet (modal nativo su iOS, drawer su Android) e diviso in quattro passi:
 * livello, data e orario, giocatori, riepilogo.
 */
export default function BookMatch() {
	const theme = useTheme();
	const router = useRouter();
	const { player, gate } = usePlayerGate();
	const createBooking = useMutation(api.modules.openMatches.create.default);

	const insets = useSafeAreaInsets();
	const scrollRef = useRef<ScrollView>(null);
	const [submitting, setSubmitting] = useState(false);
	const [step, setStep] = useState(0);

	// Le barre sono sovrapposte al contenuto: misurandole sappiamo di quanto
	// scostare il contenuto perché non finisca sotto al blur. Le stime iniziali
	// evitano il salto al primo layout e cambiano col numero di righe del titolo.
	const [barHeights, setBarHeights] = useState({ header: 152, footer: 110 });
	const measureBar =
		(bar: "header" | "footer") => (event: LayoutChangeEvent) => {
			const { height } = event.nativeEvent.layout;
			setBarHeights((current) =>
				Math.round(current[bar]) === Math.round(height)
					? current
					: { ...current, [bar]: height },
			);
		};
	const [draft, setDraft] = useState<BookingDraft>({
		levelIndex: null,
		dayIndex: null,
		time: null,
		keepOpen: true,
		joinMode: "direct",
		notes: "",
	});

	// Dissolvenza del contenuto a ogni cambio di passo: è uno stile animato
	// normale e non una layout animation, che dentro il form sheet
	// posizionerebbe male il contenuto.
	const stepOpacity = useSharedValue(1);
	const stepStyle = useAnimatedStyle(() => ({ opacity: stepOpacity.value }));

	// La barra in basso sale con la tastiera (nota dell'ultimo passo): è una
	// traslazione, quindi non tocca il layout del foglio.
	const keyboard = useAnimatedKeyboard();
	const footerStyle = useAnimatedStyle(() => ({
		transform: [
			{ translateY: -Math.max(keyboard.height.value - insets.bottom, 0) },
		],
	}));

	const days = useMemo(() => bookableDays(), []);
	const slotsByDay = useMemo(
		() => days.map((day) => availableSlots(day.date)),
		[days],
	);

	const suggestedLevelIndex = findLevelRangeIndex(player?.level);
	const levelIndex = draft.levelIndex ?? suggestedLevelIndex;
	// A fine giornata gli orari di oggi sono esauriti: partiamo dal primo utile
	const suggestedDayIndex = Math.max(
		0,
		slotsByDay.findIndex((slots) => slots.length > 0),
	);
	const dayIndex = draft.dayIndex ?? suggestedDayIndex;

	const patch = (values: Partial<BookingDraft>) =>
		setDraft((current) => ({ ...current, ...values }));

	const isLastStep = step === STEPS.length - 1;
	// L'orario è l'unica scelta senza un valore di default sensato
	const canContinue = step !== 1 || draft.time !== null;

	const goTo = (target: number) => {
		selectionFeedback();
		// I passi hanno altezze molto diverse: ognuno riparte dall'inizio
		scrollRef.current?.scrollTo({ y: 0, animated: false });
		stepOpacity.value = 0;
		stepOpacity.value = withTiming(1, { duration: 220 });
		setStep(target);
	};

	const goBack = () => {
		if (step === 0) {
			router.back();
			return;
		}
		goTo(step - 1);
	};

	/** Cambiando giorno l'orario scelto potrebbe non esserci più. */
	const selectDay = (index: number) => {
		const stillAvailable = slotsByDay[index].some(
			(slot) => slot.time === draft.time,
		);
		patch({ dayIndex: index, time: stillAvailable ? draft.time : null });
	};

	const handleConfirm = () =>
		gate(async () => {
			const time = draft.time;
			if (!time) {
				goTo(1);
				return;
			}

			const range = LEVEL_RANGES[levelIndex];
			const day = days[dayIndex];

			setSubmitting(true);
			try {
				const { code } = await createBooking({
					bookingDate: combineDateAndTime(day.date, time),
					levelMin: range.min,
					levelMax: range.max,
					open: draft.keepOpen,
					joinMode: draft.keepOpen ? draft.joinMode : undefined,
					notes: draft.notes.trim() || undefined,
				});

				Alert.alert(
					"Prenotazione confermata 🎾",
					[
						`${formatDayLong(day.date)}, ${formatSlotRange(time)}`,
						draft.keepOpen
							? "La partita è visibile tra quelle aperte."
							: "Partita privata.",
						`Codice prenotazione: ${code}`,
					].join("\n"),
					[{ text: "OK", onPress: () => router.back() }],
				);
			} catch (err) {
				Alert.alert("Ops", convexErrorMessage(err));
			} finally {
				setSubmitting(false);
			}
		});

	return (
		/*
		 * Dentro un form sheet react-native-screens assegna nativamente alla prima
		 * ScrollView tra i figli del contenuto il frame dell'intero foglio
		 * (RNSScreenContentWrapper.mm), e avverte se i figli sono più di due.
		 * Quindi: la lista per prima, e una sola vista sopra con le due barre
		 * flottanti, che il contenuto attraversa scorrendo sotto al blur.
		 */
		<>
			<ScrollView
				ref={scrollRef}
				style={{ flex: 1, backgroundColor: theme.background }}
				contentContainerStyle={{
					paddingHorizontal: CONTENT_PADDING,
					paddingTop: barHeights.header,
					paddingBottom: barHeights.footer + 24,
					gap: 24,
				}}
				keyboardShouldPersistTaps="handled"
				showsVerticalScrollIndicator={false}
				// Su iOS lascia spazio alla tastiera quando si scrive la nota
				automaticallyAdjustKeyboardInsets
			>
				<Animated.View style={[{ gap: 24 }, stepStyle]}>
					{step === 0 && (
						<StepLevel
							selectedIndex={levelIndex}
							onSelect={(index) => patch({ levelIndex: index })}
							playerLevel={player?.level}
							suggested={draft.levelIndex === null}
						/>
					)}
					{step === 1 && (
						<StepSchedule
							days={days}
							slotsByDay={slotsByDay}
							dayIndex={dayIndex}
							time={draft.time}
							onSelectDay={selectDay}
							onSelectTime={(time) => patch({ time })}
						/>
					)}
					{step === 2 && (
						<StepPlayers
							player={player}
							keepOpen={draft.keepOpen}
							joinMode={draft.joinMode}
							onKeepOpenChange={(keepOpen) => patch({ keepOpen })}
							onJoinModeChange={(joinMode) => patch({ joinMode })}
						/>
					)}
					{step === 3 && draft.time && (
						<StepSummary
							level={LEVEL_RANGES[levelIndex]}
							day={days[dayIndex]}
							time={draft.time}
							keepOpen={draft.keepOpen}
							joinMode={draft.joinMode}
							notes={draft.notes}
							onNotesChange={(notes) => patch({ notes })}
							onEdit={goTo}
						/>
					)}
				</Animated.View>
			</ScrollView>

			{/* Barre flottanti: `box-none` lascia scorrere il contenuto in mezzo */}
			<View style={styles.bars} pointerEvents="box-none" collapsable={false}>
				{/* Intestazione: avanzamento, ritorno al passo precedente e titolo */}
				<View
					onLayout={measureBar("header")}
					style={{
						paddingHorizontal: CONTENT_PADDING,
						paddingTop: 18,
						paddingBottom: 16,
						gap: 14,
					}}
				>
					<ProgressiveBlur direction="down" />
					<StepProgress step={step} total={STEPS.length} />

					<View
						style={{
							flexDirection: "row",
							alignItems: "center",
							justifyContent: "space-between",
							minHeight: 36,
						}}
					>
						{step > 0 || Platform.OS !== "ios" ? (
							<Pressable
								onPress={goBack}
								hitSlop={10}
								accessibilityRole="button"
								accessibilityLabel={step > 0 ? "Passo precedente" : "Chiudi"}
								style={{
									width: 36,
									height: 36,
									borderRadius: 999,
									alignItems: "center",
									justifyContent: "center",
									backgroundColor: theme.muted,
								}}
							>
								<IconSymbol
									name={step > 0 ? "chevron.left" : "xmark"}
									size={18}
									color={theme.text}
								/>
							</Pressable>
						) : (
							<View />
						)}

						<ThemedText style={{ fontSize: 13, color: theme.textMuted }}>
							Passo {step + 1} di {STEPS.length}
						</ThemedText>
					</View>

					<View style={{ gap: 4 }}>
						<ThemedText type="title">{STEPS[step].title}</ThemedText>
						<ThemedText type="subtitle" style={{ fontSize: 15 }}>
							{STEPS[step].subtitle}
						</ThemedText>
					</View>
				</View>

				{/* Azione principale, sempre a portata di pollice */}
				<Animated.View
					onLayout={measureBar("footer")}
					style={[
						{
							paddingHorizontal: CONTENT_PADDING,
							paddingTop: 16,
							paddingBottom: Math.max(insets.bottom, 16),
						},
						footerStyle,
					]}
				>
					<ProgressiveBlur direction="up" />
					<Button
						label={primaryLabel(step, player !== null, draft.time !== null)}
						icon={isLastStep ? "checkmark.circle.fill" : "arrow.right"}
						iconPosition={isLastStep ? "leading" : "trailing"}
						onPress={isLastStep ? handleConfirm : () => goTo(step + 1)}
						disabled={!canContinue}
						loading={submitting}
					/>
				</Animated.View>
			</View>
		</>
	);
}

const styles = StyleSheet.create({
	/** Le due barre agli estremi del foglio, sopra il contenuto scorrevole. */
	bars: {
		position: "absolute",
		top: 0,
		bottom: 0,
		left: 0,
		right: 0,
		justifyContent: "space-between",
	},
});
