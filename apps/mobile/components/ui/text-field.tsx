import { forwardRef } from "react";
import {
	type StyleProp,
	StyleSheet,
	TextInput,
	type TextInputProps,
	View,
	type ViewStyle,
} from "react-native";
import { useTheme } from "@/hooks/use-theme";

type TextFieldProps = TextInputProps & {
	/** Stile del contenitore. */
	containerStyle?: StyleProp<ViewStyle>;
	/** Override del palette per schermate brandizzate ad aspetto fisso. */
	backgroundColor?: string;
	borderColor?: string;
	textColor?: string;
	radius?: number;
};

/**
 * Campo di testo del design system: `TextInput` in un contenitore con bordo e
 * angoli arrotondati **nativi**.
 *
 * A differenza dei bottoni (che usano lo squircle Skia di `SmoothView`), qui il
 * contenitore è una `View` nativa: lo sfondo/bordo sono sempre disegnati a
 * prescindere dallo z-order del genitore — un input dentro una card a sfondo
 * pieno (es. il login) altrimenti non renderebbe correttamente il fondo Skia.
 */
export const TextField = forwardRef<TextInput, TextFieldProps>(function TextField(
	{
		containerStyle,
		backgroundColor,
		borderColor,
		textColor,
		radius = 14,
		placeholderTextColor,
		style,
		...rest
	},
	ref,
) {
	const theme = useTheme();
	return (
		<View
			style={[
				styles.container,
				{
					borderRadius: radius,
					backgroundColor: backgroundColor ?? theme.elevated,
					borderColor: borderColor ?? theme.border,
				},
				containerStyle,
			]}
		>
			<TextInput
				ref={ref}
				placeholderTextColor={placeholderTextColor ?? theme.textMuted}
				style={[styles.input, { color: textColor ?? theme.text }, style]}
				{...rest}
			/>
		</View>
	);
});

const styles = StyleSheet.create({
	container: {
		borderWidth: 1,
		overflow: "hidden",
	},
	input: {
		padding: 16,
		fontSize: 16,
	},
});
