import type { ReactNode } from "react";
import { View } from "react-native";
import { Avatar } from "@/components/open-match-card";
import SmoothView from "@/components/smooth-view";
import { ThemedText } from "@/components/themed-text";
import { useTheme } from "@/hooks/use-theme";
import { formatLevel, type PlayerView } from "@/lib/format";

/**
 * Riga di un giocatore negli elenchi degli amici: foto, nome, livello e
 * codice, con a destra l'azione che il contesto richiede (aggiungi,
 * accetta, rimuovi…).
 */
export default function PlayerRow({
	player,
	action,
	onPress,
}: {
	player: PlayerView;
	action?: ReactNode;
	onPress?: () => void;
}) {
	const theme = useTheme();

	return (
		<SmoothView
			radius={18}
			smoothing={1}
			backgroundColor={theme.elevated}
			borderColor={theme.border}
			borderWidth={1}
			shadow={false}
			onPress={onPress}
		>
			<View
				style={{
					padding: 12,
					flexDirection: "row",
					alignItems: "center",
					gap: 12,
				}}
			>
				<Avatar url={player.avatarUrl} size={44} />

				<View style={{ flex: 1, gap: 2 }}>
					<ThemedText
						style={{ fontSize: 16, fontWeight: "600" }}
						numberOfLines={1}
					>
						{player.name}
					</ThemedText>
					<ThemedText style={{ fontSize: 13, color: theme.textMuted }}>
						Liv. {formatLevel(player.level)}
						{player.code ? ` · #${player.code}` : ""}
					</ThemedText>
				</View>

				{action}
			</View>
		</SmoothView>
	);
}
