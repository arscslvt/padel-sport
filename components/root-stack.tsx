import { useTheme } from "@/hooks/use-theme";
import { Stack } from "expo-router";

export default function RootStack() {
	const theme = useTheme();
	return (
		<Stack
			screenOptions={{
				contentStyle: { backgroundColor: theme.background },
			}}
		>
			<Stack.Screen name="(tabs)" options={{ headerShown: false }} />
		</Stack>
	);
}
