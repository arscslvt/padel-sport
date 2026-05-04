import { Colors } from "@/constants/theme";
import { useColorScheme } from "react-native";

export function useTheme() {
	const scheme = useColorScheme(); // may be 'light' | 'dark' | others
	return scheme === "dark" ? Colors.dark : Colors.light;
}
