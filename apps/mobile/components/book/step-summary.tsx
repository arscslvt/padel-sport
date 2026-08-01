import type { ComponentProps } from "react";
import { Pressable, View } from "react-native";
import { SectionLabel } from "@/components/book/primitives";
import SmoothView from "@/components/smooth-view";
import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { TextField } from "@/components/ui/text-field";
import { useTheme } from "@/hooks/use-theme";
import {
	type BookingDay,
	formatDayLong,
	formatSlotRange,
	type LevelRange,
	MAX_PLAYERS,
} from "@/lib/booking";
import { formatLevelRange, type JoinMode, joinModeMeta } from "@/lib/format";

type IconName = ComponentProps<typeof IconSymbol>["name"];

/**
 * Ultimo passo: riepilogo delle scelte (ogni riga riporta al passo relativo),
 * nota facoltativa e conferma.
 */
export default function StepSummary({
	level,
	day,
	time,
	keepOpen,
	joinMode,
	notes,
	onNotesChange,
	onEdit,
}: {
	level: LevelRange;
	day: BookingDay;
	time: string;
	keepOpen: boolean;
	joinMode: JoinMode;
	notes: string;
	onNotesChange: (notes: string) => void;
	/** Torna al passo indicato per modificare la scelta. */
	onEdit: (step: number) => void;
}) {
	const theme = useTheme();

	return (
		<View style={{ gap: 22 }}>
			<SmoothView
				radius={20}
				smoothing={1}
				backgroundColor={theme.elevated}
				borderColor={theme.border}
				borderWidth={1}
				shadow={false}
			>
				<View style={{ paddingHorizontal: 16, paddingVertical: 4 }}>
					<SummaryRow
						icon="figure.tennis"
						label="Livello richiesto"
						value={`${formatLevelRange(level.min, level.max)} · ${level.label}`}
						onPress={() => onEdit(0)}
					/>
					<Divider />
					<SummaryRow
						icon="calendar"
						label="Data"
						value={formatDayLong(day.date)}
						onPress={() => onEdit(1)}
					/>
					<Divider />
					<SummaryRow
						icon="clock.fill"
						label="Orario"
						value={formatSlotRange(time)}
						onPress={() => onEdit(1)}
					/>
					<Divider />
					<SummaryRow
						icon={keepOpen ? "person.2.fill" : "lock.fill"}
						label={`Giocatori 1/${MAX_PLAYERS}`}
						value={
							keepOpen
								? `Partita aperta · ${joinModeMeta[joinMode].label}`
								: "Partita privata"
						}
						onPress={() => onEdit(2)}
					/>
				</View>
			</SmoothView>

			<View style={{ gap: 12 }}>
				<View style={{ gap: 2 }}>
					<SectionLabel>Nota</SectionLabel>
					<ThemedText
						style={{ fontSize: 13, lineHeight: 18, color: theme.textMuted }}
					>
						Facoltativa, visibile agli altri giocatori.
					</ThemedText>
				</View>
				<TextField
					value={notes}
					onChangeText={onNotesChange}
					placeholder="Es. partita amichevole, ritmo tranquillo…"
					multiline
					radius={18}
					style={{ minHeight: 88, textAlignVertical: "top" }}
				/>
			</View>
		</View>
	);
}

function Divider() {
	const theme = useTheme();
	return <View style={{ height: 1, backgroundColor: theme.border }} />;
}

/** Riga del riepilogo: tocca per tornare al passo che la definisce. */
function SummaryRow({
	icon,
	label,
	value,
	onPress,
}: {
	icon: IconName;
	label: string;
	value: string;
	onPress: () => void;
}) {
	const theme = useTheme();

	return (
		<Pressable
			onPress={onPress}
			accessibilityRole="button"
			accessibilityHint="Torna al passo per modificare"
			style={({ pressed }) => ({
				flexDirection: "row",
				alignItems: "center",
				gap: 12,
				paddingVertical: 14,
				opacity: pressed ? 0.6 : 1,
			})}
		>
			<IconSymbol name={icon} size={20} color={theme.textMuted} />
			<View style={{ flex: 1, gap: 1 }}>
				<ThemedText style={{ fontSize: 13, color: theme.textMuted }}>
					{label}
				</ThemedText>
				<ThemedText style={{ fontSize: 16, fontWeight: "600" }}>
					{value}
				</ThemedText>
			</View>
			<IconSymbol name="chevron.right" size={16} color={theme.textMuted} />
		</Pressable>
	);
}
