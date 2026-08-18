import { api } from "@padel-sport/backend/convex/_generated/api";
import type { Id } from "@padel-sport/backend/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { useMemo } from "react";
import { ActivityIndicator, Pressable, View } from "react-native";
import PlayerRow from "@/components/friends/player-row";
import { Avatar } from "@/components/open-match-card";
import { ThemedText } from "@/components/themed-text";
import { SectionLabel, selectionFeedback } from "@/components/ui/choice";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { TextField } from "@/components/ui/text-field";
import { useTheme } from "@/hooks/use-theme";
import type { PlayerView } from "@/lib/format";

/** Sotto le due lettere la ricerca non parte: troppi risultati inutili. */
const MIN_TERM = 2;

/**
 * Selezione multipla di giocatori da invitare.
 *
 * Con il campo vuoto propone gli amici — sono quelli che si invitano il 90%
 * delle volte — e appena si digita passa alla ricerca su tutti gli iscritti,
 * così si può invitare anche chi non è ancora un amico.
 */
export default function PlayerPicker({
	term,
	onTermChange,
	selected,
	onToggle,
	excludeIds,
}: {
	term: string;
	onTermChange: (term: string) => void;
	selected: PlayerView[];
	onToggle: (player: PlayerView) => void;
	/** Chi è già dentro e non va riproposto (membri, inviti in sospeso). */
	excludeIds?: Id<"players">[];
}) {
	const theme = useTheme();

	const trimmed = term.trim();
	const searching = trimmed.length >= MIN_TERM;

	const friends = useQuery(api.modules.friends.list.default, {});
	const results = useQuery(
		api.modules.friends.search.default,
		searching ? { term: trimmed } : "skip",
	);

	const excluded = useMemo(
		() => new Set<string>(excludeIds ?? []),
		[excludeIds],
	);

	const selectedIds = useMemo(
		() => new Set(selected.map((player) => player.id)),
		[selected],
	);

	const options: PlayerView[] = useMemo(() => {
		const source = searching
			? (results ?? []).map((result) => result.player)
			: (friends?.friends ?? []);

		return source.filter((player) => !excluded.has(player.id));
	}, [searching, results, friends?.friends, excluded]);

	const loading = searching
		? results === undefined
		: friends === undefined;

	return (
		<View style={{ gap: 14 }}>
			<TextField
				value={term}
				onChangeText={onTermChange}
				placeholder="Nome o codice (es. 12103)"
				autoCorrect={false}
				autoCapitalize="words"
				clearButtonMode="while-editing"
			/>

			{selected.length > 0 && (
				<View style={{ gap: 8 }}>
					<SectionLabel>{`Selezionati (${selected.length})`}</SectionLabel>
					<View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
						{selected.map((player) => (
							<Pressable
								key={player.id}
								onPress={() => {
									selectionFeedback();
									onToggle(player);
								}}
								accessibilityRole="button"
								accessibilityLabel={`Togli ${player.name} dalla selezione`}
								style={({ pressed }) => ({
									flexDirection: "row",
									alignItems: "center",
									gap: 6,
									paddingLeft: 4,
									paddingRight: 10,
									paddingVertical: 4,
									borderRadius: 999,
									backgroundColor: theme.muted,
									opacity: pressed ? 0.6 : 1,
								})}
							>
								<Avatar url={player.avatarUrl} size={24} />
								<ThemedText style={{ fontSize: 14 }}>{player.name}</ThemedText>
								<IconSymbol name="xmark" size={12} color={theme.textMuted} />
							</Pressable>
						))}
					</View>
				</View>
			)}

			<View style={{ gap: 10 }}>
				<SectionLabel>
					{searching ? "Risultati" : "I tuoi amici"}
				</SectionLabel>

				{loading ? (
					<ActivityIndicator style={{ marginTop: 12 }} />
				) : options.length === 0 ? (
					<ThemedText
						style={{
							fontSize: 14,
							color: theme.textMuted,
							textAlign: "center",
							paddingVertical: 12,
						}}
					>
						{searching
							? `Nessun giocatore trovato per “${trimmed}”.`
							: "Non hai ancora amici da invitare: cercali per nome o codice."}
					</ThemedText>
				) : (
					options.map((player) => (
						<PlayerRow
							key={player.id}
							player={player}
							onPress={() => {
								selectionFeedback();
								onToggle(player);
							}}
							action={
								<IconSymbol
									name={
										selectedIds.has(player.id)
											? "checkmark.circle.fill"
											: "circle.dashed"
									}
									size={22}
									color={
										selectedIds.has(player.id) ? theme.tint : theme.border
									}
								/>
							}
						/>
					))
				)}
			</View>
		</View>
	);
}
