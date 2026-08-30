import { CalendarIcon } from "@sanity/icons/Calendar";
import { EnvelopeIcon } from "@sanity/icons/Envelope";
import { ImagesIcon } from "@sanity/icons/Images";
import type { StructureResolver } from "sanity/structure";

/**
 * Tre elenchi: gli articoli pubblicati sul sito, le comunicazioni che si mandano
 * agli iscritti, e le fotografie che l'IA usa per le locandine social. Restano
 * separati perché sono mestieri diversi — uno si legge sul web, uno arriva in
 * una casella di posta, e il terzo non si legge affatto: si guarda.
 */
export const structure: StructureResolver = (S) =>
  S.list()
    .title("Contenuti")
    .items([
      S.documentTypeListItem("event").title("Eventi").icon(CalendarIcon),
      S.documentTypeListItem("eventCommunication")
        .title("Comunicazioni")
        .icon(EnvelopeIcon),
      S.documentTypeListItem("socialAsset")
        .title("Foto per i social")
        .icon(ImagesIcon),
    ]);
