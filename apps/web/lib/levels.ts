/**
 * Livelli di gioco: le tre fasce che il sito chiede a chi prenota e che il
 * club usa per cercare i giocatori mancanti.
 *
 * Il backend memorizza un numero sulla scala padel 1.0 – 5.0
 * (packages/backend/convex/tables/players.ts), quindi ogni fascia porta con sé
 * il valore rappresentativo da salvare sul profilo e l'intervallo che accetta.
 * Copia di apps/mobile/lib/levels.ts (senza il questionario): se cambiano lì
 * vanno allineate anche qui.
 */

export interface LevelRange {
  /** Livello salvato sul profilo di chi sceglie questa fascia. */
  level: number;
  min: number;
  max: number;
  label: string;
  /** Descrizione breve, per chi non conosce la scala. */
  hint: string;
}

export const LEVEL_RANGES: LevelRange[] = [
  {
    level: 1.5,
    min: 1,
    max: 1.5,
    label: "Principiante",
    hint: "Prime partite, si impara giocando.",
  },
  {
    level: 2.5,
    min: 2,
    max: 2.5,
    label: "Intermedio",
    hint: "Scambi continui e colpi base sicuri.",
  },
  {
    level: 4,
    min: 3,
    max: 5,
    label: "Avanzato",
    hint: "Tattica di coppia, pareti e ritmo alto.",
  },
];

/** Fascia che contiene il livello indicato; senza livello proponiamo la media. */
export function findLevelRangeIndex(level?: number | null): number {
  if (level === undefined || level === null) return 1;

  const index = LEVEL_RANGES.findIndex(
    (range) => level >= range.min && level <= range.max,
  );
  if (index >= 0) return index;

  // Livelli fuori scala o a cavallo tra due fasce: prendiamo l'estremo vicino
  return level < LEVEL_RANGES[0].min ? 0 : LEVEL_RANGES.length - 1;
}

/** "2.0 – 2.5", oppure "3.0+" per la fascia che arriva a fine scala. */
export function formatLevelRange(min: number, max: number): string {
  const format = (value: number) => value.toFixed(1);
  return max >= 5 ? `${format(min)}+` : `${format(min)} – ${format(max)}`;
}
