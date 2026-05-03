import { Colors } from "@/constants/theme";
import { NativeTabs } from "expo-router/build/native-tabs/NativeTabs";

export default function TabsLayout() {
	return (
		<NativeTabs tintColor={Colors.light.tint}>
			<NativeTabs.Trigger name="index">
				<NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
				<NativeTabs.Trigger.Icon sf={"house.fill"} />
			</NativeTabs.Trigger>
			<NativeTabs.Trigger name="bookings">
				<NativeTabs.Trigger.Label>Prenotazioni</NativeTabs.Trigger.Label>
				<NativeTabs.Trigger.Icon sf={"calendar"} />
			</NativeTabs.Trigger>
			<NativeTabs.Trigger name="rankings">
				<NativeTabs.Trigger.Label>Classifiche</NativeTabs.Trigger.Label>
				<NativeTabs.Trigger.Icon sf={"trophy"} />
			</NativeTabs.Trigger>
		</NativeTabs>
	);
}
