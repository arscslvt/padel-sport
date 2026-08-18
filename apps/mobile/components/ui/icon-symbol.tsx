// Fallback for using MaterialIcons on Android and web.

import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import type { SymbolWeight } from "expo-symbols";
import type { ComponentProps } from "react";
import type { OpaqueColorValue, StyleProp, TextStyle } from "react-native";

type IconMapping = Partial<
	Record<string, ComponentProps<typeof MaterialIcons>["name"]>
>;
type IconSymbolName = keyof typeof MAPPING;

/**
 * Add your SF Symbols to Material Icons mappings here.
 * - see Material Icons in the [Icons Directory](https://icons.expo.fyi).
 * - see SF Symbols in the [SF Symbols](https://developer.apple.com/sf-symbols/) app.
 */
const MAPPING = {
	"house.fill": "home",
	"paperplane.fill": "send",
	"chevron.left.forwardslash.chevron.right": "code",
	"chevron.right": "chevron-right",
	"chevron.left": "chevron-left",
	pencil: "edit",
	"figure.tennis": "sports-tennis",
	"person.fill": "person",
	calendar: "event",
	trophy: "emoji-events",
	"arrow.forward.circle.fill": "arrow-circle-right",
	plus: "add",
	xmark: "close",
	"bolt.fill": "flash-on",
	"envelope.fill": "mail",
	"person.2.fill": "group",
	"mappin.and.ellipse": "place",
	"clock.fill": "schedule",
	"note.text": "notes",
	"checkmark.circle.fill": "check-circle",
	"person.crop.circle.badge.plus": "person-add",
	"arrow.right": "arrow-forward",
	lifepreserver: "support",
	"lock.fill": "lock",
	"camera.fill": "photo-camera",
	trash: "delete",
	"rectangle.portrait.and.arrow.right": "logout",
	"questionmark.circle": "help-outline",
	magnifyingglass: "search",
	"person.3.fill": "groups",
	"person.badge.plus": "person-add-alt",
	"person.2.badge.plus": "group-add",
	globe: "public",
	"arrow.right.circle.fill": "arrow-circle-right",
	"xmark.circle.fill": "cancel",
	"circle.dashed": "radio-button-unchecked",
	"checkmark.circle": "check-circle-outline",
	"bubble.left.fill": "chat-bubble",
	"calendar.badge.plus": "event-available",
} as IconMapping;

/**
 * An icon component that uses native SF Symbols on iOS, and Material Icons on Android and web.
 * This ensures a consistent look across platforms, and optimal resource usage.
 * Icon `name`s are based on SF Symbols and require manual mapping to Material Icons.
 */
export function IconSymbol({
	name,
	size = 24,
	color,
	style,
}: {
	name: IconSymbolName;
	size?: number;
	color: string | OpaqueColorValue;
	style?: StyleProp<TextStyle>;
	weight?: SymbolWeight;
}) {
	return (
		<MaterialIcons
			color={color}
			size={size}
			name={MAPPING[name]}
			style={style}
		/>
	);
}
