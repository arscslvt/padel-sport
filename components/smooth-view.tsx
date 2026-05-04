import {
	Canvas,
	Group,
	RoundedRect,
	rect,
	rrect,
} from "@shopify/react-native-skia";
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
	const [layout, setLayout] = React.useState({ w: 0, h: 0 });

	const onLayout = (e: LayoutChangeEvent) => {
		const { width, height } = e.nativeEvent.layout;
		if (width !== layout.w || height !== layout.h) {
			setLayout({ w: width, h: height });
		}
	};

	// Approssimazione smoothing:
	// aumentiamo leggermente il raggio effettivo
	const effectiveRadius = radius * (1 + smoothing * 0.6);

	const inner = (
		<>
			{layout.w > 0 && layout.h > 0 && (
				<Canvas
					style={[StyleSheet.absoluteFill, { zIndex: -1 }]}
					pointerEvents="none"
				>
					<Group
						clip={rrect(
							rect(0, 0, layout.w, layout.h),
							effectiveRadius,
							effectiveRadius,
						)}
					>
						<RoundedRect
							x={0}
							y={0}
							width={layout.w}
							height={layout.h}
							r={effectiveRadius}
							color={backgroundColor}
						/>
						{borderColor && borderWidth > 0 && (
							<RoundedRect
								x={borderWidth / 2}
								y={borderWidth / 2}
								width={Math.max(0, layout.w - borderWidth)}
								height={Math.max(0, layout.h - borderWidth)}
								r={Math.max(0, effectiveRadius - borderWidth / 2)}
								color={borderColor}
								style="stroke"
								strokeWidth={borderWidth}
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
		shadow ? styles.shadow : undefined,
		style,
	];

	if (onPress) {
		return (
			<Pressable
				onPress={onPress}
				disabled={disabled}
				onLayout={onLayout}
				style={({ pressed }) => [
					styles.container,
					shadow ? styles.shadow : undefined,
					style,
					pressed && !disabled && styles.pressed,
				]}
			>
				{inner}
			</Pressable>
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

	pressed: {
		opacity: 0.7,
		transform: [{ scale: 0.98 }],
	},

	shadow: Platform.select({
		ios: {
			shadowColor: "#F5F5F5",
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
