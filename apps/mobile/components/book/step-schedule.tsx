import { useMemo } from "react";
import { Pressable, ScrollView, View } from "react-native";
import {
	Hint,
	SectionLabel,
	SelectChip,
	selectionFeedback,
} from "@/components/book/primitives";
import { ThemedText } from "@/components/themed-text";
import { useTheme } from "@/hooks/use-theme";
import {
	type BookingDay,
	formatDuration,
	groupSlots,
	MATCH_DURATION_MINUTES,
	type TimeSlot,
} from "@/lib/booking";

/** Margine orizzontale del contenuto: i giorni scorrono a filo schermo. */
const CONTENT_PADDING = 20;

/**
 * Secondo passo: giorno (fino a 7 da oggi) e orario di inizio, uno slot ogni
 * mezz'ora dentro le finestre di apertura del club.
 */
export default function StepSchedule({
	days,
	slotsByDay,
	dayIndex,
	time,
	onSelectDay,
	onSelectTime,
}: {
	days: BookingDay[];
	/** Orari ancora liberi per ciascun giorno, allineati a `days`. */
	slotsByDay: TimeSlot[][];
	dayIndex: number;
	time: string | null;
	onSelectDay: (index: number) => void;
	onSelectTime: (time: string) => void;
}) {
	const groups = useMemo(
		() => groupSlots(slotsByDay[dayIndex] ?? []),
		[slotsByDay, dayIndex],
	);

	return (
		<View style={{ gap: 22 }}>
			<View style={{ gap: 12 }}>
				<SectionLabel>Giorno</SectionLabel>
				<ScrollView
					horizontal
					showsHorizontalScrollIndicator={false}
					contentContainerStyle={{ gap: 8, paddingHorizontal: CONTENT_PADDING }}
					style={{ marginHorizontal: -CONTENT_PADDING }}
				>
					{days.map((day, index) => (
						<DayCard
							key={day.date.toISOString()}
							day={day}
							selected={index === dayIndex}
							disabled={(slotsByDay[index]?.length ?? 0) === 0}
							onPress={() => onSelectDay(index)}
						/>
					))}
				</ScrollView>
			</View>

			<View style={{ gap: 12 }}>
				<SectionLabel>Orario di inizio</SectionLabel>

				{groups.length === 0 ? (
					<Hint icon="clock.fill">
						Per oggi non ci sono più orari disponibili: scegli un altro giorno.
					</Hint>
				) : (
					groups.map((group) => (
						<View key={group.title} style={{ gap: 8, marginTop: 2 }}>
							<GroupTitle>{group.title}</GroupTitle>
							<View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
								{group.slots.map((slot) => (
									<SelectChip
										key={slot.time}
										label={slot.time}
										selected={slot.time === time}
										onPress={() => onSelectTime(slot.time)}
									/>
								))}
							</View>
						</View>
					))
				)}
			</View>

			<Hint icon="clock.fill">
				Ogni partita dura {formatDuration(MATCH_DURATION_MINUTES)}. Il campo
				viene assegnato dalla struttura alla conferma.
			</Hint>
		</View>
	);
}

function GroupTitle({ children }: { children: string }) {
	const theme = useTheme();

	return (
		<ThemedText style={{ fontSize: 14, color: theme.textMuted }}>
			{children}
		</ThemedText>
	);
}

/** Giorno del calendario: etichetta relativa sopra, numero del mese sotto. */
function DayCard({
	day,
	selected,
	disabled,
	onPress,
}: {
	day: BookingDay;
	selected: boolean;
	disabled: boolean;
	onPress: () => void;
}) {
	const theme = useTheme();
	const foreground = selected ? theme.tintForeground : theme.text;

	return (
		<Pressable
			onPress={() => {
				selectionFeedback();
				onPress();
			}}
			disabled={disabled}
			accessibilityRole="button"
			accessibilityState={{ selected, disabled }}
			style={{
				width: 74,
				paddingVertical: 12,
				alignItems: "center",
				gap: 2,
				borderRadius: 20,
				borderWidth: selected ? 1.5 : 1,
				borderColor: selected ? theme.tint : theme.border,
				backgroundColor: selected ? theme.tint : theme.elevated,
				opacity: disabled ? 0.35 : 1,
			}}
		>
			<ThemedText
				style={{ fontSize: 12, lineHeight: 16, color: foreground }}
				numberOfLines={1}
			>
				{day.label}
			</ThemedText>
			<ThemedText
				style={{
					fontSize: 20,
					lineHeight: 26,
					fontWeight: "600",
					color: foreground,
				}}
			>
				{day.dayNumber}
			</ThemedText>
		</Pressable>
	);
}
