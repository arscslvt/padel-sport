"use client";

import { useAuth, useUser } from "@clerk/nextjs";
import { useEffect, useSyncExternalStore } from "react";

import { firstNameOf } from "./first-name";

/**
 * Il nome di chi è entrato nella dashboard, tenuto anche nel browser.
 *
 * Clerk il nome lo dà solo quando il suo script ha finito di caricare, a volte
 * un secondo dopo la pagina: il saluto dell'agenda (agenda/greeting.tsx) lo
 * vuole subito. Qui se ne tiene una copia in `localStorage`, con l'id
 * dell'utente: se sullo stesso browser entra qualcun altro, la copia non è
 * la sua e non si usa.
 *
 * La copia segue Clerk (`StaffNameSync`, nel layout principale): si aggiorna
 * quando cambia l'utente o il nome, e sparisce all'uscita, da qualunque
 * pulsante parta.
 */

const STORAGE_KEY = "dashboard-staff-name";

interface CachedName {
  userId: string;
  firstName: string;
}

const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  // Un'altra scheda che esce o cambia utente.
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

/** La stringa grezza: un valore semplice, stabile fra un render e l'altro. */
function snapshot(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function parse(raw: string | null): CachedName | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<CachedName>;
    return typeof value.userId === "string" &&
      typeof value.firstName === "string"
      ? { userId: value.userId, firstName: value.firstName }
      : null;
  } catch {
    return null;
  }
}

function save(value: CachedName) {
  try {
    const raw = JSON.stringify(value);
    if (window.localStorage.getItem(STORAGE_KEY) === raw) return;
    window.localStorage.setItem(STORAGE_KEY, raw);
  } catch {
    // Senza memoria del browser il nome arriva da Clerk, solo un po' dopo.
  }
  emit();
}

function clear() {
  try {
    if (window.localStorage.getItem(STORAGE_KEY) === null) return;
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Niente da togliere.
  }
  emit();
}

/** Chi ha aperto la pagina, letto dal server con la sessione (agenda/page.tsx). */
export interface Viewer {
  id: string;
  firstName: string | null;
}

/**
 * Il nome di chi usa la dashboard. Nell'ordine: quello che il server ha
 * scritto nella pagina, quello di Clerk nel browser, la copia nel browser se
 * è di questo utente.
 */
export function useStaffFirstName(viewer?: Viewer | null): string | null {
  const raw = useSyncExternalStore(subscribe, snapshot, () => null);
  const { userId } = useAuth();
  const { user } = useUser();

  if (viewer?.firstName) return viewer.firstName;

  const live = user ? firstNameOf(user) : null;
  if (live) return live;

  const cached = parse(raw);
  // Finché non si sa chi è entrato, la copia vale; quando lo si sa, deve
  // essere sua.
  const knownId = viewer?.id ?? userId;
  if (!cached || (knownId && cached.userId !== knownId)) return null;
  return cached.firstName;
}

/**
 * A ogni apertura, la copia nel browser si allinea a chi il server ha
 * riconosciuto: se manca, o è di un altro utente, o il nome è cambiato, si
 * riscrive. Così la prossima volta il nome c'è subito, anche prima che la
 * pagina arrivi dal server.
 */
export function useRememberViewer(viewer?: Viewer | null) {
  const id = viewer?.id;
  const firstName = viewer?.firstName;
  useEffect(() => {
    if (id && firstName) save({ userId: id, firstName });
  }, [id, firstName]);
}

/**
 * Tiene la copia allineata a Clerk anche fuori dall'agenda: un nome cambiato
 * dal profilo si aggiorna, e all'uscita la copia sparisce, da qualunque
 * pulsante parta. Non disegna nulla.
 */
export function StaffNameSync() {
  const { isLoaded, isSignedIn } = useAuth();
  const { user } = useUser();
  const userId = user?.id;
  const firstName = user ? firstNameOf(user) : null;

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      clear();
      return;
    }
    // Un nome che manca non cancella la copia: meglio un nome vecchio che
    // un saluto senza nome. Lo riallinea la prossima apertura dell'agenda.
    if (userId && firstName) save({ userId, firstName });
  }, [isLoaded, isSignedIn, userId, firstName]);

  return null;
}
