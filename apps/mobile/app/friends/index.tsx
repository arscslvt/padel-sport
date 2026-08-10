import { api } from "@padel-sport/backend/convex/_generated/api";
import type { Id } from "@padel-sport/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
	ActivityIndicator,
	Alert,
	Pressable,
	ScrollView,
	View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import PlayerRow from "@/components/friends/player-row";
import { ThemedText } from "@/components/themed-text";
import { Button } from "@/components/ui/button";
import { SectionLabel, selectionFeedback } from "@/components/ui/choice";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { TextField } from "@/components/ui/text-field";
import { useCurrentPlayer } from "@/hooks/use-current-player";
import { useTheme } from "@/hooks/use-theme";
import { convexErrorMessage } from "@/lib/format";

/** Elenco degli amici, con le richieste ancora in sospeso in cima. */
export default function FriendsScreen() {
	const theme = useTheme();
	const router = useRouter();
	const insets = useSafeAreaInsets();
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
	// si passa dalla schermata di aggiunta.
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
		return (
			<View style={{ flex: 1, backgroundColor: theme.background }}>
				<ActivityIndicator style={{ marginTop: 48 }} />
			</View>
		);
	}

	const incoming = data?.incoming ?? [];
	const outgoing = data?.outgoing ?? [];
	const hasFriends = (data?.friends.length ?? 0) > 0;

	return (
		<ScrollView
			style={{ flex: 1, backgroundColor: theme.background }}
			contentContainerStyle={{
				padding: 20,
				paddingBottom: insets.bottom + 32,
				gap: 24,
			}}
			keyboardShouldPersistTaps="handled"
		>
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
						style={{ fontSize: 16, fontWeight: "600", letterSpacing: 1 }}
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
									<CircleAction
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
									<CircleAction
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
								<CircleAction
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
								<CircleAction
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
		</ScrollView>
	);
}

/** Pulsante tondo compatto usato in coda alle righe. */
function CircleAction({
	icon,
	label,
	onPress,
	busy,
	tinted,
	danger,
}: {
	icon: string;
	label: string;
	onPress: () => void;
	busy?: boolean;
	tinted?: boolean;
	danger?: boolean;
}) {
	const theme = useTheme();
	const foreground = tinted
		? theme.tintForeground
		: danger
			? theme.danger
			: theme.textMuted;

	return (
		<Pressable
			onPress={() => {
				selectionFeedback();
				onPress();
			}}
			disabled={busy}
			hitSlop={6}
			accessibilityRole="button"
			accessibilityLabel={label}
			style={({ pressed }) => ({
				width: 36,
				height: 36,
				borderRadius: 999,
				alignItems: "center",
				justifyContent: "center",
				backgroundColor: tinted ? theme.tint : theme.muted,
				opacity: pressed || busy ? 0.6 : 1,
			})}
		>
			{busy ? (
				<ActivityIndicator size="small" color={foreground} />
			) : (
				<IconSymbol name={icon} size={16} color={foreground} />
			)}
		</Pressable>
	);
}
