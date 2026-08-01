import { useState } from "react";
import { Pressable, View } from "react-native";
import { ThemedText } from "@/components/themed-text";
import {
	ChoiceCard,
	Hint,
	StepProgress,
	selectionFeedback,
} from "@/components/ui/choice";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useTheme } from "@/hooks/use-theme";
import { LEVEL_QUIZ, levelRangeIndexFromScore } from "@/lib/levels";

/**
 * Mini questionario per chi non sa dichiarare il proprio livello: una domanda
 * per volta, la risposta fa avanzare da sola.
 *
 * Le risposte già date restano in memoria, così tornando indietro si vede
 * quella scelta e si può correggere.
 */
export default function LevelQuiz({
	onComplete,
	onCancel,
}: {
	/** Riceve l'indice della fascia suggerita in `LEVEL_RANGES`. */
	onComplete: (rangeIndex: number) => void;
	/** Uscita dal questionario dalla prima domanda. */
	onCancel: () => void;
}) {
	const theme = useTheme();
	const [index, setIndex] = useState(0);
	const [scores, setScores] = useState<(number | null)[]>(
		LEVEL_QUIZ.map(() => null),
	);

	const question = LEVEL_QUIZ[index];
	const isLast = index === LEVEL_QUIZ.length - 1;

	const answer = (score: number) => {
		const next = scores.map((value, position) =>
			position === index ? score : value,
		);
		setScores(next);

		if (!isLast) {
			setIndex(index + 1);
			return;
		}

		const total = next.reduce((sum: number, value) => sum + (value ?? 0), 0);
		onComplete(levelRangeIndexFromScore(total));
	};

	const goBack = () => {
		selectionFeedback();
		if (index === 0) {
			onCancel();
			return;
		}
		setIndex(index - 1);
	};

	return (
		<View style={{ gap: 18 }}>
			<View style={{ gap: 12 }}>
				<StepProgress step={index} total={LEVEL_QUIZ.length} />
				<View
					style={{
						flexDirection: "row",
						alignItems: "center",
						justifyContent: "space-between",
					}}
				>
					<Pressable
						onPress={goBack}
						hitSlop={10}
						accessibilityRole="button"
						accessibilityLabel={
							index === 0 ? "Chiudi il questionario" : "Domanda precedente"
						}
						style={({ pressed }) => ({
							flexDirection: "row",
							alignItems: "center",
							gap: 4,
							opacity: pressed ? 0.6 : 1,
						})}
					>
						<IconSymbol name="chevron.left" size={16} color={theme.textMuted} />
						<ThemedText style={{ fontSize: 14, color: theme.textMuted }}>
							{index === 0 ? "Scelgo da solo" : "Indietro"}
						</ThemedText>
					</Pressable>

					<ThemedText style={{ fontSize: 13, color: theme.textMuted }}>
						Domanda {index + 1} di {LEVEL_QUIZ.length}
					</ThemedText>
				</View>
			</View>

			<ThemedText type="title" style={{ fontSize: 22, lineHeight: 28 }}>
				{question.question}
			</ThemedText>

			{question.hint && <Hint icon="figure.tennis">{question.hint}</Hint>}

			<View style={{ gap: 12 }}>
				{question.answers.map((option) => (
					<ChoiceCard
						key={option.label}
						title={option.label}
						selected={scores[index] === option.score}
						onPress={() => answer(option.score)}
					/>
				))}
			</View>
		</View>
	);
}
