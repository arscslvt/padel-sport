import { api } from "@padel-sport/backend/convex/_generated/api";
import type { Id } from "@padel-sport/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { ActivityIndicator, Alert, View } from "react-native";
import PlayerRow from "@/components/friends/player-row";
import { ThemedText } from "@/components/themed-text";
import { Button } from "@/components/ui/button";
import { SectionLabel } from "@/components/ui/choice";
import { IconSymbol } from "@/components/ui/icon-symbol";
import RowAction from "@/components/ui/row-action";
import { TextField } from "@/components/ui/text-field";
import { Fonts } from "@/constants/fonts";
import { useCurrentPlayer } from "@/hooks/use-current-player";
import { useTheme } from "@/hooks/use-theme";
import { convexErrorMessage } from "@/lib/format";

/**
 * Elenco degli amici, con le richieste ancora in sospeso in cima.
 * È il contenuto della sezione "Amici" della tab (app/(tabs)/friends.tsx).
 */
export default function FriendsList() {
	const theme = useTheme();
	const router = useRouter();
	const { isSignedIn, player } = useCurrentPlayer();

	const data = useQuery(
		api.modules.friends.list.default,
		isSignedIn ? {} : "skip",
	);
	const respond = useMutation(api.modules.friends.respond.default);
	const removeFriend = useMutation(api.modules.friends.remove.default);

	const [term, setTerm] = useState("");
	const [busyId, setBusyId] = useState<string | null>(null);

	const loading = isSignedIn && data === undefined;

	// La ricerca qui filtra solo gli amici già in elenco: per trovarne di nuovi
	// si passa dal pulsante con la lente della tab bar.
	const friends = useMemo(() => {
		const all = data?.friends ?? [];
		const needle = term.trim().toLowerCase();
		if (!needle) return all;

		return all.filter(
			(friend) =>
				friend.name.toLowerCase().includes(needle) ||
				friend.code?.includes(needle),
		);
	}, [data?.friends, term]);

	const run = async (id: string, action: () => Promise<unknown>) => {
		setBusyId(id);
		try {
			await action();
		} catch (err) {
			Alert.alert("Ops", convexErrorMessage(err));
		} finally {
			setBusyId(null);
		}
	};

	const confirmRemove = (playerId: Id<"players">, name: string) =>
		Alert.alert(
			`Rimuovere ${name}?`,
			"Non sarà più tra i tuoi amici. Potrai aggiungerlo di nuovo in seguito.",
			[
				{ text: "Annulla", style: "cancel" },
				{
					text: "Rimuovi",
					style: "destructive",
					onPress: () => run(playerId, () => removeFriend({ playerId })),
				},
			],
		);

	if (loading) {
		return <ActivityIndicator style={{ marginTop: 48 }} />;
	}

	const incoming = data?.incoming ?? [];
	const outgoing = data?.outgoing ?? [];
	const hasFriends = (data?.friends.length ?? 0) > 0;

	return (
		<View style={{ gap: 24 }}>
			{/* Il proprio codice sta in cima: è quello che si detta agli amici */}
			{player?.code && (
				<View
					style={{
						flexDirection: "row",
						alignItems: "center",
						gap: 10,
						padding: 14,
						borderRadius: 16,
						backgroundColor: theme.muted,
					}}
				>
					<IconSymbol name="person.fill" size={16} color={theme.textMuted} />
					<ThemedText style={{ fontSize: 14, color: theme.textMuted, flex: 1 }}>
						Il tuo codice giocatore
					</ThemedText>
					<ThemedText
						style={{ fontSize: 16, fontFamily: Fonts.semiBold, letterSpacing: 1 }}
					>
						#{player.code}
					</ThemedText>
				</View>
			)}

			{incoming.length > 0 && (
				<View style={{ gap: 10 }}>
					<SectionLabel>{`Richieste ricevute (${incoming.length})`}</SectionLabel>
					{incoming.map((request) => (
						<PlayerRow
							key={request.friendshipId}
							player={request.player}
							action={
								<View style={{ flexDirection: "row", gap: 8 }}>
									<RowAction
										icon="checkmark.circle.fill"
										label={`Accetta ${request.player.name}`}
										tinted
										busy={busyId === request.friendshipId}
										onPress={() =>
											run(request.friendshipId, () =>
												respond({
													friendshipId: request.friendshipId,
													accept: true,
												}),
											)
										}
									/>
									<RowAction
										icon="xmark"
										label={`Rifiuta ${request.player.name}`}
										busy={busyId === request.friendshipId}
										onPress={() =>
											run(request.friendshipId, () =>
												respond({
													friendshipId: request.friendshipId,
													accept: false,
												}),
											)
										}
									/>
								</View>
							}
						/>
					))}
				</View>
			)}

			<View style={{ gap: 10 }}>
				<SectionLabel>
					{hasFriends ? `Amici (${data?.friends.length})` : "Amici"}
				</SectionLabel>

				{hasFriends && (
					<TextField
						value={term}
						onChangeText={setTerm}
						placeholder="Cerca tra i tuoi amici"
						autoCorrect={false}
						clearButtonMode="while-editing"
					/>
				)}

				{!hasFriends ? (
					<View style={{ alignItems: "center", gap: 14, paddingVertical: 28 }}>
						<ThemedText type="subtitle" style={{ color: theme.textTinted }}>
							Non hai ancora amici
						</ThemedText>
						<ThemedText
							style={{
								fontSize: 14,
								color: theme.textMuted,
								textAlign: "center",
							}}
						>
							Cercali per nome o con il loro codice giocatore: da qui potrai
							invitarli più in fretta alle tue partite.
						</ThemedText>
						<Button
							label="Aggiungi un amico"
							icon="person.crop.circle.badge.plus"
							iconPosition="leading"
							height={50}
							onPress={() => router.push("/friends/add")}
						/>
					</View>
				) : friends.length === 0 ? (
					<ThemedText
						style={{
							fontSize: 14,
							color: theme.textMuted,
							paddingVertical: 12,
						}}
					>
						Nessun amico corrisponde a “{term.trim()}”.
					</ThemedText>
				) : (
					friends.map((friend) => (
						<PlayerRow
							key={friend.id}
							player={friend}
							action={
								<RowAction
									icon="trash"
									label={`Rimuovi ${friend.name}`}
									danger
									busy={busyId === friend.id}
									onPress={() => confirmRemove(friend.id, friend.name)}
								/>
							}
						/>
					))
				)}
			</View>

			{outgoing.length > 0 && (
				<View style={{ gap: 10 }}>
					<SectionLabel>{`Richieste inviate (${outgoing.length})`}</SectionLabel>
					{outgoing.map((request) => (
						<PlayerRow
							key={request.friendshipId}
							player={request.player}
							action={
								<RowAction
									icon="xmark"
									label={`Annulla la richiesta a ${request.player.name}`}
									busy={busyId === request.player.id}
									onPress={() =>
										run(request.player.id, () =>
											removeFriend({ playerId: request.player.id }),
										)
									}
								/>
							}
						/>
					))}
				</View>
			)}
		</View>
	);
}
