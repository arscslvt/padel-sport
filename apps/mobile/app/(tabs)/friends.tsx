import { useState } from "react";
import { ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import CirclesList from "@/components/friends/circles-list";
import FriendsList from "@/components/friends/friends-list";
import TabScreen from "@/components/tab-screen";
import { Tabs, TabsItem, TabsList } from "@/components/ui/tabs";
import { useTabBarInset } from "@/hooks/use-tab-bar-inset";

type Section = "friends" | "circles";

/**
 * Tab "Amici": le amicizie e le cerchie, separate da un segmented control.
 *
 * Le due sezioni restano montate a turno (non con `TabsContent`, che le
 * terrebbe entrambe nell'albero) perché ognuna ha la sua query Convex e non ha
 * senso tenerle vive tutte e due.
 *
 * Da qui non si cercano nuovi giocatori: quello lo fa il pulsante con la lente
 * della tab bar (constants/routes.tsx), che su questa tab prende il posto
 * del "+" di prenotazione.
 */
export default function FriendsScreen() {
	const { top } = useSafeAreaInsets();
	const bottomInset = useTabBarInset();

	const [section, setSection] = useState<Section>("friends");

	return (
		<TabScreen>
			<ScrollView
				style={{ flex: 1 }}
				contentContainerStyle={{
					paddingTop: top + 54,
					paddingHorizontal: 16,
					paddingBottom: bottomInset,
				}}
				keyboardShouldPersistTaps="handled"
			>
				{/* Il titolo "Amici" sta nell'header (components/tab-screen.tsx) */}
				<View style={{ marginTop: 8, gap: 18 }}>
					<Tabs
						defaultTab="friends"
						value={section}
						onTabChange={(tab) => setSection(tab as Section)}
					>
						<TabsList>
							<TabsItem name="friends" title="Amici" />
							<TabsItem name="circles" title="Cerchie" />
						</TabsList>
					</Tabs>

					{section === "friends" ? <FriendsList /> : <CirclesList />}
				</View>
			</ScrollView>
		</TabScreen>
	);
}
