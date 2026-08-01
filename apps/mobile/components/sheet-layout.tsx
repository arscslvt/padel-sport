import { type ReactNode, type RefObject, useState } from "react";
import {
	type LayoutChangeEvent,
	ScrollView,
	StyleSheet,
	View,
} from "react-native";
import Animated, {
	useAnimatedKeyboard,
	useAnimatedStyle,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import ProgressiveBlur from "@/components/ui/progressive-blur";
import { useTheme } from "@/hooks/use-theme";

/** Margine orizzontale del contenuto e delle barre. */
export const SHEET_PADDING = 20;

type SheetLayoutProps = {
	/** Barra fissa in alto (titolo, avanzamento, ritorno). */
	header?: ReactNode;
	/** Barra fissa in basso, tipicamente l'azione principale. */
	footer?: ReactNode;
	children: ReactNode;
	scrollRef?: RefObject<ScrollView | null>;
	/** Distanza tra i blocchi del contenuto scorrevole. */
	gap?: number;
};

/**
 * Impaginazione delle schermate presentate come form sheet, con barre fisse
 * sopra e sotto il contenuto scorrevole.
 *
 * Dentro un form sheet react-native-screens assegna nativamente alla prima
 * ScrollView tra i figli del contenuto il frame dell'intero foglio, e avverte
 * se i figli diretti sono più di due (RNSScreenContentWrapper.mm): per questo
 * qui i figli sono esattamente la lista e una sola vista con le due barre, che
 * il contenuto attraversa scorrendo sotto al blur.
 */
export default function SheetLayout({
	header,
	footer,
	children,
	scrollRef,
	gap = 24,
}: SheetLayoutProps) {
	const theme = useTheme();
	const insets = useSafeAreaInsets();

	// Le barre sono sovrapposte al contenuto: misurandole sappiamo di quanto
	// scostarlo perché non finisca sotto al blur. Le stime iniziali evitano il
	// salto al primo layout e si adeguano al contenuto delle barre.
	const [barHeights, setBarHeights] = useState({
		header: header ? 140 : 0,
		footer: footer ? 110 : 0,
	});
	const measureBar =
		(bar: "header" | "footer") => (event: LayoutChangeEvent) => {
			const { height } = event.nativeEvent.layout;
			setBarHeights((current) =>
				Math.round(current[bar]) === Math.round(height)
					? current
					: { ...current, [bar]: height },
			);
		};

	// La barra in basso sale con la tastiera: è una traslazione, quindi non
	// tocca il layout del foglio.
	const keyboard = useAnimatedKeyboard();
	const footerStyle = useAnimatedStyle(() => ({
		transform: [
			{ translateY: -Math.max(keyboard.height.value - insets.bottom, 0) },
		],
	}));

	return (
		<>
			<ScrollView
				ref={scrollRef}
				style={{ flex: 1, backgroundColor: theme.background }}
				contentContainerStyle={{
					paddingHorizontal: SHEET_PADDING,
					paddingTop: header ? barHeights.header : SHEET_PADDING,
					paddingBottom: (footer ? barHeights.footer : 0) + 24,
					gap,
				}}
				keyboardShouldPersistTaps="handled"
				showsVerticalScrollIndicator={false}
				// Su iOS lascia spazio alla tastiera sotto al campo attivo
				automaticallyAdjustKeyboardInsets
			>
				{children}
			</ScrollView>

			{/* Barre flottanti: `box-none` lascia scorrere il contenuto in mezzo */}
			<View style={styles.bars} pointerEvents="box-none" collapsable={false}>
				{header ? (
					<View
						onLayout={measureBar("header")}
						style={{
							paddingHorizontal: SHEET_PADDING,
							paddingTop: 18,
							paddingBottom: 16,
							gap: 14,
						}}
					>
						<ProgressiveBlur direction="down" />
						{header}
					</View>
				) : (
					<View />
				)}

				{footer ? (
					<Animated.View
						onLayout={measureBar("footer")}
						style={[
							{
								paddingHorizontal: SHEET_PADDING,
								paddingTop: 16,
								paddingBottom: Math.max(insets.bottom, 16),
							},
							footerStyle,
						]}
					>
						<ProgressiveBlur direction="up" />
						{footer}
					</Animated.View>
				) : (
					<View />
				)}
			</View>
		</>
	);
}

const styles = StyleSheet.create({
	/** Le due barre agli estremi del foglio, sopra il contenuto scorrevole. */
	bars: {
		position: "absolute",
		top: 0,
		bottom: 0,
		left: 0,
		right: 0,
		justifyContent: "space-between",
	},
});
