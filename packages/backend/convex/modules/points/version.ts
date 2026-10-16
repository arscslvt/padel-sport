/**
 * La data del regolamento del programma punti in vigore.
 *
 * Sta in un file senza dipendenze perché la legge anche il sito, per la testata
 * di `/regolamento-punti`: importarla da `terms.ts` porterebbe nel sito il
 * codice delle mutation. Va cambiata solo insieme al testo del regolamento
 * (modules/points/terms.ts spiega cosa succede a chi aveva già aderito).
 */
export const POINTS_TERMS_VERSION = "2026-10-02";

/**
 * L'ultima modifica al testo che non chiede una nuova adesione.
 *
 * Il regolamento promette di pubblicare ogni nuova versione con la sua data,
 * ma una modifica tutta a favore del socio — più preavviso, più tempo per
 * riscattare — non deve fermare i punti di chi aveva già aderito. Per quelle
 * si sposta solo questa data, che la pagina mostra accanto alla versione.
 */
export const POINTS_TERMS_UPDATED = "2026-10-16";
