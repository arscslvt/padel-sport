import Header from "@/components/header";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Tabs } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function TabsLayout() {
	const { bottom } = useSafeAreaInsets();

	return (
		<Tabs
			safeAreaInsets={{ bottom: 0 }}
			screenOptions={{
				header: () => <Header withSafeAreaInsets />,
				tabBarActiveTintColor: "#fff",
				tabBarInactiveTintColor: "#687076",
				tabBarActiveBackgroundColor: "#003b28",
				tabBarStyle: {
					position: "absolute",
					bottom: bottom > 0 ? bottom : 20,
					marginHorizontal: 16,
					left: 0,
					right: 0,
					height: 70,
					paddingTop: 0,
					paddingBottom: 0,
					backgroundColor: "#fff",
					borderRadius: 35,
					borderTopWidth: 0,
					shadowColor: "#000",
					shadowOffset: { width: 0, height: 5 },
					shadowOpacity: 0.1,
					shadowRadius: 10,
					elevation: 3,
				},
				tabBarItemStyle: {
					marginVertical: 4,
					marginHorizontal: 5,
					borderRadius: 100,
					overflow: "hidden",
				},
				tabBarIconStyle: {
					marginTop: 5, // Aggiunge scarto in alto per bilanciare il "flex-start" interno di React Navigation
				},
				tabBarLabelStyle: {
					fontSize: 12,
					fontWeight: "500",
					marginBottom: 5, // Spinge leggermente dal basso per completare il centro
				},
			}}
		>
			<Tabs.Screen
				name="index"
				options={{
					title: "Home",
					tabBarIcon: ({ color }) => (
						<IconSymbol size={28} name="house.fill" color={color} />
					),
				}}
			/>
			<Tabs.Screen
				name="bookings"
				options={{
					title: "Prenotazioni",
					tabBarIcon: ({ color }) => (
						<IconSymbol size={28} name="calendar" color={color} />
					),
				}}
			/>
			<Tabs.Screen
				name="rankings"
				options={{
					title: "Classifiche",
					tabBarIcon: ({ color }) => (
						<IconSymbol size={28} name="trophy" color={color} />
					),
				}}
			/>
		</Tabs>
	);
}
