import { useTheme } from "@/hooks/use-theme";
import { Canvas, Group, Path, Skia } from "@shopify/react-native-skia";
import { getSvgPath } from "figma-squircle";
import React from "react";
import {
	type LayoutChangeEvent,
	Platform,
	Pressable,
	type StyleProp,
	StyleSheet,
	View,
	type ViewStyle,
} from "react-native";
import Animated, {
	useAnimatedStyle,
	useSharedValue,
	withSpring,
} from "react-native-reanimated";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type Props = {
	children?: React.ReactNode;
	style?: StyleProp<ViewStyle>;

	// shape
	radius?: number; // corner radius base
	smoothing?: number; // 0–1 (≈ Figma)
	backgroundColor?: string;
	borderColor?: string;
	borderWidth?: number;

	// interaction
	onPress?: () => void;
	disabled?: boolean;

	// visuals
	shadow?: boolean;
};

export default function SmoothView({
	children,
	style,
	radius = 20,
	smoothing = 0.7,
	backgroundColor = "#fff",
	borderColor,
	borderWidth = 1,
	onPress,
	disabled,
	shadow = true,
}: Props) {
	const theme = useTheme();
	const [layout, setLayout] = React.useState({ w: 0, h: 0 });

	const scale = useSharedValue(1);

	const animatedStyle = useAnimatedStyle(() => ({
		transform: [{ scale: scale.value }],
	}));

	const handlePressIn = () => {
		if (!disabled) {
			scale.value = withSpring(0.96, {
				damping: 20,
				stiffness: 600,
				mass: 0.5,
			});
		}
	};

	const handlePressOut = () => {
		if (!disabled) {
			scale.value = withSpring(1, { damping: 18, stiffness: 500, mass: 0.5 });
		}
	};

	const onLayout = (e: LayoutChangeEvent) => {
		const { width, height } = e.nativeEvent.layout;
		if (width !== layout.w || height !== layout.h) {
			setLayout({ w: width, h: height });
		}
	};

	const svgString = React.useMemo(() => {
		if (layout.w === 0 || layout.h === 0) return null;

		// Figma squircle expects smoothing between 0 and 1
		const clampedSmoothing = Math.max(0, Math.min(1, smoothing));

		return getSvgPath({
			width: layout.w,
			height: layout.h,
			cornerRadius: radius,
			cornerSmoothing: clampedSmoothing,
		});
	}, [layout.w, layout.h, radius, smoothing]);

	const path = React.useMemo(() => {
		if (!svgString) return null;
		return Skia.Path.MakeFromSVGString(svgString);
	}, [svgString]);

	const inner = (
		<>
			{layout.w > 0 && layout.h > 0 && path && (
				<Canvas
					style={[StyleSheet.absoluteFill, { zIndex: -1 }]}
					pointerEvents="none"
				>
					<Group clip={path}>
						<Path path={path} color={backgroundColor} />
						{borderColor && borderWidth > 0 && (
							<Path
								path={path}
								color={borderColor}
								style="stroke"
								strokeWidth={borderWidth * 2}
							/>
						)}
					</Group>
				</Canvas>
			)}
			<View style={StyleSheet.absoluteFill} pointerEvents="none" />
			{children}
		</>
	);

	const baseStyle = [
		styles.container,
		shadow ? { ...styles.shadow, shadowColor: theme.shadow } : undefined,
		style,
	];

	if (onPress) {
		return (
			<AnimatedPressable
				onPressIn={handlePressIn}
				onPressOut={handlePressOut}
				onPress={onPress}
				disabled={disabled}
				onLayout={onLayout}
				style={[baseStyle, animatedStyle]}
				hitSlop={8}
			>
				{inner}
			</AnimatedPressable>
		);
	}

	return (
		<View onLayout={onLayout} style={StyleSheet.flatten(baseStyle)}>
			{inner}
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		overflow: "visible", // Evitiamo clip dell'ombra nativa su iOS
	},

	shadow: Platform.select({
		ios: {
			shadowOpacity: 1,
			shadowRadius: 10,
			shadowOffset: { width: 0, height: 4 },
		},
		android: {
			elevation: 4,
		},
		default: {},
	}) as ViewStyle,
});
