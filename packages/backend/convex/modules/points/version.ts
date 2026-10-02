/**
 * La data del regolamento del programma punti in vigore.
 *
 * Sta in un file senza dipendenze perché la legge anche il sito, per la testata
 * di `/regolamento-punti`: importarla da `terms.ts` porterebbe nel sito il
 * codice delle mutation. Va cambiata solo insieme al testo del regolamento
 * (modules/points/terms.ts spiega cosa succede a chi aveva già aderito).
 */
export const POINTS_TERMS_VERSION = "2026-10-02";
