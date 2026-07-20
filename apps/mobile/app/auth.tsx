import { useSignIn, useSignUp } from "@clerk/clerk-expo";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
	ActivityIndicator,
	Platform,
	Pressable,
	ScrollView,
	TextInput,
	View,
} from "react-native";
import SmoothView from "@/components/smooth-view";
import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useTheme } from "@/hooks/use-theme";

/**
 * Accesso con email + codice di verifica (stessa istanza Clerk del sito web).
 * Se l'email non esiste ancora, viene creato automaticamente un account.
 */
export default function AuthScreen() {
	const theme = useTheme();
	const router = useRouter();
	const { signIn, setActive: setActiveSignIn, isLoaded } = useSignIn();
	const { signUp, setActive: setActiveSignUp } = useSignUp();

	const [step, setStep] = useState<"email" | "code">("email");
	const [mode, setMode] = useState<"signIn" | "signUp">("signIn");
	const [email, setEmail] = useState("");
	const [code, setCode] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);

	const clerkError = (err: unknown): string => {
		const e = err as {
			errors?: { code?: string; longMessage?: string; message?: string }[];
		};
		return (
			e.errors?.[0]?.longMessage ??
			e.errors?.[0]?.message ??
			"Si è verificato un errore. Riprova."
		);
	};

	const handleSendCode = async () => {
		if (!isLoaded || !signIn || !signUp) return;
		const trimmed = email.trim().toLowerCase();
		if (!trimmed) {
			setError("Inserisci la tua email.");
			return;
		}

		setLoading(true);
		setError(null);
		try {
			await signIn.create({ identifier: trimmed, strategy: "email_code" });
			setMode("signIn");
			setStep("code");
		} catch (err) {
			const e = err as { errors?: { code?: string }[] };
			if (e.errors?.[0]?.code === "form_identifier_not_found") {
				// Account nuovo: registrazione con verifica email
				try {
					await signUp.create({ emailAddress: trimmed });
					await signUp.prepareEmailAddressVerification({
						strategy: "email_code",
					});
					setMode("signUp");
					setStep("code");
				} catch (signUpErr) {
					setError(clerkError(signUpErr));
				}
			} else {
				setError(clerkError(err));
			}
		} finally {
			setLoading(false);
		}
	};

	const handleVerifyCode = async () => {
		if (!signIn || !signUp) return;
		if (!code.trim()) {
			setError("Inserisci il codice ricevuto via email.");
			return;
		}

		setLoading(true);
		setError(null);
		try {
			if (mode === "signIn") {
				const result = await signIn.attemptFirstFactor({
					strategy: "email_code",
					code: code.trim(),
				});
				if (result.status === "complete") {
					await setActiveSignIn({ session: result.createdSessionId });
					router.back();
					return;
				}
			} else {
				const result = await signUp.attemptEmailAddressVerification({
					code: code.trim(),
				});
				if (result.status === "complete") {
					await setActiveSignUp({ session: result.createdSessionId });
					router.dismiss();
					router.push("/profile-setup");
					return;
				}
			}
			setError("Verifica non completata. Riprova.");
		} catch (err) {
			setError(clerkError(err));
		} finally {
			setLoading(false);
		}
	};

	return (
		<ScrollView
			style={{ flex: 1, backgroundColor: theme.background }}
			contentContainerStyle={{ padding: 20, paddingBottom: 40, gap: 20 }}
			keyboardShouldPersistTaps="handled"
		>
			<View style={{ flexDirection: "row", alignItems: "flex-start" }}>
				<View style={{ flex: 1, gap: 4 }}>
					<ThemedText type="title">Accedi</ThemedText>
					<ThemedText type="subtitle" style={{ fontSize: 15 }}>
						{step === "email"
							? "Ti inviamo un codice di accesso via email."
							: `Codice inviato a ${email.trim().toLowerCase()}`}
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

			<SmoothView
				radius={18}
				smoothing={1}
				backgroundColor={theme.elevated}
				borderColor={theme.border}
				borderWidth={1}
				shadow={false}
			>
				{step === "email" ? (
					<TextInput
						value={email}
						onChangeText={setEmail}
						placeholder="La tua email"
						placeholderTextColor={theme.textMuted}
						autoCapitalize="none"
						autoComplete="email"
						keyboardType="email-address"
						autoFocus
						style={{ padding: 16, fontSize: 16, color: theme.text }}
					/>
				) : (
					<TextInput
						value={code}
						onChangeText={setCode}
						placeholder="Codice di verifica"
						placeholderTextColor={theme.textMuted}
						keyboardType="number-pad"
						autoComplete="one-time-code"
						autoFocus
						style={{
							padding: 16,
							fontSize: 20,
							letterSpacing: 6,
							color: theme.text,
						}}
					/>
				)}
			</SmoothView>

			{error && (
				<ThemedText style={{ color: "#e5484d", fontSize: 14, lineHeight: 20 }}>
					{error}
				</ThemedText>
			)}

			<SmoothView
				radius={20}
				smoothing={1}
				backgroundColor={theme.tint}
				onPress={step === "email" ? handleSendCode : handleVerifyCode}
				style={{
					height: 56,
					flexDirection: "row",
					alignItems: "center",
					justifyContent: "center",
					gap: 8,
					opacity: loading ? 0.7 : 1,
				}}
			>
				{loading ? (
					<ActivityIndicator color={theme.tintForeground} />
				) : (
					<>
						<IconSymbol
							name={step === "email" ? "envelope.fill" : "checkmark.circle.fill"}
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
							{step === "email" ? "Invia codice" : "Verifica e accedi"}
						</ThemedText>
					</>
				)}
			</SmoothView>

			{step === "code" && (
				<Pressable onPress={() => setStep("email")} hitSlop={8}>
					<ThemedText
						style={{ fontSize: 14, color: theme.textMuted, textAlign: "center" }}
					>
						Email sbagliata? Torna indietro
					</ThemedText>
				</Pressable>
			)}
		</ScrollView>
	);
}
