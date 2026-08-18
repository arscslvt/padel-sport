import { ActivityIndicator, Pressable } from "react-native";
import { selectionFeedback } from "@/components/ui/choice";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useTheme } from "@/hooks/use-theme";

/**
 * Pulsante tondo compatto usato in coda alle righe di un elenco
 * (accetta, rifiuta, rimuovi…). Mentre l'azione è in corso l'icona lascia il
 * posto allo spinner, così la riga non cambia dimensione.
 */
export default function RowAction({
	icon,
	label,
	onPress,
	busy,
	tinted,
	danger,
}: {
	icon: string;
	label: string;
	onPress: () => void;
	busy?: boolean;
	/** Sfondo nel colore d'accento: l'azione principale della riga. */
	tinted?: boolean;
	danger?: boolean;
}) {
	const theme = useTheme();
	const foreground = tinted
		? theme.tintForeground
		: danger
			? theme.danger
			: theme.textMuted;

	return (
		<Pressable
			onPress={() => {
				selectionFeedback();
				onPress();
			}}
			disabled={busy}
			hitSlop={6}
			accessibilityRole="button"
			accessibilityLabel={label}
			style={({ pressed }) => ({
				width: 36,
				height: 36,
				borderRadius: 999,
				alignItems: "center",
				justifyContent: "center",
				backgroundColor: tinted ? theme.tint : theme.muted,
				opacity: pressed || busy ? 0.6 : 1,
			})}
		>
			{busy ? (
				<ActivityIndicator size="small" color={foreground} />
			) : (
				<IconSymbol name={icon} size={16} color={foreground} />
			)}
		</Pressable>
	);
}
