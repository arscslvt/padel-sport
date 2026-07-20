import { Tabs } from "expo-router";
import { Platform } from "react-native";
import { BottomTab } from "@/components/bottom-tab";
import NativeTabsLayout from "@/components/native-tabs-layout";
import { routes, USE_NATIVE_TABS } from "@/constants/routes";

/**
 * Layout delle tab: per ora la bottom bar custom animata su tutte le
 * piattaforme, così il pulsante "Prenota" resta agganciato alla barra.
 * Con `USE_NATIVE_TABS` si torna alla tab bar nativa su iOS.
 * L'header è renderizzato dalle singole schermate tramite <TabScreen>.
 */
export default function TabsLayout() {
	if (USE_NATIVE_TABS && Platform.OS === "ios") {
		return <NativeTabsLayout />;
	}

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
