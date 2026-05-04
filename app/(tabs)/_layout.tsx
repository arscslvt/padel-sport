import Header from "@/components/header";
import { BottomTab } from "@/components/tabs";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useTheme } from "@/hooks/use-theme";
import { Tabs } from "expo-router";

export default function TabsLayout() {
	const theme = useTheme();

	return (
		<Tabs
			safeAreaInsets={{ bottom: 0 }}
			tabBar={(props) => <BottomTab {...props} />}
			screenOptions={{
				sceneStyle: { backgroundColor: theme.background },
				headerTransparent: true,
				header: () => <Header withSafeAreaInsets />,
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
