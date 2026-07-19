import { useTheme } from "@/hooks/use-theme";
import React, { Children, createContext, useContext, useState } from "react";
import { Pressable, Text, View } from "react-native";
import Animated, {
	interpolateColor,
	useAnimatedStyle,
	useDerivedValue,
	withTiming,
} from "react-native-reanimated";

const AnimatedText = Animated.createAnimatedComponent(Text);

interface TabsContextType {
	activeTab: string;
	value?: string;
	setActiveTab: (tab: string) => void;
}

const TabsContext = createContext<TabsContextType | undefined>(undefined);

interface TabsProps {
	children: React.ReactNode;
	defaultTab: string;
	value?: string;
	onTabChange?: (tab: string) => void;
}

export function Tabs({ children, defaultTab, value, onTabChange }: TabsProps) {
	const [internalActiveTab, setInternalActiveTab] = useState(defaultTab);

	const activeTab = value !== undefined ? value : internalActiveTab;

	const setActiveTab = (tab: string) => {
		setInternalActiveTab(tab);
		if (onTabChange) {
			onTabChange(tab);
		}
	};

	return (
		<TabsContext.Provider value={{ activeTab, value, setActiveTab }}>
			<View
				style={{
					gap: 12,
					marginBottom: 16,
				}}
			>
				{children}
			</View>
		</TabsContext.Provider>
	);
}

export function TabsList({ children }: { children: React.ReactNode }) {
	const theme = useTheme();
	const context = useContext(TabsContext);
	const [width, setWidth] = useState(0);

	const items = Children.toArray(children);
	const numTabs = items.length;
	const activeIndex = items.findIndex(
		(child) =>
			React.isValidElement<{ name?: string }>(child) &&
			child.props.name === context?.activeTab,
	);

	const tabWidth = width > 0 ? (width - 12) / Math.max(1, numTabs) : 0; // 12 for padding (6 left + 6 right)

	const animatedStyle = useAnimatedStyle(() => {
		return {
			transform: [
				{
					translateX: withTiming(Math.max(0, activeIndex) * tabWidth, {
						duration: 250,
					}),
				},
			],
		};
	});

	return (
		<View
			onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
			style={{
				flexDirection: "row",
				alignItems: "center",
				padding: 6,
				borderRadius: 48,
				height: 52,
				backgroundColor: theme.elevated,
				borderWidth: 1,
				borderColor: theme.tabBarBorder,
				shadowColor: theme.shadow,
				shadowOffset: { width: 0, height: 3 },
				shadowOpacity: 1,
				shadowRadius: 4,
				position: "relative",
			}}
		>
			{width > 0 && numTabs > 0 && (
				<Animated.View
					style={[
						{
							position: "absolute",
							left: 6,
							height: "100%",
							width: tabWidth,
							backgroundColor: theme.tint,
							borderRadius: 38,
						},
						animatedStyle,
					]}
				/>
			)}
			{children}
		</View>
	);
}

interface TabsItemProps {
	title: string;
	name: string;
	onPress?: () => void;
	active?: boolean;
}

export function TabsItem({
	title,
	name,
	onPress,
	active: externalActive,
}: TabsItemProps) {
	const theme = useTheme();
	const context = useContext(TabsContext);

	const isActive =
		externalActive !== undefined ? externalActive : context?.activeTab === name;

	const progress = useDerivedValue(() => {
		return withTiming(isActive ? 1 : 0, { duration: 250 });
	});

	const animatedTextStyle = useAnimatedStyle(() => {
		return {
			color: interpolateColor(
				progress.value,
				[0, 1],
				[theme.textMuted, theme.tintForeground],
			),
		};
	});

	const handlePress = () => {
		if (context) {
			context.setActiveTab(name);
		}
		if (onPress) {
			onPress();
		}
	};

	return (
		<Pressable
			onPress={handlePress}
			style={{
				flex: 1,
				flexDirection: "row",
				overflow: "hidden",
				height: "100%",
			}}
			hitSlop={8}
		>
			<View
				style={{
					borderRadius: 38,
					backgroundColor: "transparent",
					height: "100%",
					flexDirection: "row",
					alignItems: "center",
					justifyContent: "center",
					paddingHorizontal: 12,
					flex: 1,
				}}
			>
				<AnimatedText
					style={[
						{
							fontSize: 16,
							fontWeight: "500",
						},
						animatedTextStyle,
					]}
				>
					{title}
				</AnimatedText>
			</View>
		</Pressable>
	);
}

interface TabsContentProps {
	children: React.ReactNode;
	name: string;
}

export function TabsContent({ children, name }: TabsContentProps) {
	const context = useContext(TabsContext);

	if (context && context.activeTab !== name) {
		return null;
	}

	return <View style={{ flex: 1 }}>{children}</View>;
}
