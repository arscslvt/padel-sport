import KpiCard from "@/components/kpi-card";
import { ThemedText } from "@/components/themed-text";
import { useTheme } from "@/hooks/use-theme";
import { ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function TabsIndex() {
	const { top } = useSafeAreaInsets();
	const theme = useTheme();

	return (
		<View style={{ flex: 1 }}>
			<ScrollView
				contentContainerStyle={{
					paddingBottom: 16,
					paddingTop: top + 60, // Per spingere il primo contenuto visibile sotto la header
					flexGrow: 1,
				}}
				style={{
					width: "100%",
					flex: 1,
				}}
			>
				<View
					style={{
						flexDirection: "row",
						gap: 12,
						paddingHorizontal: 16,
						marginTop: 16,
						overflow: "visible",
					}}
				>
					<KpiCard
						title="Partite giocate"
						content={
							<ThemedText
								style={{
									fontSize: 32,
									fontWeight: "700",
									lineHeight: 32,
								}}
							>
								12
							</ThemedText>
						}
						iconName="arrow.forward.circle.fill"
						// onPress={() => navigate("/profile/matches")}
					/>

					<KpiCard
						title="Score totale"
						content={
							<ThemedText
								style={{
									fontSize: 32,
									fontWeight: "700",
									lineHeight: 32,
								}}
							>
								2.3
							</ThemedText>
						}
						iconName="arrow.forward.circle.fill"
						// onPress={() => navigate("/profile/score")}
					/>
				</View>
			</ScrollView>
		</View>
	);
}
