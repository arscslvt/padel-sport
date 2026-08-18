import { api } from "@padel-sport/backend/convex/_generated/api";
import type { Id } from "@padel-sport/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Alert, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import PlayerRow from "@/components/friends/player-row";
import OpenMatchCard from "@/components/open-match-card";
import { ThemedText } from "@/components/themed-text";
import { Button } from "@/components/ui/button";
import { Hint, SectionLabel } from "@/components/ui/choice";
import Pill from "@/components/ui/pill";
import RowAction from "@/components/ui/row-action";
import { TextField } from "@/components/ui/text-field";
import { useCurrentPlayer } from "@/hooks/use-current-player";
import { useTheme } from "@/hooks/use-theme";
import { convexErrorMessage } from "@/lib/format";

/**
 * Dettaglio di una cerchia: chi ne fa parte, chi è stato invitato e le partite
 * in programma. Le azioni disponibili cambiano fra proprietario e membro.
 */
export default function CircleDetail() {
	const theme = useTheme();
	const router = useRouter();
	const insets = useSafeAreaInsets();
	const { id } = useLocalSearchParams<{ id: Id<"circles"> }>();
	const { player } = useCurrentPlayer();

	const circle = useQuery(api.modules.circles.get.default, { circleId: id });
	const removeMember = useMutation(api.modules.circles.remove.default);
	const leaveCircle = useMutation(api.modules.circles.leave.default);
	const dissolveCircle = useMutation(api.modules.circles.dissolve.default);
	const renameCircle = useMutation(api.modules.circles.update.default);

	const [busyId, setBusyId] = useState<string | null>(null);
	// La rinomina è in pagina e non in un Alert: `Alert.prompt` esiste solo su iOS
	const [renaming, setRenaming] = useState(false);
	const [draftName, setDraftName] = useState("");

	const run = async (key: string, action: () => Promise<unknown>) => {
		setBusyId(key);
		try {
			await action();
		} catch (err) {
			Alert.alert("Ops", convexErrorMessage(err));
		} finally {
			setBusyId(null);
		}
	};

	if (circle === undefined) {
		return (
			<View style={{ flex: 1, backgroundColor: theme.background }}>
				<ActivityIndicator style={{ marginTop: 48 }} />
			</View>
		);
	}

	// `null` anche quando la cerchia esiste ma non è nostra: da fuori non si vede
	if (circle === null) {
		return (
			<View
				style={{
					flex: 1,
					backgroundColor: theme.background,
					alignItems: "center",
					justifyContent: "center",
					padding: 32,
					gap: 8,
				}}
			>
				<ThemedText type="subtitle">Cerchia non disponibile</ThemedText>
				<ThemedText style={{ color: theme.textMuted, textAlign: "center" }}>
					Non esiste più oppure non ne fai parte.
				</ThemedText>
			</View>
		);
	}

	const isOwner = circle.viewer.role === "owner";

	const confirmRemove = (playerId: Id<"players">, name: string) =>
		Alert.alert(
			`Rimuovere ${name}?`,
			"Non vedrà più le partite della cerchia. Resta nelle partite a cui si è già unito.",
			[
				{ text: "Annulla", style: "cancel" },
				{
					text: "Rimuovi",
					style: "destructive",
					onPress: () =>
						run(playerId, () => removeMember({ circleId: id, playerId })),
				},
			],
		);

	const confirmLeave = () =>
		Alert.alert(
			`Uscire da "${circle.name}"?`,
			"Non vedrai più le partite della cerchia. Resti nelle partite a cui ti sei già unito.",
			[
				{ text: "Annulla", style: "cancel" },
				{
					text: "Esci",
					style: "destructive",
					onPress: () =>
						run("leave", async () => {
							await leaveCircle({ circleId: id });
							router.back();
						}),
				},
			],
		);

	const confirmDissolve = () =>
		Alert.alert(
			`Sciogliere "${circle.name}"?`,
			"La cerchia sparisce per tutti i membri. L'operazione non si può annullare.",
			[
				{ text: "Annulla", style: "cancel" },
				{
					text: "Sciogli",
					style: "destructive",
					onPress: () =>
						run("dissolve", async () => {
							await dissolveCircle({ circleId: id });
							router.back();
						}),
				},
			],
		);

	const saveName = () =>
		run("rename", async () => {
			await renameCircle({ circleId: id, name: draftName.trim() });
			setRenaming(false);
		});

	return (
		<ScrollView
			style={{ flex: 1, backgroundColor: theme.background }}
			contentContainerStyle={{
				padding: 20,
				paddingBottom: insets.bottom + 32,
				gap: 24,
			}}
		>
			<Stack.Screen options={{ title: circle.name }} />

			<View style={{ gap: 4 }}>
				<ThemedText type="title">{circle.name}</ThemedText>
				<ThemedText style={{ fontSize: 14, color: theme.textMuted }}>
					{circle.members.length}{" "}
					{circle.members.length === 1 ? "giocatore" : "giocatori"} · Creata da{" "}
					{isOwner ? "te" : circle.owner.name}
				</ThemedText>
			</View>

			<View style={{ flexDirection: "row", gap: 10 }}>
				<Button
					label="Crea partita"
					icon="calendar.badge.plus"
					iconPosition="leading"
					height={50}
					style={{ flex: 1 }}
					onPress={() =>
						router.push({ pathname: "/book", params: { circleId: id } })
					}
				/>
				{isOwner && (
					<Button
						label="Invita"
						icon="person.crop.circle.badge.plus"
						iconPosition="leading"
						variant="secondary"
						height={50}
						style={{ flex: 1 }}
						onPress={() =>
							router.push({
								pathname: "/circles/[id]/invite",
								params: { id },
							})
						}
					/>
				)}
			</View>

			<View style={{ gap: 10 }}>
				<SectionLabel>{`Partite in programma (${circle.matches.length})`}</SectionLabel>

				{circle.matches.length === 0 ? (
					<Hint icon="calendar">
						Nessuna partita in programma. Creane una: tutti i membri riceveranno
						l&apos;invito, e se non arrivate a quattro potrai aprirla a tutti.
					</Hint>
				) : (
					circle.matches.map((match) => (
						<OpenMatchCard
							key={match.id}
							match={match}
							myLevel={player?.level}
							onPress={() =>
								router.push({
									pathname: "/match/[id]",
									params: { id: match.id },
								})
							}
						/>
					))
				)}
			</View>

			<View style={{ gap: 10 }}>
				<SectionLabel>{`Membri (${circle.members.length})`}</SectionLabel>
				{circle.members.map((member) => (
					<PlayerRow
						key={member.id}
						player={member}
						action={
							member.id === circle.owner.id ? (
								<Pill label="Creatore" />
							) : isOwner ? (
								<RowAction
									icon="trash"
									label={`Rimuovi ${member.name}`}
									danger
									busy={busyId === member.id}
									onPress={() => confirmRemove(member.id, member.name)}
								/>
							) : undefined
						}
					/>
				))}
			</View>

			{circle.pendingInvites.length > 0 && (
				<View style={{ gap: 10 }}>
					<SectionLabel>{`Inviti in attesa (${circle.pendingInvites.length})`}</SectionLabel>
					{circle.pendingInvites.map((pending) => (
						<PlayerRow
							key={pending.inviteId}
							player={pending.player}
							action={
								<RowAction
									icon="xmark"
									label={`Annulla l'invito a ${pending.player.name}`}
									busy={busyId === pending.player.id}
									onPress={() =>
										run(pending.player.id, () =>
											removeMember({ circleId: id, playerId: pending.player.id }),
										)
									}
								/>
							}
						/>
					))}
				</View>
			)}

			<View style={{ gap: 10, marginTop: 8 }}>
				{isOwner ? (
					<>
						{renaming ? (
							<View style={{ gap: 10 }}>
								<SectionLabel>Nome della cerchia</SectionLabel>
								<TextField
									value={draftName}
									onChangeText={setDraftName}
									autoCapitalize="sentences"
									maxLength={40}
									autoFocus
								/>
								<View style={{ flexDirection: "row", gap: 10 }}>
									<Button
										label="Annulla"
										variant="secondary"
										height={50}
										style={{ flex: 1 }}
										onPress={() => setRenaming(false)}
									/>
									<Button
										label="Salva"
										icon="checkmark.circle.fill"
										iconPosition="leading"
										height={50}
										style={{ flex: 1 }}
										disabled={draftName.trim().length < 2}
										loading={busyId === "rename"}
										onPress={saveName}
									/>
								</View>
							</View>
						) : (
							<Button
								label="Rinomina la cerchia"
								icon="pencil"
								iconPosition="leading"
								variant="secondary"
								height={50}
								onPress={() => {
									setDraftName(circle.name);
									setRenaming(true);
								}}
							/>
						)}
						<Button
							label="Sciogli la cerchia"
							icon="trash"
							iconPosition="leading"
							variant="secondary"
							textColor={theme.danger}
							height={50}
							loading={busyId === "dissolve"}
							onPress={confirmDissolve}
						/>
					</>
				) : (
					<Button
						label="Esci dalla cerchia"
						icon="rectangle.portrait.and.arrow.right"
						iconPosition="leading"
						variant="secondary"
						textColor={theme.danger}
						height={50}
						loading={busyId === "leave"}
						onPress={confirmLeave}
					/>
				)}
			</View>
		</ScrollView>
	);
}
