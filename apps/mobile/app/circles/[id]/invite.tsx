import { api } from "@padel-sport/backend/convex/_generated/api";
import type { Id } from "@padel-sport/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { Alert, Platform, Pressable, View } from "react-native";
import PlayerPicker from "@/components/circles/player-picker";
import SheetLayout from "@/components/sheet-layout";
import { ThemedText } from "@/components/themed-text";
import { Button } from "@/components/ui/button";
import { Hint, SectionLabel } from "@/components/ui/choice";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { TextField } from "@/components/ui/text-field";
import { usePlayerGate } from "@/hooks/use-current-player";
import { useTheme } from "@/hooks/use-theme";
import { convexErrorMessage, type PlayerView } from "@/lib/format";

/** Invita altri giocatori in una cerchia già esistente. */
export default function InviteToCircle() {
	const theme = useTheme();
	const router = useRouter();
	const { gate } = usePlayerGate();
	const { id } = useLocalSearchParams<{ id: Id<"circles"> }>();

	const circle = useQuery(api.modules.circles.get.default, { circleId: id });
	const invite = useMutation(api.modules.circles.invite.default);

	const [note, setNote] = useState("");
	const [term, setTerm] = useState("");
	const [selected, setSelected] = useState<PlayerView[]>([]);
	const [submitting, setSubmitting] = useState(false);

	const toggle = (player: PlayerView) =>
		setSelected((current) =>
			current.some((entry) => entry.id === player.id)
				? current.filter((entry) => entry.id !== player.id)
				: [...current, player],
		);

	// Chi è già dentro o ha già un invito aperto non va riproposto
	const excludeIds = [
		...(circle?.members ?? []).map((member) => member.id),
		...(circle?.pendingInvites ?? []).map((pending) => pending.player.id),
	];

	const handleInvite = () =>
		gate(async () => {
			setSubmitting(true);
			try {
				const outcome = await invite({
					circleId: id,
					playerIds: selected.map((player) => player.id),
					note: note.trim() || undefined,
				});

				const lines = [
					`${outcome.invited} ${outcome.invited === 1 ? "invito inviato" : "inviti inviati"}.`,
				];
				if (outcome.friendRequests.length > 0) {
					lines.push(
						`Richiesta di amicizia inviata a ${outcome.friendRequests.join(", ")}.`,
					);
				}
				if (outcome.skipped.length > 0) {
					lines.push(`Già invitati: ${outcome.skipped.join(", ")}.`);
				}

				Alert.alert("Fatto", lines.join("\n"), [
					{ text: "OK", onPress: () => router.back() },
				]);
			} catch (err) {
				Alert.alert("Ops", convexErrorMessage(err));
			} finally {
				setSubmitting(false);
			}
		});

	return (
		<SheetLayout
			header={
				<View style={{ flexDirection: "row", alignItems: "flex-start" }}>
					<View style={{ flex: 1, gap: 4 }}>
						<ThemedText type="title">Invita giocatori</ThemedText>
						<ThemedText type="subtitle" style={{ fontSize: 15 }}>
							{circle ? `In "${circle.name}"` : "Nella tua cerchia"}
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
			}
			footer={
				<Button
					label={
						selected.length > 0
							? `Invita ${selected.length} ${selected.length === 1 ? "giocatore" : "giocatori"}`
							: "Scegli chi invitare"
					}
					icon="person.crop.circle.badge.plus"
					iconPosition="leading"
					onPress={handleInvite}
					disabled={selected.length === 0}
					loading={submitting}
				/>
			}
		>
			<PlayerPicker
				term={term}
				onTermChange={setTerm}
				selected={selected}
				onToggle={toggle}
				excludeIds={excludeIds}
			/>

			{selected.length > 0 && (
				<View style={{ gap: 10 }}>
					<SectionLabel>Nota per l&apos;invito</SectionLabel>
					<TextField
						value={note}
						onChangeText={setNote}
						placeholder="Es. ci troviamo il sabato alle 10, se ti va"
						autoCapitalize="sentences"
						multiline
						maxLength={200}
						style={{ minHeight: 80, textAlignVertical: "top" }}
					/>
					<Hint icon="person.crop.circle.badge.plus">
						Chi non è ancora tuo amico riceverà anche la richiesta di amicizia.
					</Hint>
				</View>
			)}
		</SheetLayout>
	);
}
