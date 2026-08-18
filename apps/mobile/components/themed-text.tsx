import { StyleSheet, Text, type TextProps } from "react-native";

import { Fonts } from "@/constants/fonts";
import { useThemeColor } from "@/hooks/use-theme-color";

export type ThemedTextProps = TextProps & {
	lightColor?: string;
	darkColor?: string;
	type?: "default" | "title" | "defaultSemiBold" | "subtitle" | "link";
};

export function ThemedText({
	style,
	lightColor,
	darkColor,
	type = "default",
	...rest
}: ThemedTextProps) {
	const color = useThemeColor({ light: lightColor, dark: darkColor }, "text");
	const muted = useThemeColor(
		{ light: lightColor, dark: darkColor },
		"textMuted",
	);
	const tinted = useThemeColor(
		{ light: lightColor, dark: darkColor },
		"textTinted",
	);

	return (
		<Text
			style={[
				{ color, fontFamily: Fonts.regular },
				type === "default" ? { ...styles.default } : undefined,
				type === "title" ? { ...styles.title } : undefined,
				type === "defaultSemiBold" ? styles.defaultSemiBold : undefined,
				type === "subtitle" ? { ...styles.subtitle, color: muted } : undefined,
				type === "link" ? styles.link : undefined,
				style,
			]}
			{...rest}
		/>
	);
}

/**
 * Il peso arriva dal file caricato, non da `fontWeight`: con i tagli statici
 * iOS sceglie la faccia dal nome, e un `fontWeight` che non corrisponde al
 * file finirebbe per far sintetizzare al sistema un finto grassetto.
 */
const styles = StyleSheet.create({
	default: {
		fontSize: 16,
		lineHeight: 24,
		fontFamily: Fonts.regular,
	},
	defaultSemiBold: {
		fontSize: 16,
		lineHeight: 24,
		fontFamily: Fonts.semiBold,
	},
	title: {
		fontSize: 26,
		lineHeight: 32,
		fontFamily: Fonts.bold,
	},
	subtitle: {
		fontSize: 16,
		fontFamily: Fonts.semiBold,
	},
	link: {
		lineHeight: 30,
		fontSize: 16,
		fontFamily: Fonts.regular,
		color: "#0a7ea4",
	},
});
