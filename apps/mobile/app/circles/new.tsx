import { api } from "@padel-sport/backend/convex/_generated/api";
import { useMutation } from "convex/react";
import { useRouter } from "expo-router";
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

/** Crea una cerchia e invita subito i primi giocatori. */
export default function NewCircle() {
	const theme = useTheme();
	const router = useRouter();
	const { gate } = usePlayerGate();
	const createCircle = useMutation(api.modules.circles.create.default);

	const [name, setName] = useState("");
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

	const hasName = name.trim().length >= 2;

	const handleCreate = () =>
		gate(async () => {
			setSubmitting(true);
			try {
				const { invited } = await createCircle({
					name: name.trim(),
					playerIds: selected.map((player) => player.id),
					note: note.trim() || undefined,
				});

				Alert.alert(
					"Cerchia creata 🎾",
					invited > 0
						? `Hai invitato ${invited} ${invited === 1 ? "giocatore" : "giocatori"}: li vedrai entrare appena accettano.`
						: "Ora puoi invitare i giocatori che vuoi.",
					[{ text: "OK", onPress: () => router.back() }],
				);
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
						<ThemedText type="title">Nuova cerchia</ThemedText>
						<ThemedText type="subtitle" style={{ fontSize: 15 }}>
							Un gruppo ristretto con cui organizzare partite.
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
							? `Crea e invita (${selected.length})`
							: "Crea la cerchia"
					}
					icon="checkmark.circle.fill"
					iconPosition="leading"
					onPress={handleCreate}
					disabled={!hasName}
					loading={submitting}
				/>
			}
		>
			<View style={{ gap: 10 }}>
				<SectionLabel>Nome</SectionLabel>
				<TextField
					value={name}
					onChangeText={setName}
					placeholder="Es. Sabato mattina"
					autoCapitalize="sentences"
					maxLength={40}
					autoFocus
				/>
			</View>

			<View style={{ gap: 10 }}>
				<SectionLabel>Chi vuoi invitare?</SectionLabel>
				<PlayerPicker
					term={term}
					onTermChange={setTerm}
					selected={selected}
					onToggle={toggle}
				/>
			</View>

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
