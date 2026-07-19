import { NativeTabs } from "expo-router/unstable-native-tabs";
import { routes } from "@/constants/routes";
import { useTheme } from "@/hooks/use-theme";

/**
 * Layout tab per iOS: usa la tab bar nativa di sistema (UITabBarController),
 * che su iOS 26 rende automaticamente l'effetto Liquid Glass e su versioni
 * precedenti la classica barra traslucida di sistema.
 */
export default function TabsLayout() {
	const theme = useTheme();

	return (
		<NativeTabs tintColor={theme.tint} minimizeBehavior="onScrollDown">
			{routes.map((route) => (
				<NativeTabs.Trigger key={route.name} name={route.name}>
					<NativeTabs.Trigger.Icon sf={route.icon} />
					<NativeTabs.Trigger.Label>{route.title}</NativeTabs.Trigger.Label>
				</NativeTabs.Trigger>
			))}
		</NativeTabs>
	);
}
