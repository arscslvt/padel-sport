import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { useRouter } from "expo-router";
import { Pressable, Text, useWindowDimensions, View } from "react-native";
import Animated, {
	interpolateColor,
	useAnimatedStyle,
	useDerivedValue,
	withSpring,
	withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { bookAction, routes, type TabRoute } from "@/constants/routes";
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

			{/* Azione staccata: apre lo sheet di prenotazione, non è una tab.
			    Stesso materiale della barra, icona nel colore d'accento */}
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
				onPress={() => router.push(bookAction.href)}
			>
				<IconSymbol name={bookAction.icon} size={28} color={theme.tint} />
			</SmoothView>
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
							fontWeight: "500",
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
