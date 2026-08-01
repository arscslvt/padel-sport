import type { ComponentProps, ReactNode } from "react";
import {
	ActivityIndicator,
	type StyleProp,
	StyleSheet,
	type ViewStyle,
} from "react-native";
import SmoothView from "@/components/smooth-view";
import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useTheme } from "@/hooks/use-theme";

type IconName = ComponentProps<typeof IconSymbol>["name"];

type ButtonProps = {
	label: string;
	onPress?: () => void;
	/** `primary` = tint pieno; `secondary` = superficie con bordo. */
	variant?: "primary" | "secondary";
	/** Icona SF Symbol accanto all'etichetta. */
	icon?: IconName;
	iconPosition?: "leading" | "trailing";
	/** Elemento leading personalizzato (es. logo brand) al posto dell'icona. */
	leading?: ReactNode;
	loading?: boolean;
	disabled?: boolean;
	/** Override del palette per schermate brandizzate ad aspetto fisso. */
	backgroundColor?: string;
	textColor?: string;
	borderColor?: string;
	radius?: number;
	height?: number;
	style?: StyleProp<ViewStyle>;
};

/**
 * Bottone del design system: squircle `SmoothView` + `ThemedText` + `IconSymbol`,
 * lo stesso pattern usato nelle schermate interne (profilo, prenotazione),
 * centralizzato e parametrizzabile.
 */
export function Button({
	label,
	onPress,
	variant = "primary",
	icon,
	iconPosition = "trailing",
	leading,
	loading = false,
	disabled = false,
	backgroundColor,
	textColor,
	borderColor,
	radius = 20,
	height = 56,
	style,
}: ButtonProps) {
	const theme = useTheme();
	const isPrimary = variant === "primary";
	const bg = backgroundColor ?? (isPrimary ? theme.tint : theme.elevated);
	const fg = textColor ?? (isPrimary ? theme.tintForeground : theme.text);
	const border = borderColor ?? (isPrimary ? undefined : theme.border);
	const inactive = disabled || loading;

	const iconEl = icon ? <IconSymbol name={icon} size={18} color={fg} /> : null;

	return (
		<SmoothView
			radius={radius}
			smoothing={1}
			backgroundColor={bg}
			borderColor={border}
			borderWidth={border ? 1 : 0}
			shadow={false}
			onPress={inactive ? undefined : onPress}
			disabled={inactive}
			style={[styles.base, { height, opacity: inactive ? 0.7 : 1 }, style]}
		>
			{loading ? (
				<ActivityIndicator color={fg} />
			) : (
				<>
					{leading}
					{iconPosition === "leading" && iconEl}
					<ThemedText style={[styles.label, { color: fg }]}>{label}</ThemedText>
					{iconPosition === "trailing" && iconEl}
				</>
			)}
		</SmoothView>
	);
}

const styles = StyleSheet.create({
	base: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		gap: 8,
	},
	label: {
		fontSize: 17,
		fontWeight: "600",
	},
});
