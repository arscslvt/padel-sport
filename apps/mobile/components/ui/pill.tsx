import { View, type ViewStyle, type StyleProp } from "react-native";
import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useTheme } from "@/hooks/use-theme";

interface PillProps {
	label: string;
	icon?: string;
	/** Se true usa i colori tint (evidenziato), altrimenti muted */
	tinted?: boolean;
	style?: StyleProp<ViewStyle>;
}

/** Piccolo badge a pillola per metadati (livello, modalità di accesso, data). */
export default function Pill({ label, icon, tinted, style }: PillProps) {
	const theme = useTheme();

	const background = tinted ? theme.tint : theme.muted;
	const foreground = tinted ? theme.tintForeground : theme.textMuted;

	return (
		<View
			style={[
				{
					flexDirection: "row",
					alignItems: "center",
					gap: 5,
					paddingHorizontal: 10,
					paddingVertical: 5,
					borderRadius: 999,
					backgroundColor: background,
					alignSelf: "flex-start",
				},
				style,
			]}
		>
			{icon && <IconSymbol name={icon} size={13} color={foreground} />}
			<ThemedText
				style={{
					fontSize: 13,
					lineHeight: 17,
					fontWeight: "500",
					color: foreground,
				}}
			>
				{label}
			</ThemedText>
		</View>
	);
}
