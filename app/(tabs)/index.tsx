import SmoothView from "@/components/smooth-view";
import { Colors } from "@/constants/theme";
import { ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function TabsIndex() {
	const { top } = useSafeAreaInsets();

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
						gap: 16,
						paddingHorizontal: 16,
						marginTop: 16,
					}}
				>
					<SmoothView
						radius={22}
						smoothing={1.6}
						shadow={false}
						style={{
							height: 124,
							flex: 1,
						}}
						borderWidth={1}
						borderColor={Colors.light.border}
					>
						<View style={{ padding: 16, flex: 1, justifyContent: "center" }}>
							<Text style={{ fontSize: 18, fontWeight: "600" }}>Ciao</Text>
						</View>
					</SmoothView>

					<SmoothView
						radius={22}
						smoothing={1.6}
						shadow={false}
						onPress={() => {}}
						style={{
							height: 124,
							flex: 1,
						}}
						borderWidth={1}
						borderColor={Colors.light.border}
					>
						<View style={{ padding: 16, flex: 1, justifyContent: "center" }}>
							<Text style={{ fontSize: 18, fontWeight: "600" }}></Text>
						</View>
					</SmoothView>
				</View>
			</ScrollView>
		</View>
	);
}
