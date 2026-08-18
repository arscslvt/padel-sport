import type { Id } from "@padel-sport/backend/convex/_generated/dataModel";
import { View } from "react-native";
import SquadPicker, {
	type GuestDraft,
	type SquadSeat,
} from "@/components/match/squad-picker";
import {
	ChoiceCard,
	Hint,
	NestedOption,
	SectionLabel,
} from "@/components/ui/choice";
import { MAX_PLAYERS } from "@/lib/booking";
import { type JoinMode, joinModeMeta, type PlayerView } from "@/lib/format";

/** Visibilità scelte dall'utente qui: la cerchia arriva dal contesto, non da una scelta. */
export type BookVisibility = "public" | "private";

/**
 * Terzo passo: chi gioca.
 *
 * Due decisioni distinte, nell'ordine in cui contano: chi può vedere la
 * partita, e con chi la si gioca. La squadra si compone allo stesso modo in
 * tutti e tre i casi — anche in una partita aperta si può già chiamare
 * qualcuno — quindi il picker sta fuori dalla scelta di visibilità.
 *
 * Si può anche non indicare nessuno: per la struttura vale come "vengo con
 * altri tre".
 */
export default function StepPlayers({
	player,
	visibility,
	joinMode,
	invited,
	guests,
	circleName,
	circleMembers,
	onVisibilityChange,
	onJoinModeChange,
	onInvite,
	onRemoveInvited,
	onAddGuest,
	onRemoveGuest,
}: {
	player: PlayerView | null;
	visibility: BookVisibility;
	joinMode: JoinMode;
	invited: PlayerView[];
	guests: GuestDraft[];
	/** Valorizzato quando si sta creando una partita dentro una cerchia. */
	circleName?: string;
	circleMembers?: PlayerView[];
	onVisibilityChange: (visibility: BookVisibility) => void;
	onJoinModeChange: (mode: JoinMode) => void;
	onInvite: (player: PlayerView) => void;
	onRemoveInvited: (playerId: Id<"players">) => void;
	onAddGuest: (guest: GuestDraft) => void;
	onRemoveGuest: (index: number) => void;
}) {
	const seats: SquadSeat[] = [
		{
			key: "me",
			name: player?.name ?? "Tu",
			avatarUrl: player?.avatarUrl,
			detail: "Organizzi tu",
		},
		...invited.map((invitee) => ({
			key: invitee.id,
			name: invitee.name,
			avatarUrl: invitee.avatarUrl,
			detail: "Riceverà l'invito",
			onRemove: () => onRemoveInvited(invitee.id),
		})),
		...guests.map((guest, index) => ({
			key: `guest-${index}-${guest.name}`,
			name: guest.name,
			detail: guest.email ? "Senza app · invito via mail" : "Senza app",
			onRemove: () => onRemoveGuest(index),
		})),
	];

	const excludeIds = [
		...(player ? [player.id] : []),
		...invited.map((invitee) => invitee.id),
	];

	return (
		<View style={{ gap: 22 }}>
			{circleName ? (
				<View style={{ gap: 12 }}>
					<SectionLabel>Partita della cerchia</SectionLabel>
					<ChoiceCard
						icon="person.3.fill"
						title={circleName}
						description={`${Math.max(0, (circleMembers?.length ?? 1) - 1)} membri riceveranno l'invito. I posti liberi restano loro finché non arrivate a ${MAX_PLAYERS}.`}
						selected
						onPress={() => {}}
					/>
				</View>
			) : (
				<View style={{ gap: 12 }}>
					<SectionLabel>Chi può vedere la partita</SectionLabel>

					<ChoiceCard
						icon="person.2.fill"
						title="Aperta a tutti"
						description="Compare fra le partite aperte: chi cerca compagni del tuo livello può unirsi ai posti rimasti."
						selected={visibility === "public"}
						onPress={() => onVisibilityChange("public")}
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
						title="Privata"
						description="La vedono solo le persone che inviti tu. Se poi manca qualcuno potrai aprirla a tutti."
						selected={visibility === "private"}
						onPress={() => onVisibilityChange("private")}
					/>
				</View>
			)}

			<SquadPicker
				seats={seats}
				freeSeats={Math.max(0, MAX_PLAYERS - seats.length)}
				excludeIds={excludeIds}
				onAddPlayer={onInvite}
				onAddGuest={onAddGuest}
			/>

			{seats.length === 1 && (
				<Hint icon="person.2.fill">
					Puoi anche non indicare nessuno: per la struttura vale come «vengo con
					altri tre».
				</Hint>
			)}
		</View>
	);
}
