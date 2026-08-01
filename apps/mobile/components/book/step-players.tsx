import { Alert, Pressable, View } from "react-native";
import {
	ChoiceCard,
	Hint,
	NestedOption,
	SectionLabel,
} from "@/components/book/primitives";
import { Avatar } from "@/components/open-match-card";
import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useTheme } from "@/hooks/use-theme";
import { MAX_PLAYERS } from "@/lib/booking";
import { type JoinMode, joinModeMeta, type PlayerView } from "@/lib/format";

/**
 * Terzo passo: la squadra. Gli inviti diretti non sono ancora supportati dal
 * backend, quindi la scelta effettiva è tra partita aperta (visibile a chi
 * cerca compagni) e partita privata.
 */
export default function StepPlayers({
	player,
	keepOpen,
	joinMode,
	onKeepOpenChange,
	onJoinModeChange,
}: {
	player: PlayerView | null;
	keepOpen: boolean;
	joinMode: JoinMode;
	onKeepOpenChange: (keepOpen: boolean) => void;
	onJoinModeChange: (mode: JoinMode) => void;
}) {
	// L'unico giocatore certo è chi prenota: gli altri posti restano da riempire
	const freeSlots = MAX_PLAYERS - 1;
	const inviteSlots = Array.from({ length: freeSlots }, (_, index) => index);

	return (
		<View style={{ gap: 22 }}>
			<View style={{ gap: 12 }}>
				<SectionLabel>{`La squadra (1/${MAX_PLAYERS})`}</SectionLabel>
				<View style={{ flexDirection: "row", gap: 12 }}>
					<View style={{ alignItems: "center", gap: 6 }}>
						<Avatar url={player?.avatarUrl} size={56} />
						<ThemedText style={{ fontSize: 12 }}>Tu</ThemedText>
					</View>
					{inviteSlots.map((slot) => (
						<InviteSlot key={slot} />
					))}
				</View>
				<Hint icon="person.crop.circle.badge.plus">
					Gli inviti diretti ai tuoi compagni arriveranno con un prossimo
					aggiornamento.
				</Hint>
			</View>

			<View style={{ gap: 12 }}>
				<SectionLabel>Chi può unirsi</SectionLabel>

				<ChoiceCard
					icon="person.2.fill"
					title="Lascia la partita aperta"
					description={`Mancano ${freeSlots} giocatori: la partita è visibile a chi ne cerca una del tuo livello.`}
					selected={keepOpen}
					onPress={() => onKeepOpenChange(true)}
				>
					<View style={{ gap: 8 }}>
						{(Object.keys(joinModeMeta) as JoinMode[]).map((mode) => (
							<NestedOption
								key={mode}
								icon={joinModeMeta[mode].icon}
								title={joinModeMeta[mode].label}
								description={joinModeMeta[mode].description}
								selected={joinMode === mode}
								onPress={() => onJoinModeChange(mode)}
							/>
						))}
					</View>
				</ChoiceCard>

				<ChoiceCard
					icon="lock.fill"
					title="Partita privata"
					description="Il campo è prenotato a tuo nome e non compare tra le partite aperte."
					selected={!keepOpen}
					onPress={() => onKeepOpenChange(false)}
				/>
			</View>
		</View>
	);
}

/** Posto libero in squadra: segnaposto finché gli inviti non sono disponibili. */
function InviteSlot() {
	const theme = useTheme();

	return (
		<Pressable
			onPress={() =>
				Alert.alert(
					"Inviti in arrivo",
					"Presto potrai invitare i tuoi compagni dall'app. Per ora lascia la partita aperta: chi cerca una partita del tuo livello potrà unirsi.",
				)
			}
			style={{ alignItems: "center", gap: 6 }}
		>
			<View
				style={{
					width: 56,
					height: 56,
					borderRadius: 999,
					borderWidth: 1,
					borderStyle: "dashed",
					borderColor: theme.border,
					backgroundColor: theme.muted,
					alignItems: "center",
					justifyContent: "center",
				}}
			>
				<IconSymbol name="plus" size={18} color={theme.textMuted} />
			</View>
			<ThemedText style={{ fontSize: 12, color: theme.textMuted }}>
				Invita
			</ThemedText>
		</Pressable>
	);
}
