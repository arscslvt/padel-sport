import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import SmoothView from "@/components/smooth-view";
import TabScreen from "@/components/tab-screen";
import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useTheme } from "@/hooks/use-theme";

export default function BookingsScreen() {
	const { top } = useSafeAreaInsets();
	const theme = useTheme();

	return (
		<TabScreen>
			<View style={{ flex: 1, paddingTop: top + 54 }}>
				<View style={{ paddingHorizontal: 16, marginTop: 24 }}>
					<View>
						<ThemedText type="title">Prenotazioni</ThemedText>
					</View>

					<View
						style={{
							justifyContent: "center",
							alignItems: "center",
							marginVertical: 38,
							gap: 22,
						}}
					>
						<View
							style={{
								justifyContent: "center",
								alignItems: "center",
								gap: 4,
							}}
						>
							<ThemedText type="subtitle" style={{ color: theme.textTinted }}>
								Non hai ancora prenotato
							</ThemedText>
							<ThemedText style={{ color: theme.textMuted }}>
								Che aspetti? Prenota e riunisci la tua squadra
							</ThemedText>
						</View>
						<SmoothView
							backgroundColor={theme.tint}
							style={{
								paddingHorizontal: 22,
								paddingVertical: 14,
								borderRadius: 8,
								flexDirection: "row",
								alignItems: "center",
								gap: 6,
							}}
							radius={22}
							smoothing={6}
						>
							<IconSymbol
								name="plus.circle.fill"
								color={theme.tintForeground}
							/>
							<ThemedText
								style={{
									fontSize: 18,
									lineHeight: 24,
									fontWeight: "500",
									color: theme.tintForeground,
								}}
							>
								Prenota
							</ThemedText>
						</SmoothView>
					</View>
				</View>
			</View>
		</TabScreen>
	);
}
