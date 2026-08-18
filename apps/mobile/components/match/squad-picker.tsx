import type { Id } from "@padel-sport/backend/convex/_generated/dataModel";
import { useState } from "react";
import { View } from "react-native";
import PlayerPicker from "@/components/circles/player-picker";
import { Avatar } from "@/components/open-match-card";
import { ThemedText } from "@/components/themed-text";
import { Button } from "@/components/ui/button";
import { Hint, SectionLabel, selectionFeedback } from "@/components/ui/choice";
import { IconSymbol } from "@/components/ui/icon-symbol";
import RowAction from "@/components/ui/row-action";
import { Tabs, TabsItem, TabsList } from "@/components/ui/tabs";
import { TextField } from "@/components/ui/text-field";
import { useTheme } from "@/hooks/use-theme";
import type { PlayerView } from "@/lib/format";

/** Giocatore senza app: di lui si sa il nome, e se lo si vuole la mail. */
export interface GuestDraft {
	name: string;
	email?: string;
}

/** Un posto in campo, quale che sia il tipo di persona che lo occupa. */
export interface SquadSeat {
	key: string;
	name: string;
	avatarUrl?: string;
	/** Riga di stato sotto il nome: "in attesa", "senza app"… */
	detail?: string;
	/** Assente sui posti che non si possono liberare (il creatore). */
	onRemove?: () => void;
	busy?: boolean;
}

type Mode = "player" | "guest";

/**
 * Composizione della squadra: i posti già presi e un pannello per riempire
 * quelli liberi, con un giocatore dell'app o con il nome di chi l'app non ce
 * l'ha.
 *
 * Il pannello si apre **in linea** e non in uno sheet: sia la prenotazione sia
 * il dettaglio partita sono già dei form sheet, e su iOS uno sheet sopra
 * l'altro è l'incastro che il dettaglio evita già per "Rendi la partita
 * aperta".
 */
export default function SquadPicker({
	seats,
	freeSeats,
	excludeIds,
	onAddPlayer,
	onAddGuest,
	busy,
	showSeats = true,
}: {
	seats: SquadSeat[];
	freeSeats: number;
	/**
	 * Con `false` resta il solo pannello di aggiunta: nel dettaglio partita la
	 * squadra è già elencata sopra, e ripeterla qui la mostrerebbe due volte.
	 */
	showSeats?: boolean;
	/** Chi è già in squadra e non va riproposto nella ricerca. */
	excludeIds?: Id<"players">[];
	onAddPlayer: (player: PlayerView) => void;
	onAddGuest: (guest: GuestDraft) => void;
	busy?: boolean;
}) {
	const theme = useTheme();

	const [open, setOpen] = useState(false);
	const [mode, setMode] = useState<Mode>("player");
	const [term, setTerm] = useState("");
	const [guestName, setGuestName] = useState("");
	const [guestEmail, setGuestEmail] = useState("");

	const total = seats.length + freeSeats;

	const addPlayer = (player: PlayerView) => {
		onAddPlayer(player);
		setTerm("");
		setOpen(false);
	};

	const addGuest = () => {
		onAddGuest({
			name: guestName.trim(),
			email: guestEmail.trim() || undefined,
		});
		setGuestName("");
		setGuestEmail("");
		setOpen(false);
	};

	return (
		<View style={{ gap: 12 }}>
			{showSeats && (
				<SectionLabel>{`La squadra (${seats.length}/${total})`}</SectionLabel>
			)}

			<View style={{ gap: 8, display: showSeats ? "flex" : "none" }}>
				{seats.map((seat) => (
					<View
						key={seat.key}
						style={{
							flexDirection: "row",
							alignItems: "center",
							gap: 12,
							paddingVertical: 6,
						}}
					>
						<Avatar url={seat.avatarUrl} size={40} />
						<View style={{ flex: 1, gap: 2 }}>
							<ThemedText style={{ fontSize: 15 }} numberOfLines={1}>
								{seat.name}
							</ThemedText>
							{seat.detail && (
								<ThemedText style={{ fontSize: 12, color: theme.textMuted }}>
									{seat.detail}
								</ThemedText>
							)}
						</View>
						{seat.onRemove && (
							<RowAction
								icon="xmark"
								label={`Togli ${seat.name}`}
								busy={seat.busy}
								onPress={seat.onRemove}
							/>
						)}
					</View>
				))}

				{Array.from({ length: freeSeats }, (_, index) => (
					<View
						key={`free-${index}`}
						style={{
							flexDirection: "row",
							alignItems: "center",
							gap: 12,
							paddingVertical: 6,
							opacity: 0.6,
						}}
					>
						<View
							style={{
								width: 40,
								height: 40,
								borderRadius: 999,
								borderWidth: 1,
								borderStyle: "dashed",
								borderColor: theme.border,
								alignItems: "center",
								justifyContent: "center",
							}}
						>
							<IconSymbol name="plus" size={16} color={theme.textMuted} />
						</View>
						<ThemedText style={{ fontSize: 15, color: theme.textMuted }}>
							Posto libero
						</ThemedText>
					</View>
				))}
			</View>

			{freeSeats === 0 ? (
				<Hint icon="checkmark.circle.fill">
					Siete al completo: per cambiare qualcosa libera prima un posto.
				</Hint>
			) : open ? (
				<View style={{ gap: 12 }}>
					<Tabs
						defaultTab="player"
						value={mode}
						onTabChange={(tab) => {
							selectionFeedback();
							setMode(tab as Mode);
						}}
					>
						<TabsList>
							<TabsItem name="player" title="Ha l'app" />
							<TabsItem name="guest" title="Non ce l'ha" />
						</TabsList>
					</Tabs>

					{mode === "player" ? (
						<>
							<Hint icon="envelope.fill">
								Riceverà un invito: il posto resta suo finché non risponde.
							</Hint>
							<PlayerPicker
								term={term}
								onTermChange={setTerm}
								selected={[]}
								onToggle={addPlayer}
								excludeIds={excludeIds}
							/>
						</>
					) : (
						<View style={{ gap: 10 }}>
							<TextField
								value={guestName}
								onChangeText={setGuestName}
								placeholder="Nome del giocatore"
								autoCapitalize="words"
								autoCorrect={false}
								maxLength={60}
								autoFocus
							/>
							<TextField
								value={guestEmail}
								onChangeText={setGuestEmail}
								placeholder="Email (facoltativa)"
								autoCapitalize="none"
								autoCorrect={false}
								keyboardType="email-address"
							/>
							<Hint icon="paperplane.fill">
								Con la mail gli mandiamo un invito a scaricare l&apos;app. Senza,
								resta solo il suo nome in squadra.
							</Hint>
							<Button
								label="Aggiungi alla squadra"
								icon="checkmark.circle.fill"
								iconPosition="leading"
								height={50}
								disabled={guestName.trim().length < 2}
								loading={busy}
								onPress={addGuest}
							/>
						</View>
					)}

					<Button
						label="Annulla"
						variant="secondary"
						height={46}
						onPress={() => setOpen(false)}
					/>
				</View>
			) : (
				<Button
					label="Aggiungi un giocatore"
					icon="person.crop.circle.badge.plus"
					iconPosition="leading"
					variant="secondary"
					height={50}
					loading={busy}
					onPress={() => {
						selectionFeedback();
						setOpen(true);
					}}
				/>
			)}
		</View>
	);
}
