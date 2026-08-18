import { type ReactNode, useLayoutEffect, useRef, useState } from "react";
import { type StyleProp, View, type ViewStyle } from "react-native";
import Animated, {
	runOnJS,
	useAnimatedStyle,
	useSharedValue,
	withTiming,
} from "react-native-reanimated";

const DURATION = 280;
const BLUR_RADIUS = 7;

interface Slot {
	key: string;
	node: ReactNode;
}

/**
 * Sostituisce il proprio contenuto in dissolvenza incrociata: quello uscente
 * sfuma e si sfoca, quello entrante arriva a fuoco.
 *
 * Il cambio è guidato da `itemKey`, non dai children: due titoli diversi sono
 * due chiavi diverse, mentre un semplice re-render con lo stesso contenuto non
 * fa ripartire nulla.
 *
 * Lo sfocato usa la proprietà `filter` di React Native (Fabric): su iOS diventa
 * un layer SwiftUI, su Android un RenderEffect da API 31. Dove non è
 * supportata resta la sola dissolvenza, che regge la transizione da sola —
 * per questo a riposo il filtro viene rimosso del tutto invece di restare a
 * raggio zero, e il layer costoso non esiste quando non serve.
 */
export default function Crossfade({
	itemKey,
	children,
	style,
	duration = DURATION,
	blurRadius = BLUR_RADIUS,
}: {
	/** Identità del contenuto: cambiandola parte la transizione. */
	itemKey: string;
	children: ReactNode;
	style?: StyleProp<ViewStyle>;
	duration?: number;
	blurRadius?: number;
}) {
	// I children dell'ultimo render, per non doverli mettere fra le dipendenze
	// dell'effetto: cambiano identità a ogni render e lo farebbero ripartire.
	const latest = useRef<ReactNode>(children);
	latest.current = children;

	const [incoming, setIncoming] = useState<Slot>({
		key: itemKey,
		node: children,
	});
	const [outgoing, setOutgoing] = useState<Slot | null>(null);

	const progress = useSharedValue(1);

	// `useLayoutEffect` e non `useEffect`: azzerare il progresso prima del
	// disegno evita che il nuovo contenuto lampeggi a piena opacità per un
	// frame prima di iniziare a entrare.
	useLayoutEffect(() => {
		if (itemKey === incoming.key) return;

		setOutgoing(incoming);
		setIncoming({ key: itemKey, node: latest.current });

		progress.value = 0;
		progress.value = withTiming(1, { duration }, (finished) => {
			// Se ne è già partita un'altra ci penserà quella a fare pulizia
			if (finished) runOnJS(setOutgoing)(null);
		});
	}, [itemKey, incoming, duration, progress]);

	const incomingStyle = useAnimatedStyle(() => {
		const blur = (1 - progress.value) * blurRadius;
		return {
			opacity: progress.value,
			filter: blur > 0.01 ? [{ blur }] : [],
		};
	});

	const outgoingStyle = useAnimatedStyle(() => {
		const blur = progress.value * blurRadius;
		return {
			opacity: 1 - progress.value,
			filter: blur > 0.01 ? [{ blur }] : [],
		};
	});

	return (
		<View style={[{ justifyContent: "center" }, style]}>
			<Animated.View style={incomingStyle}>{incoming.node}</Animated.View>

			{/* Fuori dal flusso: il contenuto uscente non deve più occupare spazio,
			    altrimenti il layout salterebbe a metà transizione */}
			{outgoing && (
				<Animated.View
					pointerEvents="none"
					style={[
						{
							position: "absolute",
							left: 0,
							right: 0,
							top: 0,
							bottom: 0,
							justifyContent: "center",
						},
						outgoingStyle,
					]}
				>
					{outgoing.node}
				</Animated.View>
			)}
		</View>
	);
}
