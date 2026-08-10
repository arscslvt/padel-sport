import { CalendarIcon } from "@sanity/icons/Calendar";
import type { StructureResolver } from "sanity/structure";

/**
 * Per ora esiste un solo tipo di documento. La struttura è esplicita così che
 * aggiungere altre categorie in futuro sia una riga in più, non una riscrittura.
 */
export const structure: StructureResolver = (S) =>
  S.list()
    .title("Contenuti")
    .items([
      S.documentTypeListItem("event").title("Eventi").icon(CalendarIcon),
    ]);
