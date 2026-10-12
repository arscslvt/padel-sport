"use client";

import { Loader2 } from "lucide-react";
import {
  createContext,
  type FormEvent,
  type ReactNode,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { flushSync } from "react-dom";
import { Drawer as DrawerPrimitive } from "vaul";

import { SheetHeader } from "@/app/_components/sheet-header";
import { useConfirmLeave } from "@/app/_providers/confirm.provider";
import { Button } from "@/components/ui/button";
import {
  DrawerClose,
  DrawerContent,
  DrawerFooter,
} from "@/components/ui/drawer";
import { cn } from "@/lib/utils";

/**
 * Un drawer sopra un altro drawer, da telefono: si modifica un pezzo della
 * scheda senza perderla di vista. È l'esempio di Vaul (`Drawer.NestedRoot`
 * dentro il contenuto del drawer padre), con due accortezze.
 *
 * Si apre dal suo `Trigger` e si chiude dai suoi `Close`, non cambiando `open`
 * da fuori: è così che Vaul avvisa la scheda sotto, che si rimpicciolisce
 * all'apertura e torna com'era alla chiusura. Chi deve chiudere da codice —
 * dopo un salvataggio riuscito — usa `useCloseNested`, che passa da un `Close`
 * nascosto per lo stesso motivo.
 *
 * Il contenuto si monta all'apertura e si smonta dopo l'animazione di
 * chiusura: un modulo dentro riparte da capo ogni volta, e non sparisce
 * mentre il drawer scende.
 *
 * Con dati non salvati (`useNestedDirty`) il drawer non si chiude per
 * sbaglio: non si trascina, e toccare fuori, Esc o «Annulla» chiedono prima
 * «Uscire senza salvare?».
 *
 * Esiste solo dentro un drawer di Vaul: da desktop la scheda è una modale, e
 * lì il modulo si apre dentro (`useResponsiveDrawer` dice quale dei due).
 */

interface NestedControls {
  /** Chiude subito: dopo un salvataggio riuscito. */
  close: () => void;
  /** Chiude, chiedendo prima se ci sono dati non salvati: «Annulla». */
  requestClose: () => void;
  setDirty: (dirty: boolean) => void;
}

const NestedContext = createContext<NestedControls>({
  close: () => {},
  requestClose: () => {},
  setDirty: () => {},
});

/** Chiude il drawer annidato da codice, avvisando la scheda sotto. */
export function useCloseNested(): () => void {
  return useContext(NestedContext).close;
}

/** Il modulo nel drawer annidato dice se ha dati inseriti e non salvati. */
export function useNestedDirty(dirty: boolean): void {
  const { setDirty } = useContext(NestedContext);

  useEffect(() => {
    setDirty(dirty);
  }, [dirty, setDirty]);

  useEffect(() => () => setDirty(false), [setDirty]);
}

/** Il tocco sul pulsante si sente subito; chi riduce le animazioni non lo vede. */
export const PRESS =
  "transition-[transform,background-color,opacity] duration-150 ease-out active:scale-[0.97] motion-reduce:transform-none";

export function NestedDrawer({
  open,
  onOpenChange,
  title,
  description,
  trigger,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  /** La riga che lo apre: diventa il `Trigger`. */
  trigger: ReactNode;
  children: ReactNode;
}) {
  const closeButton = useRef<HTMLButtonElement>(null);
  const [dirty, setDirty] = useState(false);
  const confirmLeave = useConfirmLeave();

  // Con dati non salvati Vaul rifiuta di chiudere (`dismissible`): il blocco
  // si toglie subito, prima del `Close` nascosto, non al prossimo render.
  const close = () => {
    flushSync(() => setDirty(false));
    closeButton.current?.click();
  };
  const requestClose = () => {
    if (dirty) void confirmLeave(close);
    else close();
  };
  const guardOutside = (event: Event) => {
    if (!dirty) return;
    event.preventDefault();
    void confirmLeave(close);
  };

  return (
    <DrawerPrimitive.NestedRoot
      open={open}
      onOpenChange={onOpenChange}
      dismissible={!dirty}
    >
      <DrawerPrimitive.Trigger asChild>{trigger}</DrawerPrimitive.Trigger>
      <DrawerContent
        onPointerDownOutside={guardOutside}
        onEscapeKeyDown={guardOutside}
      >
        <SheetHeader title={title} description={description} />
        <NestedContext.Provider value={{ close, requestClose, setDirty }}>
          {children}
        </NestedContext.Provider>
        <DrawerClose
          ref={closeButton}
          className="sr-only"
          tabIndex={-1}
          aria-hidden
        />
      </DrawerContent>
    </DrawerPrimitive.NestedRoot>
  );
}

/**
 * Il modulo dentro il drawer annidato: scorre solo il contenuto, testata e
 * bottoni restano fermi. Da telefono il bottone principale sta sopra, a
 * portata di pollice.
 */
export function NestedDrawerForm({
  onSubmit,
  busy,
  canSubmit,
  submitLabel,
  children,
}: {
  onSubmit: (event: FormEvent) => void;
  busy: boolean;
  canSubmit: boolean;
  submitLabel: string;
  children: ReactNode;
}) {
  const { requestClose } = useContext(NestedContext);

  return (
    <form
      className="flex min-h-0 flex-1 flex-col"
      onSubmit={onSubmit}
      noValidate
    >
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pt-1">{children}</div>

      <DrawerFooter className="flex flex-col-reverse gap-2 pb-[calc(1rem+env(safe-area-inset-bottom))]">
        <Button
          type="button"
          variant="ghost"
          className={cn("h-12 rounded-xl", PRESS)}
          disabled={busy}
          onClick={requestClose}
        >
          Annulla
        </Button>
        <Button
          type="submit"
          className={cn("h-12 rounded-xl", PRESS)}
          disabled={busy || !canSubmit}
        >
          <SubmitLabel busy={busy} label={submitLabel} />
        </Button>
      </DrawerFooter>
    </form>
  );
}

/** «Salva», o la rotellina con «Salvataggio…» mentre il server risponde. */
export function SubmitLabel({ busy, label }: { busy: boolean; label: string }) {
  return busy ? (
    <>
      <Loader2
        aria-hidden
        className="size-4 animate-spin motion-reduce:animate-none"
      />
      Salvataggio…
    </>
  ) : (
    label
  );
}
