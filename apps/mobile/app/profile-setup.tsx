import { useUser } from "@clerk/clerk-expo";
import { api } from "@padel-sport/backend/convex/_generated/api";
import { useMutation } from "convex/react";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
	ActivityIndicator,
	Alert,
	Platform,
	Pressable,
	ScrollView,
	TextInput,
	View,
} from "react-native";
import SmoothView from "@/components/smooth-view";
import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useCurrentPlayer } from "@/hooks/use-current-player";
import { useTheme } from "@/hooks/use-theme";
import { convexErrorMessage, formatLevel } from "@/lib/format";

/** Livelli selezionabili: scala padel 1.0 – 5.0 a passi di 0.5. */
const LEVELS = Array.from({ length: 9 }, (_, i) => 1 + i * 0.5);

/** Onboarding del profilo giocatore: nome e livello di gioco. */
export default function ProfileSetup() {
	const theme = useTheme();
	const router = useRouter();
	const { user } = useUser();
	const { player } = useCurrentPlayer();
	const upsertProfile = useMutation(api.modules.openMatches.players.upsertProfile);

	const [name, setName] = useState(player?.name ?? user?.fullName ?? "");
	const [level, setLevel] = useState<number>(player?.level ?? 2);
	const [saving, setSaving] = useState(false);

	const handleSave = async () => {
		if (!name.trim()) {
			Alert.alert("Manca il nome", "Inserisci il tuo nome per continuare.");
			return;
		}

		setSaving(true);
		try {
			await upsertProfile({ name: name.trim(), level });
			router.back();
		} catch (err) {
			Alert.alert("Errore", convexErrorMessage(err));
		} finally {
			setSaving(false);
		}
	};

	return (
		<ScrollView
			style={{ flex: 1, backgroundColor: theme.background }}
			contentContainerStyle={{ padding: 20, paddingBottom: 40, gap: 24 }}
			keyboardShouldPersistTaps="handled"
		>
			<View style={{ flexDirection: "row", alignItems: "flex-start" }}>
				<View style={{ flex: 1, gap: 4 }}>
					<ThemedText type="title">Il tuo profilo</ThemedText>
					<ThemedText type="subtitle" style={{ fontSize: 15 }}>
						Nome e livello sono visibili agli altri giocatori.
					</ThemedText>
				</View>
				{Platform.OS !== "ios" && (
					<Pressable
						onPress={() => router.back()}
						hitSlop={8}
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

			<View style={{ gap: 10 }}>
				<ThemedText
					style={{
						fontSize: 14,
						fontWeight: "600",
						color: theme.textMuted,
						textTransform: "uppercase",
						letterSpacing: 0.4,
					}}
				>
					Nome
				</ThemedText>
				<SmoothView
					radius={18}
					smoothing={1}
					backgroundColor={theme.elevated}
					borderColor={theme.border}
					borderWidth={1}
					shadow={false}
				>
					<TextInput
						value={name}
						onChangeText={setName}
						placeholder="Es. Marco R."
						placeholderTextColor={theme.textMuted}
						autoComplete="name"
						style={{ padding: 16, fontSize: 16, color: theme.text }}
					/>
				</SmoothView>
			</View>

			<View style={{ gap: 10 }}>
				<View style={{ gap: 2 }}>
					<ThemedText
						style={{
							fontSize: 14,
							fontWeight: "600",
							color: theme.textMuted,
							textTransform: "uppercase",
							letterSpacing: 0.4,
						}}
					>
						Livello di gioco
					</ThemedText>
					<ThemedText
						style={{ fontSize: 13, lineHeight: 18, color: theme.textMuted }}
					>
						1.0 principiante · 5.0 professionista
					</ThemedText>
				</View>
				<View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
					{LEVELS.map((value) => {
						const selected = value === level;
						return (
							<Pressable
								key={value}
								onPress={() => setLevel(value)}
								style={{
									paddingHorizontal: 14,
									paddingVertical: 8,
									borderRadius: 999,
									borderWidth: 1,
									borderColor: selected ? theme.tint : theme.border,
									backgroundColor: selected ? theme.tint : theme.elevated,
								}}
							>
								<ThemedText
									style={{
										fontSize: 14,
										lineHeight: 18,
										fontWeight: "500",
										color: selected ? theme.tintForeground : theme.text,
									}}
								>
									{formatLevel(value)}
								</ThemedText>
							</Pressable>
						);
					})}
				</View>
			</View>

			<SmoothView
				radius={20}
				smoothing={1}
				backgroundColor={theme.tint}
				onPress={handleSave}
				style={{
					height: 56,
					flexDirection: "row",
					alignItems: "center",
					justifyContent: "center",
					gap: 8,
					opacity: saving ? 0.7 : 1,
				}}
			>
				{saving ? (
					<ActivityIndicator color={theme.tintForeground} />
				) : (
					<>
						<IconSymbol
							name="checkmark.circle.fill"
							size={18}
							color={theme.tintForeground}
						/>
						<ThemedText
							style={{
								fontSize: 17,
								fontWeight: "600",
								color: theme.tintForeground,
							}}
						>
							Salva profilo
						</ThemedText>
					</>
				)}
			</SmoothView>
		</ScrollView>
	);
}
