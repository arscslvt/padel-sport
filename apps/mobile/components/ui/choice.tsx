import * as Haptics from "expo-haptics";
import type { ComponentProps, ReactNode } from "react";
import { Pressable, View } from "react-native";
import SmoothView from "@/components/smooth-view";
import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Fonts } from "@/constants/fonts";
import { useTheme } from "@/hooks/use-theme";

type IconName = ComponentProps<typeof IconSymbol>["name"];

/** Feedback tattile alla selezione, come i controlli nativi iOS. */
export function selectionFeedback() {
	if (process.env.EXPO_OS === "ios") {
		Haptics.selectionAsync();
	}
}

/** Barra di avanzamento a segmenti, uno per passo del flusso. */
export function StepProgress({ step, total }: { step: number; total: number }) {
	const theme = useTheme();
	const segments = Array.from({ length: total }, (_, index) => index);

	return (
		<View style={{ flexDirection: "row", gap: 6 }}>
			{segments.map((segment) => (
				<View
					key={segment}
					style={{
						flex: 1,
						height: 4,
						borderRadius: 999,
						backgroundColor: segment <= step ? theme.tint : theme.muted,
					}}
				/>
			))}
		</View>
	);
}

/** Etichetta maiuscola che apre un gruppo di controlli dentro un passo. */
export function SectionLabel({ children }: { children: string }) {
	const theme = useTheme();

	return (
		<ThemedText
			style={{
				fontSize: 13,
				fontFamily: Fonts.semiBold,
				color: theme.textMuted,
				textTransform: "uppercase",
				letterSpacing: 0.4,
			}}
		>
			{children}
		</ThemedText>
	);
}

/** Nota informativa non interattiva (suggerimenti, funzioni in arrivo). */
export function Hint({
	icon,
	children,
}: {
	icon: IconName;
	children: ReactNode;
}) {
	const theme = useTheme();

	return (
		<View
			style={{
				flexDirection: "row",
				alignItems: "flex-start",
				gap: 10,
				padding: 12,
				borderRadius: 16,
				backgroundColor: theme.muted,
			}}
		>
			<IconSymbol name={icon} size={16} color={theme.textMuted} />
			<ThemedText
				style={{
					flex: 1,
					fontSize: 13,
					lineHeight: 18,
					color: theme.textMuted,
				}}
			>
				{children}
			</ThemedText>
		</View>
	);
}

/** Pillola selezionabile per scelte brevi (orari, giorni). */
export function SelectChip({
	label,
	selected,
	disabled,
	onPress,
}: {
	label: string;
	selected: boolean;
	disabled?: boolean;
	onPress: () => void;
}) {
	const theme = useTheme();

	return (
		<Pressable
			onPress={() => {
				selectionFeedback();
				onPress();
			}}
			disabled={disabled}
			style={{
				paddingHorizontal: 16,
				paddingVertical: 10,
				borderRadius: 999,
				borderWidth: 1,
				borderColor: selected ? theme.tint : theme.border,
				backgroundColor: selected ? theme.tint : theme.elevated,
				opacity: disabled ? 0.4 : 1,
			}}
		>
			<ThemedText
				style={{
					fontSize: 15,
					lineHeight: 18,
					fontFamily: Fonts.medium,
					color: selected ? theme.tintForeground : theme.text,
				}}
			>
				{label}
			</ThemedText>
		</Pressable>
	);
}

/** Cerchio di selezione a destra delle scelte, spento o con la spunta. */
function SelectionMark({ selected }: { selected: boolean }) {
	const theme = useTheme();

	if (selected) {
		return (
			<IconSymbol name="checkmark.circle.fill" size={22} color={theme.tint} />
		);
	}

	return (
		<View
			style={{
				width: 22,
				height: 22,
				borderRadius: 999,
				borderWidth: 1.5,
				borderColor: theme.border,
			}}
		/>
	);
}

/**
 * Scelta a tutta larghezza: una per riga, con descrizione ed eventuali opzioni
 * annidate che compaiono solo quando è selezionata.
 */
export function ChoiceCard({
	title,
	description,
	icon,
	badge,
	tag,
	selected,
	onPress,
	children,
}: {
	title: string;
	description?: string;
	icon?: IconName;
	/** Testo evidenziato a sinistra, es. il range di livello. */
	badge?: string;
	/**
	 * Etichetta permanente della scelta (indipendente dalla selezione): appare
	 * su una fascia dietro la card, che ne resta scoperta solo in alto.
	 */
	tag?: string;
	selected: boolean;
	onPress: () => void;
	children?: ReactNode;
}) {
	const theme = useTheme();

	const card = (
		<SmoothView
			radius={20}
			smoothing={1}
			backgroundColor={theme.elevated}
			borderColor={selected ? theme.tint : theme.border}
			borderWidth={selected ? 1.5 : 1}
			shadow={false}
			onPress={() => {
				selectionFeedback();
				onPress();
			}}
		>
			<View style={{ padding: 16, gap: 14 }}>
				<View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
					{badge !== undefined && (
						<View
							style={{
								paddingHorizontal: 12,
								paddingVertical: 8,
								borderRadius: 14,
								backgroundColor: selected ? theme.tint : theme.muted,
							}}
						>
							<ThemedText
								style={{
									fontSize: 14,
									lineHeight: 18,
									fontFamily: Fonts.semiBold,
									color: selected ? theme.tintForeground : theme.text,
								}}
							>
								{badge}
							</ThemedText>
						</View>
					)}
					{badge === undefined && icon !== undefined && (
						<View
							style={{
								width: 38,
								height: 38,
								borderRadius: 999,
								alignItems: "center",
								justifyContent: "center",
								backgroundColor: selected ? theme.tint : theme.muted,
							}}
						>
							<IconSymbol
								name={icon}
								size={18}
								color={selected ? theme.tintForeground : theme.textMuted}
							/>
						</View>
					)}

					<View style={{ flex: 1, gap: 2 }}>
						<ThemedText style={{ fontSize: 16, fontFamily: Fonts.semiBold }}>
							{title}
						</ThemedText>
						{description && (
							<ThemedText
								style={{
									fontSize: 13,
									lineHeight: 18,
									color: theme.textMuted,
								}}
							>
								{description}
							</ThemedText>
						)}
					</View>

					<SelectionMark selected={selected} />
				</View>

				{selected && children}
			</View>
		</SmoothView>
	);

	if (!tag) return card;

	// La card copre la fascia lasciandone scoperta solo la striscia con
	// l'etichetta: stesso raggio e stessa larghezza, così gli angoli combaciano.
	return (
		<View
			style={{
				backgroundColor: theme.muted,
				borderRadius: 20,
				paddingTop: 7,
			}}
		>
			<View
				style={{
					flexDirection: "row",
					alignItems: "center",
					justifyContent: "center",
					gap: 5,
					paddingBottom: 7,
				}}
			>
				<IconSymbol name="person.fill" size={13} color={theme.textMuted} />
				<ThemedText
					style={{ fontSize: 13, lineHeight: 18, color: theme.textMuted }}
				>
					{tag}
				</ThemedText>
			</View>
			{card}
		</View>
	);
}

/**
 * Opzione annidata dentro una `ChoiceCard`: bordo nativo invece dello squircle
 * Skia, che non renderebbe correttamente sopra il fondo della card.
 */
export function NestedOption({
	title,
	description,
	icon,
	selected,
	onPress,
}: {
	title: string;
	description?: string;
	icon?: IconName;
	selected: boolean;
	onPress: () => void;
}) {
	const theme = useTheme();

	return (
		<Pressable
			onPress={() => {
				selectionFeedback();
				onPress();
			}}
			style={{
				flexDirection: "row",
				alignItems: "center",
				gap: 10,
				padding: 12,
				borderRadius: 16,
				borderWidth: 1,
				borderColor: selected ? theme.tint : theme.border,
				backgroundColor: selected ? theme.muted : "transparent",
			}}
		>
			{icon && (
				<IconSymbol
					name={icon}
					size={18}
					color={selected ? theme.text : theme.textMuted}
				/>
			)}
			<View style={{ flex: 1, gap: 1 }}>
				<ThemedText style={{ fontSize: 15, fontFamily: Fonts.semiBold }}>
					{title}
				</ThemedText>
				{description && (
					<ThemedText
						style={{ fontSize: 12, lineHeight: 16, color: theme.textMuted }}
					>
						{description}
					</ThemedText>
				)}
			</View>
			{selected && (
				<IconSymbol name="checkmark.circle.fill" size={18} color={theme.tint} />
			)}
		</Pressable>
	);
}
