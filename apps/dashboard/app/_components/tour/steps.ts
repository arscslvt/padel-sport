import {
  CircleHelp,
  Coins,
  Gift,
  LifeBuoy,
  type LucideIcon,
  MoreHorizontal,
  Plus,
  Search,
  Settings,
  Ticket,
  UserPlus,
  Users,
} from "lucide-react";

/**
 * Gli step del tour della dashboard.
 *
 * Chi lo legge è spesso alla prima volta con un'app di questo tipo: frasi
 * corte, una cosa per step, i nomi esatti che si vedono sullo schermo. Il
 * testo cambia fra telefono e computer dove cambia il gesto (toccare,
 * cliccare) o il posto delle cose (la barra in basso, quella a sinistra).
 *
 * Le azioni dentro il testo sono scritte `{nome}` e diventano un'etichetta
 * con l'icona del pulsante vero (TOUR_CHIPS): l'occhio le trova prima di
 * leggere la frase, e sullo schermo si riconoscono dalla stessa icona.
 *
 * `target` è il nome scritto in `data-tour` sugli elementi da indicare:
 * da telefono e da computer possono essere elementi diversi con lo stesso
 * nome, conta quello visibile. `route` è la pagina su cui lo step si mostra;
 * senza, resta quella dello step prima.
 */

/** Cambiandolo, il tour ricompare a chi l'aveva già visto. */
export const TOUR_VERSION = 1;

type Copy = string | { mobile: string; desktop: string };

export interface TourStep {
  id: string;
  /** La sezione di cui si parla, sopra il titolo. */
  eyebrow: string;
  title: Copy;
  /** Il testo; `{nome}` inserisce l'etichetta TOUR_CHIPS[nome]. */
  body: Copy;
  route?: string;
  target?: string;
  /** Gli elementi tondi (il pulsante fluttuante) hanno un riquadro tondo. */
  shape?: "pill";
}

/**
 * Le etichette che si possono mettere nel testo.
 *
 * `action` è un pulsante: l'icona nel tondo, come nella dashboard, e il nome.
 * `count` e `dot` copiano i segnali che si vedono sullo schermo — il numero
 * rosso, il puntino arancione — perché si riconoscano senza descriverli.
 * `button` è il pulsante «Avanti» del tour stesso.
 */
export type TourChip =
  | { kind: "action"; icon: LucideIcon; label: string }
  | { kind: "count"; label: string }
  | { kind: "dot" }
  | { kind: "button"; label: string };

export const TOUR_CHIPS = {
  next: { kind: "button", label: "Avanti" },
  count: { kind: "count", label: "2" },
  dot: { kind: "dot" },
  search: { kind: "action", icon: Search, label: "Cerca" },
  newBooking: { kind: "action", icon: Plus, label: "Nuova prenotazione" },
  support: { kind: "action", icon: LifeBuoy, label: "Assistenza" },
  players: { kind: "action", icon: Users, label: "Giocatori" },
  newClient: { kind: "action", icon: UserPlus, label: "Crea cliente" },
  assign: { kind: "action", icon: Coins, label: "Assegna punti" },
  deliver: { kind: "action", icon: Gift, label: "Da consegnare" },
  more: { kind: "action", icon: MoreHorizontal, label: "Altro" },
  events: { kind: "action", icon: Ticket, label: "Eventi" },
  settings: { kind: "action", icon: Settings, label: "Configurazione" },
  guide: { kind: "action", icon: CircleHelp, label: "Guida" },
} satisfies Record<string, TourChip>;

export const TOUR_STEPS: readonly TourStep[] = [
  {
    id: "welcome",
    eyebrow: "Guida",
    title: "La dashboard del club, in un minuto",
    body: {
      mobile:
        "Ti mostriamo dove si trova tutto. Per andare avanti tocca lo schermo, oppure {next}.",
      desktop:
        "Ti mostriamo dove si trova tutto. Per andare avanti clicca in un punto qualsiasi, premi {next} o usa le frecce della tastiera.",
    },
    route: "/",
  },
  {
    id: "nav",
    eyebrow: "Sezioni",
    title: "Da qui cambi pagina",
    body: {
      mobile:
        "Tocca una voce per aprire quella sezione. Il numero rosso {count} dice quante cose aspettano una tua risposta.",
      desktop:
        "Clicca una voce per aprire quella sezione. Il numero rosso {count} dice quante cose aspettano una tua risposta.",
    },
    route: "/",
    target: "nav",
  },
  {
    id: "agenda-days",
    eyebrow: "Agenda",
    title: "Chi gioca, giorno per giorno",
    body: {
      mobile:
        "Tocca un giorno per vedere le partite in ordine di orario. Il puntino arancione {dot} segna una prenotazione da confermare.",
      desktop:
        "Clicca un giorno per vedere le partite in ordine di orario. Il puntino arancione {dot} segna una prenotazione da confermare.",
    },
    route: "/",
    target: "agenda-days",
  },
  {
    id: "agenda-actions",
    eyebrow: "Agenda",
    title: "Cercare e aggiungere",
    body: "{search} trova una prenotazione per nome o telefono. {newBooking} ne inserisce una, per esempio per chi chiama.",
    route: "/",
    target: "agenda-actions",
  },
  {
    id: "requests",
    eyebrow: "Richieste",
    title: "Le richieste dal sito",
    body: "{support} per chi ha bisogno di aiuto, {players} per chi cerca compagni. Apri una richiesta per vedere i contatti.",
    route: "/requests",
    target: "requests-summary",
  },
  {
    id: "clients",
    eyebrow: "Clienti",
    title: "Tutte le persone del club",
    body: "{search} per nome o telefono, poi apri la scheda: dati, tessera e punti. {newClient} aggiunge una persona nuova.",
    route: "/clients",
    target: "clients-search",
  },
  {
    id: "points",
    eyebrow: "Punti e premi",
    title: "I punti a chi gioca",
    body: "Dopo una partita usa {assign} e scegli il cliente. I premi chiesti dai clienti sono in {deliver}.",
    route: "/points",
    target: "assign-points",
    shape: "pill",
  },
  {
    id: "more",
    eyebrow: "Il resto",
    title: {
      mobile: "Tutto il resto",
      desktop: "Eventi e club",
    },
    body: {
      mobile:
        "In {more} ci sono eventi, impostazioni del club e il tuo profilo. Da lì puoi anche rivedere questa guida.",
      desktop:
        "Qui sotto trovi gli {events} — iscrizioni, arrivi, comunicazioni — e la {settings} del club.",
    },
    target: "more",
  },
  {
    id: "done",
    eyebrow: "Fatto",
    title: "Ora tocca a te",
    body: {
      mobile:
        "Se hai un dubbio, apri {more} e poi {guide}: questo giro ricomincia da capo. Buon lavoro!",
      desktop:
        "Se hai un dubbio, {guide} è nella barra a sinistra, sopra il tuo nome: questo giro ricomincia da capo. Buon lavoro!",
    },
    route: "/",
  },
];

export function copy(text: Copy, mobile: boolean): string {
  if (typeof text === "string") return text;
  return mobile ? text.mobile : text.desktop;
}
