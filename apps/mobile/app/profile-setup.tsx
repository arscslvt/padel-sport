import { useUser } from "@clerk/clerk-expo";
import { api } from "@padel-sport/backend/convex/_generated/api";
import { useMutation } from "convex/react";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Alert, Platform, Pressable, View } from "react-native";
import AvatarPicker from "@/components/profile/avatar-picker";
import LevelQuiz from "@/components/profile/level-quiz";
import SheetLayout from "@/components/sheet-layout";
import { ThemedText } from "@/components/themed-text";
import { Button } from "@/components/ui/button";
import { ChoiceCard, Hint, SectionLabel } from "@/components/ui/choice";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { TextField } from "@/components/ui/text-field";
import { useCurrentPlayer } from "@/hooks/use-current-player";
import { useTheme } from "@/hooks/use-theme";
import { convexErrorMessage } from "@/lib/format";
import { findLevelRangeIndex, LEVEL_RANGES } from "@/lib/levels";

/** Onboarding e modifica del profilo giocatore: foto, nome e livello. */
export default function ProfileSetup() {
	const theme = useTheme();
	const router = useRouter();
	const { user } = useUser();
	const { player } = useCurrentPlayer();
	const upsertProfile = useMutation(
		api.modules.openMatches.players.upsertProfile,
	);

	// I campi restano `null` finché l'utente non li tocca: fino a quel momento
	// seguono il profilo, che arriva in modo asincrono.
	const [nameInput, setNameInput] = useState<string | null>(null);
	const [levelChoice, setLevelChoice] = useState<number | null>(null);
	const [pickedAvatar, setPickedAvatar] = useState<string | null>(null);

	const name = nameInput ?? player?.name ?? user?.fullName ?? "";
	const levelIndex = levelChoice ?? findLevelRangeIndex(player?.level);
	const avatarUrl = pickedAvatar ?? player?.avatarUrl ?? user?.imageUrl;

	const [uploading, setUploading] = useState(false);
	const [saving, setSaving] = useState(false);
	const [quizOpen, setQuizOpen] = useState(false);
	// Mostra da dove arriva il livello quando lo ha deciso il questionario
	const [fromQuiz, setFromQuiz] = useState(false);

	/**
	 * L'immagine viene salvata sull'account Clerk, lo stesso usato dal sito:
	 * così il profilo giocatore resta allineato ovunque.
	 */
	const handlePickAvatar = async (dataUrl: string) => {
		if (!user) return;

		setUploading(true);
		try {
			await user.setProfileImage({ file: dataUrl });
			await user.reload();
			setPickedAvatar(user.imageUrl);
		} catch (err) {
			Alert.alert(
				"Immagine non salvata",
				err instanceof Error ? err.message : "Riprova tra poco.",
			);
		} finally {
			setUploading(false);
		}
	};

	const handleSave = async () => {
		if (!name.trim()) {
			Alert.alert("Manca il nome", "Inserisci il tuo nome per continuare.");
			return;
		}

		setSaving(true);
		try {
			await upsertProfile({
				name: name.trim(),
				level: LEVEL_RANGES[levelIndex].level,
				avatarUrl,
			});
			router.back();
		} catch (err) {
			Alert.alert("Errore", convexErrorMessage(err));
		} finally {
			setSaving(false);
		}
	};

	if (quizOpen) {
		return (
			<SheetLayout>
				<LevelQuiz
					onCancel={() => setQuizOpen(false)}
					onComplete={(rangeIndex) => {
						setLevelChoice(rangeIndex);
						setFromQuiz(true);
						setQuizOpen(false);
					}}
				/>
			</SheetLayout>
		);
	}

	return (
		<SheetLayout
			footer={
				<Button
					label="Salva profilo"
					icon="checkmark.circle.fill"
					iconPosition="leading"
					onPress={handleSave}
					loading={saving}
					disabled={uploading}
				/>
			}
		>
			<View style={{ flexDirection: "row", alignItems: "flex-start" }}>
				<View style={{ flex: 1, gap: 4 }}>
					<ThemedText type="title">Il tuo profilo</ThemedText>
					<ThemedText type="subtitle" style={{ fontSize: 15 }}>
						Foto, nome e livello sono visibili agli altri giocatori.
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

			<AvatarPicker
				url={avatarUrl}
				onPick={handlePickAvatar}
				uploading={uploading}
			/>

			<View style={{ gap: 10 }}>
				<SectionLabel>Nome</SectionLabel>
				<TextField
					value={name}
					onChangeText={setNameInput}
					placeholder="Es. Marco R."
					autoComplete="name"
				/>
			</View>

			<View style={{ gap: 12 }}>
				<View style={{ gap: 2 }}>
					<SectionLabel>Livello di gioco</SectionLabel>
					<ThemedText
						style={{ fontSize: 13, lineHeight: 18, color: theme.textMuted }}
					>
						Serve a proporti partite con avversari alla tua portata.
					</ThemedText>
				</View>

				{fromQuiz && (
					<Hint icon="checkmark.circle.fill">
						Dalle tue risposte il livello più adatto è{" "}
						{LEVEL_RANGES[levelIndex].label}. Puoi comunque cambiarlo.
					</Hint>
				)}

				{LEVEL_RANGES.map((range, index) => (
					<ChoiceCard
						key={range.label}
						title={range.label}
						description={range.hint}
						selected={index === levelIndex}
						onPress={() => {
							setLevelChoice(index);
							setFromQuiz(false);
						}}
					/>
				))}

				<Button
					label="Non conosco il mio livello"
					icon="questionmark.circle"
					iconPosition="leading"
					variant="secondary"
					height={50}
					onPress={() => setQuizOpen(true)}
				/>
			</View>
		</SheetLayout>
	);
}
