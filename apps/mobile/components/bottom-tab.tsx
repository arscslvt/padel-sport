import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, Text, useWindowDimensions, View } from "react-native";
import Animated, {
	interpolateColor,
	useAnimatedStyle,
	useDerivedValue,
	withSpring,
	withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
	actionForRoute,
	bookAction,
	routes,
	type TabAction,
	type TabRoute,
} from "@/constants/routes";
import { Fonts } from "@/constants/fonts";
import { useTheme } from "@/hooks/use-theme";
import SmoothView from "./smooth-view";
import { IconSymbol } from "./ui/icon-symbol";

const AnimatedText = Animated.createAnimatedComponent(Text);

const BAR_HEIGHT = 72;
const DETACHED_SIZE = 64;
const GAP = 10;
const MAX_ITEM_WIDTH = 120;

interface BottomTabProps extends BottomTabBarProps {}

export function BottomTab({ state, navigation }: BottomTabProps) {
	const { bottom } = useSafeAreaInsets();
	const { width } = useWindowDimensions();
	const router = useRouter();
	const theme = useTheme();

	// Il pulsante "Prenota" sta fuori dalla barra: la larghezza degli item si
	// adatta allo spazio rimasto, così su schermi stretti nulla va a capo.
	const itemWidth = Math.min(
		MAX_ITEM_WIDTH,
		Math.floor((width - 24 - (DETACHED_SIZE + GAP)) / routes.length),
	);

	const activeIndex = state.index;
	const action = actionForRoute(state.routes[activeIndex]?.name);

	const animatedIndicatorStyle = useAnimatedStyle(() => {
		return {
			transform: [
				{
					translateX: withSpring(activeIndex * itemWidth, {
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
				alignItems: "center",
				gap: GAP,
			}}
		>
			<SmoothView
				radius={100}
				smoothing={1.6}
				style={{
					flexDirection: "row",
					justifyContent: "space-around",
					height: BAR_HEIGHT,
					position: "relative",
				}}
				borderWidth={1}
				borderColor={theme.tabBarBorder}
				backgroundColor={theme.elevated}
			>
				<Animated.View
					style={[
						{
							position: "absolute",
							left: 0,
							width: itemWidth,
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
				{routes.map((route, index) => (
					<BottomTabItem
						key={route.name}
						iconName={route.icon}
						label={route.title}
						width={itemWidth}
						state={index === activeIndex ? "active" : "default"}
						onPress={() => navigation.navigate(route.name)}
					/>
				))}
			</SmoothView>

			{/* Azione staccata: apre uno sheet, non è una tab. Stesso materiale
			    della barra, icona nel colore d'accento. Cosa apra dipende dalla
			    tab attiva (constants/routes.tsx) */}
			<SmoothView
				radius={100}
				smoothing={1.6}
				borderWidth={1}
				borderColor={theme.tabBarBorder}
				backgroundColor={theme.elevated}
				style={{
					height: DETACHED_SIZE,
					width: DETACHED_SIZE,
					alignItems: "center",
					justifyContent: "center",
				}}
				onPress={() => router.push(action.href)}
				accessibilityLabel={action.title}
			>
				<DetachedActionIcon action={action} />
			</SmoothView>
		</View>
	);
}

/**
 * Icona dell'azione staccata, in dissolvenza incrociata quando si passa a una
 * tab che ne cambia il significato.
 *
 * L'icona dell'azione specifica viene ricordata anche dopo che si è tornati
 * alla predefinita: senza, uscendo dalla tab Amici la lente sparirebbe di
 * scatto invece di sfumare via.
 */
function DetachedActionIcon({ action }: { action: TabAction }) {
	const theme = useTheme();
	const isOverride = action.href !== bookAction.href;

	const [overrideIcon, setOverrideIcon] = useState(action.icon);

	useEffect(() => {
		if (isOverride) setOverrideIcon(action.icon);
	}, [isOverride, action.icon]);

	const progress = useDerivedValue(() => withTiming(isOverride ? 1 : 0));

	const defaultStyle = useAnimatedStyle(() => ({
		opacity: 1 - progress.value,
	}));
	const overrideStyle = useAnimatedStyle(() => ({ opacity: progress.value }));

	return (
		<View style={{ width: 28, height: 28, alignItems: "center", justifyContent: "center" }}>
			<Animated.View style={[{ position: "absolute" }, defaultStyle]}>
				<IconSymbol name={bookAction.icon} size={28} color={theme.tint} />
			</Animated.View>
			<Animated.View style={[{ position: "absolute" }, overrideStyle]}>
				<IconSymbol name={overrideIcon} size={28} color={theme.tint} />
			</Animated.View>
		</View>
	);
}

type BottomTabItemProps = {
	iconName: TabRoute["icon"];
	label: string;
	width?: number;
	state: "active" | "default";
	onPress: () => void;
};

export function BottomTabItem({
	iconName,
	label,
	width = MAX_ITEM_WIDTH,
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
				width,
				paddingHorizontal: 8,
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
							name={iconName}
							size={24}
							color={theme.tabIconDefault}
						/>
					</Animated.View>
					<Animated.View
						style={[{ position: "absolute" }, animatedIconSelectedStyle]}
					>
						<IconSymbol
							name={iconName}
							size={24}
							color={theme.tabIconSelectedForeground}
						/>
					</Animated.View>
				</View>
				<AnimatedText
					numberOfLines={1}
					style={[
						{
							fontFamily: Fonts.medium,
							fontSize: 12,
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
