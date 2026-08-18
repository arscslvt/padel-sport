import { Alert, Pressable, View } from "react-native";
import { Avatar } from "@/components/open-match-card";
import { ThemedText } from "@/components/themed-text";
import {
	ChoiceCard,
	Hint,
	NestedOption,
	SectionLabel,
} from "@/components/ui/choice";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useTheme } from "@/hooks/use-theme";
import { MAX_PLAYERS } from "@/lib/booking";
import { type JoinMode, joinModeMeta, type PlayerView } from "@/lib/format";

/**
 * Terzo passo: la squadra.
 *
 * Con una cerchia scelta non c'è nulla da decidere — la partita è di quel
 * gruppo e l'invito parte a tutti — quindi al posto della scelta compare il
 * riepilogo di cosa sta per succedere. Altrimenti si sceglie fra partita
 * aperta (visibile a chi cerca compagni) e partita privata.
 */
export default function StepPlayers({
	player,
	keepOpen,
	joinMode,
	circleName,
	circleMembers,
	onKeepOpenChange,
	onJoinModeChange,
}: {
	player: PlayerView | null;
	keepOpen: boolean;
	joinMode: JoinMode;
	/** Valorizzato quando si sta creando una partita dentro una cerchia. */
	circleName?: string;
	circleMembers?: PlayerView[];
	onKeepOpenChange: (keepOpen: boolean) => void;
	onJoinModeChange: (mode: JoinMode) => void;
}) {
	// L'unico giocatore certo è chi prenota: gli altri posti restano da riempire
	const freeSlots = MAX_PLAYERS - 1;
	const inviteSlots = Array.from({ length: freeSlots }, (_, index) => index);

	if (circleName) {
		const invitees = (circleMembers ?? []).filter(
			(member) => member.id !== player?.id,
		);

		return (
			<View style={{ gap: 22 }}>
				<View style={{ gap: 12 }}>
					<SectionLabel>Partita della cerchia</SectionLabel>
					<ChoiceCard
						icon="person.3.fill"
						title={circleName}
						description={
							invitees.length > 0
								? `${invitees.length} ${invitees.length === 1 ? "giocatore riceverà" : "giocatori riceveranno"} l'invito. I primi ${freeSlots} che rispondono entrano.`
								: "Sei l'unico membro: invita qualcuno nella cerchia, oppure apri la partita a tutti più avanti."
						}
						selected
						onPress={() => {}}
					/>
				</View>

				{invitees.length > 0 && (
					<View style={{ gap: 12 }}>
						<SectionLabel>{`Chi riceve l'invito (${invitees.length})`}</SectionLabel>
						<View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
							{invitees.map((member) => (
								<View
									key={member.id}
									style={{ alignItems: "center", gap: 6, width: 56 }}
								>
									<Avatar url={member.avatarUrl} size={56} />
									<ThemedText style={{ fontSize: 12 }} numberOfLines={1}>
										{member.name.split(" ")[0]}
									</ThemedText>
								</View>
							))}
						</View>
					</View>
				)}

				<Hint icon="globe">
					Se non arrivate a {MAX_PLAYERS}, potrai aprire la partita a tutti
					tenendo chi è già entrato.
				</Hint>
			</View>
		);
	}

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
				<Hint icon="person.3.fill">
					Per invitare direttamente i tuoi compagni crea una cerchia dalla
					scheda Amici.
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

/** Posto libero in squadra: fuori da una cerchia non si invita nessuno. */
function InviteSlot() {
	const theme = useTheme();

	return (
		<Pressable
			onPress={() =>
				Alert.alert(
					"Come si invita",
					"Gli inviti diretti passano dalle cerchie: creane una dalla scheda Amici e le partite di quel gruppo arriveranno a tutti i membri. Altrimenti lascia la partita aperta.",
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
