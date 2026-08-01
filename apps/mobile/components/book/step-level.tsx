import { View } from "react-native";
import { ChoiceCard, Hint } from "@/components/ui/choice";
import { formatLevel, formatLevelRange } from "@/lib/format";
import { findLevelRangeIndex, LEVEL_RANGES } from "@/lib/levels";

/**
 * Primo passo: la fascia di livello dei giocatori cercati.
 * Se il profilo ha un livello la fascia arriva già selezionata e all'utente
 * resta solo da confermarla.
 */
export default function StepLevel({
	selectedIndex,
	onSelect,
	playerLevel,
	suggested,
}: {
	selectedIndex: number;
	onSelect: (index: number) => void;
	/** Livello del profilo, se disponibile. */
	playerLevel?: number;
	/** True finché la fascia è quella proposta e non una scelta esplicita. */
	suggested: boolean;
}) {
	// La fascia del giocatore resta marcata anche dopo che ne ha scelta un'altra,
	// così sa sempre come tornare alla propria.
	const ownIndex =
		playerLevel === undefined ? null : findLevelRangeIndex(playerLevel);

	return (
		<View style={{ gap: 12 }}>
			{suggested && playerLevel !== undefined && (
				<Hint icon="figure.tennis">
					Il tuo livello è {formatLevel(playerLevel)}: abbiamo pre-selezionato
					la fascia più adatta. Confermala oppure scegline un&apos;altra.
				</Hint>
			)}

			{LEVEL_RANGES.map((range, index) => (
				<ChoiceCard
					key={range.min}
					badge={formatLevelRange(range.min, range.max)}
					title={range.label}
					description={range.hint}
					tag={index === ownIndex ? "Il tuo livello" : undefined}
					selected={index === selectedIndex}
					onPress={() => onSelect(index)}
				/>
			))}
		</View>
	);
}
