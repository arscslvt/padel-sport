import { useSignIn, useSSO } from "@clerk/clerk-expo";
import * as AuthSession from "expo-auth-session";
import { Image } from "expo-image";
import { StatusBar } from "expo-status-bar";
import * as WebBrowser from "expo-web-browser";
import { useEffect, useRef, useState } from "react";
import {
	Alert,
	Dimensions,
	Linking,
	KeyboardAvoidingView,
	Platform,
	Pressable,
	ScrollView,
	StyleSheet,
	Text,
	type TextInput,
	View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button } from "@/components/ui/button";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { TextField } from "@/components/ui/text-field";
import { Fonts } from "@/constants/fonts";

// Necessario per completare le sessioni OAuth aperte nel browser di sistema.
WebBrowser.maybeCompleteAuthSession();

/** Il numero della struttura: è da lì che si ottiene un invito. */
const CLUB_PHONE = "+39 320 175 5897";

/** Palette del design Figma: schermata brandizzata ad aspetto fisso
 *  (hero verde + card bianca), indipendente dal tema chiaro/scuro. */
const C = {
	emerald950: "#022C22",
	emerald50: "#ECFDF5",
	emerald700: "#047857",
	green: "#5CCC95",
	white: "#FFFFFF",
	// Fill dei campi/bottoni secondari: grigio chiaro che stacca dalla card bianca
	// (come i campi bianchi staccano sul fondo off-white delle altre modali).
	n50: "#F1F1F2",
	n200: "#DDDDDE",
	n500: "#737373",
	n900: "#171717",
	danger: "#E5484D",
	glassBg: "rgba(236,253,245,0.08)",
	glassBorder: "rgba(255,255,255,0.18)",
	pillBg: "rgba(255,255,255,0.10)",
};

const FONT = {
	regular: Fonts.regular,
	medium: Fonts.medium,
	semibold: Fonts.semiBold,
};

/** Card informative del carosello nella parte alta (onboarding). */
const FEATURES = [
	"Riunisci la tua squadra e prenota un campo in un click",
	"Trova avversari del tuo livello e organizza partite equilibrate",
	"Segui le classifiche e scala la vetta del club",
];

const { width: SCREEN_W } = Dimensions.get("window");
const CARD_W = Math.min(300, Math.round(SCREEN_W * 0.74));

/**
 * Schermata di login (route principale per gli utenti non autenticati, vedi
 * il gate in `components/root-stack.tsx`).
 *
 * Accesso con email + codice di verifica (stessa istanza Clerk del sito web):
 * se l'email non esiste ancora, viene creato automaticamente un account.
 * In più, accesso social Google/Facebook tramite il flusso SSO di Clerk.
 *
 * Ad accesso completato non navighiamo manualmente: `setActive` aggiorna lo
 * stato Clerk e il gate sostituisce la route con l'app (best practice Expo
 * Router con route protette).
 */
export default function LoginScreen() {
	const insets = useSafeAreaInsets();
	const { signIn, setActive: setActiveSignIn, isLoaded } = useSignIn();
	const { startSSOFlow } = useSSO();
	const emailRef = useRef<TextInput>(null);

	const [step, setStep] = useState<"email" | "code" | "invite">("email");

	const [email, setEmail] = useState("");
	const [code, setCode] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);
	const [ssoLoading, setSsoLoading] = useState<"google" | "facebook" | null>(
		null,
	);

	// Pre-riscalda il browser di sistema per un OAuth più rapido (Android).
	useEffect(() => {
		void WebBrowser.warmUpAsync();
		return () => {
			void WebBrowser.coolDownAsync();
		};
	}, []);

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
		if (!isLoaded || !signIn) return;
		const trimmed = email.trim().toLowerCase();
		if (!trimmed) {
			setError("Inserisci la tua email.");
			return;
		}

		setLoading(true);
		setError(null);
		try {
			await signIn.create({ identifier: trimmed, strategy: "email_code" });
			setStep("code");
		} catch (err) {
			const e = err as { errors?: { code?: string }[] };
			// Mail sconosciuta: al club si entra su invito, quindi qui non si
			// registra più nessuno. Prima l'app apriva un account da sola, e
			// l'iscrizione "solo su invito" restava un'intenzione.
			if (e.errors?.[0]?.code === "form_identifier_not_found") {
				setStep("invite");
			} else {
				setError(clerkError(err));
			}
		} finally {
			setLoading(false);
		}
	};

	const handleVerifyCode = async () => {
		if (!signIn) return;
		if (!code.trim()) {
			setError("Inserisci il codice ricevuto via email.");
			return;
		}

		setLoading(true);
		setError(null);
		try {
			const result = await signIn.attemptFirstFactor({
				strategy: "email_code",
				code: code.trim(),
			});
			if (result.status === "complete") {
				// Il gate reagisce a isSignedIn e mostra l'app: nessuna navigazione manuale.
				await setActiveSignIn({ session: result.createdSessionId });
				return;
			}
			setError("Verifica non completata. Riprova.");
		} catch (err) {
			setError(clerkError(err));
		} finally {
			setLoading(false);
		}
	};

	const handleSSO = async (provider: "google" | "facebook") => {
		if (ssoLoading) return;
		setSsoLoading(provider);
		setError(null);
		try {
			const { createdSessionId, setActive } = await startSSOFlow({
				strategy: provider === "google" ? "oauth_google" : "oauth_facebook",
				redirectUrl: AuthSession.makeRedirectUri(),
			});
			if (createdSessionId && setActive) {
				await setActive({ session: createdSessionId });
			}
		} catch (err) {
			setError(clerkError(err));
		} finally {
			setSsoLoading(null);
		}
	};

	const handleSupport = () => {
		// TODO: sostituire con il canale di supporto reale del club.
		Alert.alert(
			"Serve una mano?",
			"Scrivici e ti aiutiamo ad accedere o a creare il tuo account.",
		);
	};

	const handleSignUpHint = () => {
		// Al club si entra su invito: non c'è niente da spiegare su come
		// registrarsi, perché non si può. Si spiega come farsi invitare.
		setError(null);
		setStep("invite");
	};

	const handleCallClub = () => {
		Linking.openURL(`tel:${CLUB_PHONE.replace(/\s/g, "")}`).catch(() => {
			Alert.alert("Chiamaci", CLUB_PHONE);
		});
	};

	return (
		<View style={styles.root}>
			<StatusBar style="light" />

			{/* HERO — logo, supporto e carosello onboarding su fondo verde */}
			<View style={[styles.hero, { paddingTop: insets.top + 12 }]}>
				<View style={styles.heroHeader}>
					<Image
						source={require("@/assets/branding/logotype-dark.svg")}
						style={styles.logo}
						contentFit="contain"
					/>
					<Pressable
						onPress={handleSupport}
						hitSlop={8}
						style={({ pressed }) => [styles.supportPill, pressed && styles.pressed]}
						accessibilityRole="button"
						accessibilityLabel="Vuoi supporto?"
					>
						<IconSymbol name="lifepreserver" size={18} color={C.white} />
						<Text style={styles.supportText}>Vuoi supporto?</Text>
					</Pressable>
				</View>

				<ScrollView
					horizontal
					showsHorizontalScrollIndicator={false}
					style={styles.carousel}
					contentContainerStyle={styles.carouselContent}
					decelerationRate="fast"
					snapToInterval={CARD_W + 12}
					snapToAlignment="start"
				>
					{FEATURES.map((text) => (
						<View key={text} style={styles.featureCard}>
							<Text style={styles.featureText}>{text}</Text>
							<View style={styles.featureShape} />
						</View>
					))}
				</ScrollView>
			</View>

			{/* CARD — form di accesso su fondo bianco. Bottoni e campi provengono
			    dal design system condiviso (Button / TextField). */}
			<KeyboardAvoidingView
				behavior={Platform.OS === "ios" ? "padding" : undefined}
			>
				<View style={[styles.sheet, { paddingBottom: insets.bottom + 20 }]}>
					<View style={styles.sheetHeader}>
						<Text style={styles.eyebrow}>
							{step === "email"
								? "Pronto a scendere in campo?"
								: step === "invite"
									? "Al club si entra su invito"
									: `Codice inviato a ${email.trim().toLowerCase()}`}
						</Text>
						<Text style={styles.title}>
							{step === "email"
								? "Accedi alla tua area personale"
								: step === "invite"
									? "Fatti invitare dal club"
									: "Inserisci il codice"}
						</Text>
					</View>

					{step === "email" && (
						<>
							<TextField
								ref={emailRef}
								value={email}
								onChangeText={setEmail}
								placeholder="E-mail"
								autoCapitalize="none"
								autoComplete="email"
								keyboardType="email-address"
								returnKeyType="go"
								onSubmitEditing={handleSendCode}
								editable={!loading}
								backgroundColor={C.n50}
								borderColor={C.n200}
								textColor={C.n900}
								placeholderTextColor={C.n500}
							/>

							{error && <Text style={styles.error}>{error}</Text>}

							<Button
								label="Continua"
								icon="arrow.right"
								onPress={handleSendCode}
								loading={loading}
								backgroundColor={C.emerald950}
								textColor={C.emerald50}
							/>

							<View style={styles.socialRow}>
								<Button
									variant="secondary"
									label="Google"
									onPress={() => handleSSO("google")}
									loading={ssoLoading === "google"}
									disabled={!!ssoLoading}
									backgroundColor={C.n50}
									borderColor={C.n200}
									textColor={C.n900}
									style={styles.socialBtn}
									leading={
										<Image
											source={require("@/assets/branding/google.svg")}
											style={styles.socialIcon}
											contentFit="contain"
										/>
									}
								/>
								<Button
									variant="secondary"
									label="Facebook"
									onPress={() => handleSSO("facebook")}
									loading={ssoLoading === "facebook"}
									disabled={!!ssoLoading}
									backgroundColor={C.n50}
									borderColor={C.n200}
									textColor={C.n900}
									style={styles.socialBtn}
									leading={
										<Image
											source={require("@/assets/branding/facebook.svg")}
											style={styles.socialIcon}
											contentFit="contain"
										/>
									}
								/>
							</View>

							<Pressable
								onPress={handleSignUpHint}
								hitSlop={8}
								style={styles.signupRow}
							>
								<Text style={styles.signupText}>Non hai un account?</Text>
								<Text style={styles.signupLink}>Come si entra</Text>
								<IconSymbol name="arrow.right" size={16} color={C.emerald700} />
							</Pressable>
						</>
					)}

					{step === "code" && (
						<>
							<TextField
								value={code}
								onChangeText={setCode}
								placeholder="Codice di verifica"
								keyboardType="number-pad"
								autoComplete="one-time-code"
								autoFocus
								returnKeyType="go"
								onSubmitEditing={handleVerifyCode}
								editable={!loading}
								backgroundColor={C.n50}
								borderColor={C.n200}
								textColor={C.n900}
								placeholderTextColor={C.n500}
								style={styles.codeInput}
							/>

							{error && <Text style={styles.error}>{error}</Text>}

							<Button
								label="Verifica e accedi"
								icon="checkmark.circle.fill"
								onPress={handleVerifyCode}
								loading={loading}
								backgroundColor={C.emerald950}
								textColor={C.emerald50}
							/>

							<Pressable
								onPress={() => {
									setError(null);
									setCode("");
									setStep("email");
								}}
								hitSlop={8}
								style={styles.signupRow}
							>
								<Text style={styles.signupLink}>
									Email sbagliata? Torna indietro
								</Text>
							</Pressable>
						</>
					)}

					{step === "invite" && (
						<>
							<Text style={styles.inviteBody}>
								L'account del club non si crea da soli: te lo apriamo noi. Chiama
								la struttura o passa a trovarci, lasci nome e indirizzo email e
								ricevi subito l'invito per completare l'iscrizione — poi entri
								da qui, sempre con un codice via mail.
							</Text>

							<Button
								label="Chiama il club"
								icon="phone.fill"
								onPress={handleCallClub}
								backgroundColor={C.emerald950}
								textColor={C.emerald50}
							/>

							<Pressable
								onPress={() => {
									setError(null);
									setStep("email");
								}}
								hitSlop={8}
								style={styles.signupRow}
							>
								<Text style={styles.signupLink}>
									Hai già un account? Torna indietro
								</Text>
							</Pressable>
						</>
					)}
				</View>
			</KeyboardAvoidingView>
		</View>
	);
}

const styles = StyleSheet.create({
	root: {
		flex: 1,
		backgroundColor: C.emerald950,
	},
	// HERO
	hero: {
		flex: 1,
		paddingHorizontal: 22,
	},
	heroHeader: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
	},
	logo: {
		width: 68,
		height: 38,
	},
	supportPill: {
		flexDirection: "row",
		alignItems: "center",
		gap: 8,
		height: 32,
		paddingHorizontal: 12,
		borderRadius: 999,
		backgroundColor: C.pillBg,
		borderWidth: 1,
		borderColor: C.glassBorder,
	},
	supportText: {
		color: C.white,
		fontFamily: FONT.medium,
		fontSize: 15,
	},
	carousel: {
		flex: 1,
		marginTop: 24,
		marginBottom: 20,
	},
	carouselContent: {
		gap: 12,
		paddingRight: 22,
		// Le card si stirano in altezza (alignItems: "stretch" di default) fino
		// a riempire la ScrollView, senza altezze percentuali circolari.
		alignItems: "stretch",
	},
	featureCard: {
		width: CARD_W,
		borderRadius: 12,
		backgroundColor: C.glassBg,
		borderWidth: 1,
		borderColor: C.glassBorder,
		overflow: "hidden",
	},
	featureText: {
		position: "absolute",
		top: 22,
		left: 20,
		right: 20,
		color: C.white,
		fontFamily: FONT.medium,
		fontSize: 15,
		lineHeight: 20,
		zIndex: 2,
	},
	featureShape: {
		position: "absolute",
		left: 46,
		right: 0,
		bottom: -40,
		top: 100,
		backgroundColor: C.green,
		borderTopLeftRadius: 33,
	},
	// SHEET (card bianca)
	sheet: {
		backgroundColor: C.white,
		paddingHorizontal: 22,
		paddingTop: 30,
		gap: 12,
	},
	sheetHeader: {
		gap: 4,
		marginBottom: 6,
	},
	eyebrow: {
		color: C.n500,
		fontFamily: FONT.medium,
		fontSize: 16,
	},
	title: {
		color: C.n900,
		fontFamily: FONT.semibold,
		fontSize: 22,
	},
	codeInput: {
		fontSize: 18,
		letterSpacing: 6,
	},
	socialRow: {
		flexDirection: "row",
		gap: 8,
	},
	socialBtn: {
		flex: 1,
	},
	socialIcon: {
		width: 22,
		height: 22,
	},
	signupRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: 6,
		marginTop: 4,
	},
	signupText: {
		color: C.n900,
		fontFamily: FONT.medium,
		fontSize: 15,
	},
	signupLink: {
		color: C.emerald700,
		fontFamily: FONT.medium,
		fontSize: 15,
	},
	inviteBody: {
		fontFamily: FONT.regular,
		fontSize: 14,
		lineHeight: 21,
		color: C.n500,
	},
	error: {
		color: C.danger,
		fontFamily: FONT.regular,
		fontSize: 14,
		lineHeight: 20,
	},
	pressed: {
		opacity: 0.85,
	},
});
