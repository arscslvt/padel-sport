import * as ImagePicker from "expo-image-picker";
import { useState } from "react";
import { ActivityIndicator, Alert, Pressable, View } from "react-native";
import { Avatar } from "@/components/open-match-card";
import { ThemedText } from "@/components/themed-text";
import { selectionFeedback } from "@/components/ui/choice";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useTheme } from "@/hooks/use-theme";

const SIZE = 96;

/**
 * Immagine del profilo giocatore: si tocca per sceglierne una dalla galleria.
 *
 * Il caricamento vero e proprio è del chiamante (`onPick`), perché l'immagine
 * va salvata sull'account Clerk condiviso con il sito.
 */
export default function AvatarPicker({
	url,
	onPick,
	uploading = false,
}: {
	url?: string;
	/** Riceve l'immagine scelta, già codificata in base64 con il suo MIME type. */
	onPick: (dataUrl: string) => Promise<void> | void;
	uploading?: boolean;
}) {
	const theme = useTheme();
	const [opening, setOpening] = useState(false);
	const busy = opening || uploading;

	const pick = async () => {
		selectionFeedback();
		setOpening(true);
		try {
			const result = await ImagePicker.launchImageLibraryAsync({
				mediaTypes: ["images"],
				allowsEditing: true,
				aspect: [1, 1],
				// L'immagine finisce in un avatar piccolo: comprimiamo per non
				// spedire megabyte inutili.
				quality: 0.6,
				base64: true,
			});

			if (result.canceled) return;

			const asset = result.assets[0];
			if (!asset?.base64) {
				Alert.alert("Ops", "Non siamo riusciti a leggere l'immagine scelta.");
				return;
			}

			await onPick(
				`data:${asset.mimeType ?? "image/jpeg"};base64,${asset.base64}`,
			);
		} catch (err) {
			Alert.alert(
				"Ops",
				err instanceof Error ? err.message : "Immagine non caricata.",
			);
		} finally {
			setOpening(false);
		}
	};

	return (
		<View style={{ alignItems: "center", gap: 10 }}>
			<Pressable
				onPress={pick}
				disabled={busy}
				accessibilityRole="button"
				accessibilityLabel="Cambia immagine del profilo"
				style={({ pressed }) => ({ opacity: pressed || busy ? 0.7 : 1 })}
			>
				<Avatar url={url} size={SIZE} borderWidth={0} />

				{/* Pastiglia con la fotocamera, appoggiata sul bordo dell'immagine */}
				<View
					style={{
						position: "absolute",
						right: -2,
						bottom: -2,
						width: 34,
						height: 34,
						borderRadius: 999,
						alignItems: "center",
						justifyContent: "center",
						borderWidth: 2,
						borderColor: theme.background,
						backgroundColor: theme.tint,
					}}
				>
					{busy ? (
						<ActivityIndicator size="small" color={theme.tintForeground} />
					) : (
						<IconSymbol
							name="camera.fill"
							size={15}
							color={theme.tintForeground}
						/>
					)}
				</View>
			</Pressable>

			<ThemedText style={{ fontSize: 13, color: theme.textMuted }}>
				{url ? "Tocca per cambiare foto" : "Aggiungi una foto"}
			</ThemedText>
		</View>
	);
}
