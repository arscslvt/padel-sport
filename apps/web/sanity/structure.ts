import { CalendarIcon } from "@sanity/icons/Calendar";
import { EnvelopeIcon } from "@sanity/icons/Envelope";
import type { StructureResolver } from "sanity/structure";

/**
 * Due elenchi: gli articoli pubblicati sul sito e le comunicazioni che si
 * mandano agli iscritti. Restano separati perché sono due mestieri diversi —
 * uno si legge sul web, l'altro arriva in una casella di posta — anche se una
 * comunicazione punta sempre a un evento.
 */
export const structure: StructureResolver = (S) =>
  S.list()
    .title("Contenuti")
    .items([
      S.documentTypeListItem("event").title("Eventi").icon(CalendarIcon),
      S.documentTypeListItem("eventCommunication")
        .title("Comunicazioni")
        .icon(EnvelopeIcon),
    ]);
