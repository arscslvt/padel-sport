import { StyleSheet, Text, type TextProps } from "react-native";

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
				{ color, fontFamily: "GoogleSans17pt-Regular" },
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

const styles = StyleSheet.create({
	default: {
		fontSize: 16,
		lineHeight: 24,
		fontFamily: "GoogleSans17pt-Regular",
		fontWeight: "400",
	},
	defaultSemiBold: {
		fontSize: 16,
		lineHeight: 24,
		fontFamily: "GoogleSans17pt-Bold",
		fontWeight: "500",
	},
	title: {
		fontSize: 26,
		fontFamily: "GoogleSans17pt-Bold",
		lineHeight: 32,
		fontWeight: "600",
	},
	subtitle: {
		fontSize: 16,
		fontFamily: "GoogleSans17pt-SemiBold",
		fontWeight: "500",
	},
	link: {
		lineHeight: 30,
		fontSize: 16,
		fontFamily: "GoogleSans17pt-Regular",
		color: "#0a7ea4",
		fontWeight: "400",
	},
});
