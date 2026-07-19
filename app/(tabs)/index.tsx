import { useRouter } from "expo-router";
import { ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import KpiCard from "@/components/kpi-card";
import OpenMatchCard from "@/components/open-match-card";
import SmoothView from "@/components/smooth-view";
import TabScreen from "@/components/tab-screen";
import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { openMatches } from "@/constants/mock-data";
import { useTabBarInset } from "@/hooks/use-tab-bar-inset";
import { useTheme } from "@/hooks/use-theme";

export default function TabsIndex() {
	const { top } = useSafeAreaInsets();
	const theme = useTheme();
	const router = useRouter();
	const tabBarInset = useTabBarInset();

	return (
		<TabScreen>
			<ScrollView
				contentContainerStyle={{
					paddingBottom: tabBarInset,
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
						title="Partite del mese"
						content={
							<ThemedText
								style={{
									fontSize: 32,
									fontWeight: "700",
									lineHeight: 32,
									color: theme.textTinted,
								}}
							>
								4
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
									color: theme.textTinted,
								}}
							>
								2.3
							</ThemedText>
						}
						iconName="arrow.forward.circle.fill"
						// onPress={() => navigate("/profile/score")}
					/>
				</View>

				<View style={{ paddingHorizontal: 16, marginTop: 24 }}>
					<View>
						<ThemedText type="title">Prenotazioni</ThemedText>
					</View>

					<View
						style={{
							marginVertical: 18,
							flexDirection: "row",
							alignItems: "center",
							gap: 18,
						}}
					>
						<View style={{ flex: 1 }}>
							<ThemedText
								style={{
									fontSize: 16,
									lineHeight: 24,
									fontWeight: "500",
								}}
							>
								Non hai ancora prenotato
							</ThemedText>
							<ThemedText
								type="subtitle"
								style={{
									fontSize: 16,
									lineHeight: 24,
									fontWeight: 400,
								}}
								numberOfLines={2}
							>
								Che aspetti? Prenota e riunisci la tua squadra
							</ThemedText>
						</View>
						<View
							style={{
								flexDirection: "row",
								alignItems: "center",
								gap: 4,
							}}
						>
							<SmoothView
								backgroundColor={theme.tint}
								radius={22}
								smoothing={1}
								style={{
									height: 90,
									width: 90,
									gap: 4,
									justifyContent: "center",
									alignItems: "center",
								}}
								onPress={() => router.push("/book")}
							>
								<IconSymbol
									name="plus"
									size={24}
									color={theme.tintForeground}
								/>
								<ThemedText
									type="link"
									style={{
										fontSize: 14,
										lineHeight: 22,
										fontWeight: "500",
										color: theme.tintForeground,
										textAlign: "center",
									}}
								>
									Prenota
								</ThemedText>
							</SmoothView>
						</View>
					</View>
				</View>

				<View style={{ paddingHorizontal: 16, marginTop: 24, gap: 14 }}>
					<View style={{ gap: 2 }}>
						<ThemedText type="title">Partite aperte</ThemedText>
						<ThemedText
							type="subtitle"
							style={{ fontSize: 15, lineHeight: 22, fontWeight: 400 }}
						>
							Giocatori che cercano compagni di gioco
						</ThemedText>
					</View>

					{openMatches.map((match) => (
						<OpenMatchCard
							key={match.id}
							match={match}
							onPress={() =>
								router.push({
									pathname: "/match/[id]",
									params: { id: match.id },
								})
							}
						/>
					))}
				</View>
			</ScrollView>
		</TabScreen>
	);
}
