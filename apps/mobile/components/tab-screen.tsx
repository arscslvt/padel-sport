import type { PropsWithChildren } from "react";
import { StyleSheet, View } from "react-native";
import Header from "@/components/header";
import { useTheme } from "@/hooks/use-theme";

/**
 * Contenitore condiviso per le schermate delle tab: applica lo sfondo del tema
 * e sovrappone l'header flottante. L'header vive qui (e non nel navigator)
 * perché su iOS NativeTabs non supporta header JS custom.
 */
export default function TabScreen({ children }: PropsWithChildren) {
	const theme = useTheme();

	return (
		<View style={[styles.container, { backgroundColor: theme.background }]}>
			{children}
			<View style={styles.header} pointerEvents="box-none">
				<Header withSafeAreaInsets />
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
	},
	header: {
		position: "absolute",
		top: 0,
		left: 0,
		right: 0,
	},
});
