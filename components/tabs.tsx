import { routes } from "@/constants/routes";
import { useTheme } from "@/hooks/use-theme";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { Pressable, Text, View } from "react-native";
import Animated, {
	interpolateColor,
	useAnimatedStyle,
	useDerivedValue,
	withSpring,
	withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import SmoothView from "./smooth-view";
import { IconSymbol } from "./ui/icon-symbol";

const AnimatedText = Animated.createAnimatedComponent(Text);

interface BottomTabProps extends BottomTabBarProps {}

export function BottomTab({
	state,
	navigation,
	insets,
	descriptors,
}: BottomTabProps) {
	const { bottom } = useSafeAreaInsets();
	const theme = useTheme();

	const animatedIndicatorStyle = useAnimatedStyle(() => {
		return {
			transform: [
				{
					translateX: withSpring(state.index * 120, {
						damping: 24,
						stiffness: 360,
						mass: 1,
					}),
				},
			],
		};
	});

	return (
		<View
			style={{
				backgroundColor: "transparent",
				paddingBottom: bottom,
				flexDirection: "row",
				justifyContent: "center",
			}}
		>
			<SmoothView
				radius={100}
				smoothing={1.6}
				style={{
					flexDirection: "row",
					justifyContent: "space-around",
					height: 76,
					position: "relative",
				}}
				borderWidth={1}
				borderColor={theme.tabBarBorder}
			>
				<Animated.View
					style={[
						{
							position: "absolute",
							left: 0,
							width: 120,
							height: "100%",
							padding: 4,
						},
						animatedIndicatorStyle,
					]}
				>
					<View
						style={{
							backgroundColor: theme.tabIconSelectedBackground,
							borderRadius: 99,
							height: "100%",
						}}
					/>
				</Animated.View>
				{routes.map((route) => (
					<BottomTabItem
						key={route.name}
						iconName={route.iconName}
						label={route.displayName}
						state={
							state.index === routes.findIndex((r) => r.name === route.name)
								? "active"
								: "default"
						}
						onPress={() => navigation.navigate(route.name)}
					/>
				))}
			</SmoothView>
		</View>
	);
}

type BottomTabItemProps = {
	iconName: string;
	label: string;
	state: "active" | "default";
	onPress: () => void;
};

export function BottomTabItem({
	iconName,
	label,
	state = "default",
	onPress,
}: BottomTabItemProps) {
	const theme = useTheme();

	const progress = useDerivedValue(() => {
		return withTiming(state === "active" ? 1 : 0);
	});

	const animatedTextStyle = useAnimatedStyle(() => {
		return {
			color: interpolateColor(
				progress.value,
				[0, 1],
				[theme.tabIconDefault, theme.tabIconSelectedForeground],
			),
		};
	});

	const animatedIconSelectedStyle = useAnimatedStyle(() => {
		return { opacity: progress.value };
	});

	const animatedIconDefaultStyle = useAnimatedStyle(() => {
		return { opacity: 1 - progress.value };
	});

	return (
		<Pressable
			style={{
				width: 120,
				paddingHorizontal: 16,
				alignItems: "center",
				justifyContent: "center",
				gap: 4,
				height: "100%",
			}}
			onPress={onPress}
		>
			<View style={{ alignItems: "center", justifyContent: "center", gap: 4 }}>
				<View
					style={{
						width: 24,
						height: 24,
						justifyContent: "center",
						alignItems: "center",
					}}
				>
					<Animated.View
						style={[{ position: "absolute" }, animatedIconDefaultStyle]}
					>
						<IconSymbol
							name={iconName as any}
							size={24}
							color={theme.tabIconDefault}
						/>
					</Animated.View>
					<Animated.View
						style={[{ position: "absolute" }, animatedIconSelectedStyle]}
					>
						<IconSymbol
							name={iconName as any}
							size={24}
							color={theme.tabIconSelectedForeground}
						/>
					</Animated.View>
				</View>
				<AnimatedText
					numberOfLines={1}
					style={[
						{
							fontWeight: "500",
						},
						animatedTextStyle,
					]}
				>
					{label}
				</AnimatedText>
			</View>
		</Pressable>
	);
}
