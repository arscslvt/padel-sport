import type { ComponentProps } from "react";
import { Pressable, View } from "react-native";
import SmoothView from "@/components/smooth-view";
import { ThemedText } from "@/components/themed-text";
import { SectionLabel } from "@/components/ui/choice";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { TextField } from "@/components/ui/text-field";
import { Fonts } from "@/constants/fonts";
import { useTheme } from "@/hooks/use-theme";
import {
	type BookingDay,
	formatDayLong,
	formatSlotRange,
	MAX_PLAYERS,
} from "@/lib/booking";
import { formatLevelRange, type JoinMode, joinModeMeta } from "@/lib/format";
import type { LevelRange } from "@/lib/levels";

type IconName = ComponentProps<typeof IconSymbol>["name"];

/**
 * Ultimo passo: riepilogo delle scelte (ogni riga riporta al passo relativo),
 * nota facoltativa e conferma.
 */
export default function StepSummary({
	level,
	day,
	time,
	visibility,
	joinMode,
	squadSize,
	circleName,
	notes,
	onNotesChange,
	onEdit,
}: {
	level: LevelRange;
	day: BookingDay;
	time: string;
	visibility: "public" | "private";
	joinMode: JoinMode;
	/** Creatore, invitati e ospiti già messi in squadra. */
	squadSize: number;
	/** Valorizzato quando la partita nasce dentro una cerchia. */
	circleName?: string;
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
						icon={
							circleName
								? "person.3.fill"
								: visibility === "public"
									? "person.2.fill"
									: "lock.fill"
						}
						label={`Giocatori ${squadSize}/${MAX_PLAYERS}`}
						value={
							circleName
								? `Cerchia · ${circleName}`
								: visibility === "public"
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
				<ThemedText style={{ fontSize: 16, fontFamily: Fonts.semiBold }}>
					{value}
				</ThemedText>
			</View>
			<IconSymbol name="chevron.right" size={16} color={theme.textMuted} />
		</Pressable>
	);
}
