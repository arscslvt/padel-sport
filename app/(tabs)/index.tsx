import Header from "@/components/header";
import SmoothView from "@/components/smooth-view";
import { Colors } from "@/constants/theme";
import { ScrollView, Text, View } from "react-native";

export default function TabsIndex() {
	return (
		<View style={{ flex: 1 }}>
			<ScrollView
				stickyHeaderIndices={[0]}
				style={{
					paddingBottom: 16,
					width: "100%",
					flex: 1,
				}}
			>
				<View>
					<Header withSafeAreaInsets={false} />
				</View>
				<View
					style={{
						flexDirection: "row",
						gap: 16,
						paddingHorizontal: 16,
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
