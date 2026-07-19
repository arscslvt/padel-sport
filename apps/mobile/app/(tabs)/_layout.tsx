import { Tabs } from "expo-router";
import { BottomTab } from "@/components/bottom-tab";
import { routes } from "@/constants/routes";

/**
 * Layout tab per Android e web: mantiene la bottom bar custom animata.
 * Su iOS viene usato _layout.ios.tsx con la tab bar nativa (Liquid Glass).
 * L'header è renderizzato dalle singole schermate tramite <TabScreen>.
 */
export default function TabsLayout() {
	return (
		<Tabs
			safeAreaInsets={{ bottom: 0 }}
			tabBar={(props) => <BottomTab {...props} />}
			screenOptions={{ headerShown: false }}
		>
			{routes.map((route) => (
				<Tabs.Screen
					key={route.name}
					name={route.name}
					options={{ title: route.title }}
				/>
			))}
		</Tabs>
	);
}
