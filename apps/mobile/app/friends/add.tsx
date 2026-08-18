import { api } from "@padel-sport/backend/convex/_generated/api";
import type { Id } from "@padel-sport/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
	ActivityIndicator,
	Alert,
	Platform,
	Pressable,
	View,
} from "react-native";
import PlayerRow from "@/components/friends/player-row";
import SheetLayout from "@/components/sheet-layout";
import { ThemedText } from "@/components/themed-text";
import { Hint } from "@/components/ui/choice";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { TextField } from "@/components/ui/text-field";
import { Fonts } from "@/constants/fonts";
import { useCurrentPlayer } from "@/hooks/use-current-player";
import { useTheme } from "@/hooks/use-theme";
import { convexErrorMessage } from "@/lib/format";

/** Sotto le due lettere la ricerca non parte: troppi risultati inutili. */
const MIN_TERM = 2;

/** Ricerca di nuovi amici per nome o codice giocatore. */
export default function AddFriend() {
	const theme = useTheme();
	const router = useRouter();
	const { player } = useCurrentPlayer();

	const [term, setTerm] = useState("");
	const [pendingId, setPendingId] = useState<string | null>(null);

	const trimmed = term.trim();
	const results = useQuery(
		api.modules.friends.search.default,
		trimmed.length >= MIN_TERM ? { term: trimmed } : "skip",
	);
	const request = useMutation(api.modules.friends.request.default);

	const searching = trimmed.length >= MIN_TERM && results === undefined;

	const add = async (playerId: Id<"players">, name: string) => {
		setPendingId(playerId);
		try {
			const outcome = await request({ playerId });
			Alert.alert(
				outcome.status === "accepted" ? "Siete amici! 🎾" : "Richiesta inviata",
				outcome.status === "accepted"
					? `${name} ti aveva già cercato: ora siete amici.`
					: `${name} riceverà la tua richiesta e potrà accettarla.`,
			);
		} catch (err) {
			Alert.alert("Ops", convexErrorMessage(err));
		} finally {
			setPendingId(null);
		}
	};

	return (
		<SheetLayout>
			<View style={{ flexDirection: "row", alignItems: "flex-start" }}>
				<View style={{ flex: 1, gap: 4 }}>
					<ThemedText type="title">Aggiungi un amico</ThemedText>
					<ThemedText type="subtitle" style={{ fontSize: 15 }}>
						Cercalo per nome o con il suo codice giocatore.
					</ThemedText>
				</View>
				{Platform.OS !== "ios" && (
					<Pressable
						onPress={() => router.back()}
						hitSlop={8}
						accessibilityRole="button"
						accessibilityLabel="Chiudi"
						style={{
							backgroundColor: theme.muted,
							borderRadius: 999,
							padding: 8,
						}}
					>
						<IconSymbol name="xmark" size={18} color={theme.textMuted} />
					</Pressable>
				)}
			</View>

			<TextField
				value={term}
				onChangeText={setTerm}
				placeholder="Nome o codice (es. 12103)"
				autoCorrect={false}
				autoCapitalize="words"
				clearButtonMode="while-editing"
				autoFocus
			/>

			{player?.code && (
				<Hint icon="person.fill">
					Il tuo codice è #{player.code}: dettalo a chi vuole aggiungerti.
				</Hint>
			)}

			{searching ? (
				<ActivityIndicator style={{ marginTop: 12 }} />
			) : trimmed.length < MIN_TERM ? null : results?.length === 0 ? (
				<ThemedText
					style={{ fontSize: 14, color: theme.textMuted, textAlign: "center" }}
				>
					Nessun giocatore trovato per “{trimmed}”.
				</ThemedText>
			) : (
				<View style={{ gap: 10 }}>
					{results?.map((result) => (
						<PlayerRow
							key={result.player.id}
							player={result.player}
							action={
								<RelationAction
									relation={result.relation}
									busy={pendingId === result.player.id}
									onAdd={() => add(result.player.id, result.player.name)}
								/>
							}
						/>
					))}
				</View>
			)}
		</SheetLayout>
	);
}

/**
 * Azione in coda al risultato: si può agire solo su chi non è già amico e
 * non ha una richiesta in corso, negli altri casi resta l'etichetta di stato.
 */
function RelationAction({
	relation,
	busy,
	onAdd,
}: {
	relation: "none" | "friend" | "incoming" | "outgoing";
	busy: boolean;
	onAdd: () => void;
}) {
	const theme = useTheme();

	if (relation === "friend") {
		return (
			<Label icon="checkmark.circle.fill" text="Già amico" color={theme.tint} />
		);
	}

	if (relation === "outgoing") {
		return <Label icon="clock.fill" text="In attesa" color={theme.textMuted} />;
	}

	return (
		<Pressable
			onPress={onAdd}
			disabled={busy}
			hitSlop={6}
			accessibilityRole="button"
			accessibilityLabel={
				relation === "incoming" ? "Accetta la richiesta" : "Aggiungi agli amici"
			}
			style={({ pressed }) => ({
				flexDirection: "row",
				alignItems: "center",
				gap: 6,
				paddingHorizontal: 14,
				paddingVertical: 9,
				borderRadius: 999,
				backgroundColor: theme.tint,
				opacity: pressed || busy ? 0.7 : 1,
			})}
		>
			{busy ? (
				<ActivityIndicator size="small" color={theme.tintForeground} />
			) : (
				<>
					<IconSymbol
						name={relation === "incoming" ? "checkmark.circle.fill" : "plus"}
						size={14}
						color={theme.tintForeground}
					/>
					<ThemedText
						style={{
							fontSize: 14,
							fontFamily: Fonts.semiBold,
							color: theme.tintForeground,
						}}
					>
						{relation === "incoming" ? "Accetta" : "Aggiungi"}
					</ThemedText>
				</>
			)}
		</Pressable>
	);
}

function Label({
	icon,
	text,
	color,
}: {
	icon: string;
	text: string;
	color: string;
}) {
	return (
		<View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
			<IconSymbol name={icon} size={14} color={color} />
			<ThemedText style={{ fontSize: 13, color }}>{text}</ThemedText>
		</View>
	);
}
