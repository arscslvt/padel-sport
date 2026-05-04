import { useTheme } from "@/hooks/use-theme";
import type { ReactNode } from "react";
import { Text, View } from "react-native";
import SmoothView from "./smooth-view";
import { IconSymbol } from "./ui/icon-symbol";

interface KpiCardProps {
	title: string;
	content: ReactNode;
	iconName: string;
	onPress?: () => void;
}

export default function KpiCard({
	title,
	content,
	iconName,
	onPress,
}: KpiCardProps) {
	const theme = useTheme();
	return (
		<SmoothView
			radius={12}
			smoothing={1.3}
			shadow={false}
			onPress={onPress}
			style={{
				flex: 1,
				justifyContent: "flex-start",
			}}
			borderWidth={1}
			borderColor={theme.border}
			backgroundColor={theme.elevated}
		>
			<View
				style={{
					paddingHorizontal: 16,
					paddingTop: 16,
					paddingBottom: 16,
					flex: 1,
					justifyContent: "space-between",
				}}
			>
				<View
					style={{
						flexDirection: "row",
						alignItems: "center",
						gap: 8,
					}}
				>
					<Text
						style={{
							flex: 1,
							fontSize: 15,
							fontWeight: "500",
							color: theme.textMuted,
						}}
						numberOfLines={1}
						adjustsFontSizeToFit
					>
						{title}
					</Text>
					<IconSymbol
						size={24}
						name={iconName}
						color={theme.tint}
						style={{
							borderWidth: 1,
							borderColor: theme.border,
							borderRadius: 9999,
							transform: [{ rotate: "-45deg" }],
						}}
					/>
				</View>
				<View
					style={{
						flexDirection: "row",
						alignItems: "flex-end",
						paddingTop: 8,
					}}
				>
					{content}
				</View>
			</View>
		</SmoothView>
	);
}
