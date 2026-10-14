"use client";

import { TriangleAlert } from "lucide-react";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";
import { SheetHeader } from "@/app/_components/sheet-header";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  ResponsiveDrawer,
  ResponsiveDrawerContent,
  ResponsiveDrawerFooter,
} from "@/components/ui/responsive-drawer";

/**
 * Le conferme della dashboard: un pannello dal basso da telefono, una modale
 * da desktop.
 *
 * Prendono il posto dei toast con i pulsanti dentro, che sparivano da soli,
 * finivano sotto il pollice insieme ad altri toast e non tenevano il focus.
 * Si usano con `await`: `const result = await confirm({...})` dà `null` se si
 * è annullato, altrimenti la scelta della casella facoltativa.
 *
 * Solo per le azioni che non si riprendono: annullare una prenotazione,
 * sospendere un account. Confermare tutto abitua a premere senza leggere.
 *
 * Da desktop una conferma può essere anche un toast (`desktop: "toast"`), per
 * le azioni su un oggetto della pagina come ritirare un premio: la modale
 * oscura tutto per una domanda da un rigo. Non è il toast di prima: resta
 * finché non si sceglie, prende il focus sul tasto che non fa danni, Esc
 * annulla e il focus torna da dove era partito. Da telefono resta il
 * pannello dal basso, sempre: lì il toast tornerebbe sotto il pollice.
 */

interface ConfirmOptions {
  title: string;
  description?: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  tone?: "default" | "destructive";
  /** Una scelta in più, per esempio «Avvisa il cliente su WhatsApp». */
  checkbox?: { label: string; defaultChecked?: boolean };
  /**
   * Come chiede da desktop: modale (di base) o toast. Con una casella resta
   * la modale, che ha lo spazio per mostrarla.
   */
  desktop?: "dialog" | "toast";
}

interface ConfirmResult {
  checked: boolean;
}

type Confirm = (options: ConfirmOptions) => Promise<ConfirmResult | null>;

const ConfirmContext = createContext<Confirm | null>(null);

export function useConfirm(): Confirm {
  const confirm = useContext(ConfirmContext);
  if (!confirm) {
    throw new Error("useConfirm va usato dentro ConfirmProvider.");
  }
  return confirm;
}

/**
 * «Uscire senza salvare?», per i pannelli con dati inseriti e non salvati
 * (`dirty` in ResponsiveDrawer e NestedDrawer). `leave` parte solo se si
 * conferma; altrimenti si resta dove si era, con i dati intatti.
 */
export function useConfirmLeave(): (leave: () => void) => Promise<void> {
  const confirm = useConfirm();

  return useCallback(
    async (leave: () => void) => {
      const result = await confirm({
        title: "Uscire senza salvare?",
        description: "I dati inseriti andranno persi.",
        confirmLabel: "Esci senza salvare",
        cancelLabel: "Continua a modificare",
        tone: "destructive",
      });
      if (result) leave();
    },
    [confirm],
  );
}

export default function ConfirmProvider({ children }: { children: ReactNode }) {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const [open, setOpen] = useState(false);
  const [checked, setChecked] = useState(false);
  const resolver = useRef<((result: ConfirmResult | null) => void) | null>(
    null,
  );

  const confirm = useCallback<Confirm>((next) => {
    // Una conferma ancora aperta vale come annullata: ne resta una sola.
    resolver.current?.(null);

    if (
      next.desktop === "toast" &&
      !next.checkbox &&
      window.matchMedia("(min-width: 768px)").matches
    ) {
      return askInToast(next, resolver);
    }

    setOptions(next);
    setChecked(next.checkbox?.defaultChecked ?? false);
    setOpen(true);
    return new Promise((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const settle = (result: ConfirmResult | null) => {
    resolver.current?.(result);
    resolver.current = null;
    setOpen(false);
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <ResponsiveDrawer
        open={open}
        setOpen={(next) => {
          if (!next) settle(null);
        }}
      >
        <ResponsiveDrawerContent className="sm:max-w-md">
          {options && (
            <>
              <SheetHeader
                title={options.title}
                description={
                  typeof options.description === "string"
                    ? options.description
                    : undefined
                }
              />
              <div className="space-y-4 px-4 md:px-0">
                {options.description &&
                  typeof options.description !== "string" && (
                    <div className="text-muted-foreground text-sm leading-relaxed">
                      {options.description}
                    </div>
                  )}
                {options.checkbox && (
                  <div className="flex min-h-11 items-center gap-3 rounded-xl border px-3">
                    <Checkbox
                      id="confirm-checkbox"
                      checked={checked}
                      onCheckedChange={(value) => setChecked(Boolean(value))}
                    />
                    <Label htmlFor="confirm-checkbox" className="flex-1 py-3">
                      {options.checkbox.label}
                    </Label>
                  </div>
                )}
              </div>
              <ResponsiveDrawerFooter className="flex flex-col-reverse gap-2 pb-[calc(1rem+env(safe-area-inset-bottom))] md:flex-row md:justify-end md:pb-0">
                <Button
                  variant="ghost"
                  className="h-11 md:h-9"
                  onClick={() => settle(null)}
                >
                  {options.cancelLabel ?? "Annulla"}
                </Button>
                <Button
                  variant={
                    options.tone === "destructive" ? "destructive" : "default"
                  }
                  className="h-11 md:h-9"
                  onClick={() => settle({ checked })}
                >
                  {options.confirmLabel}
                </Button>
              </ResponsiveDrawerFooter>
            </>
          )}
        </ResponsiveDrawerContent>
      </ResponsiveDrawer>
    </ConfirmContext.Provider>
  );
}

let toastCount = 0;

/**
 * La conferma come toast, da desktop. Si chiude in un modo solo, qualunque
 * strada prenda (i tasti, Esc, lo scorrimento del toast, una conferma nuova
 * che la sostituisce): `finish` risponde una volta e poi non fa più niente.
 */
function askInToast(
  options: ConfirmOptions,
  resolver: { current: ((result: ConfirmResult | null) => void) | null },
): Promise<ConfirmResult | null> {
  const id = `confirm-${++toastCount}`;
  const previous =
    document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;

  return new Promise((resolve) => {
    let done = false;
    const finish = (result: ConfirmResult | null) => {
      if (done) return;
      done = true;
      if (resolver.current === finish) resolver.current = null;
      toast.dismiss(id);
      if (previous?.isConnected) previous.focus();
      resolve(result);
    };

    resolver.current = finish;
    toast.custom(
      () => (
        <ConfirmToast
          options={options}
          onCancel={() => finish(null)}
          onConfirm={() => finish({ checked: false })}
        />
      ),
      { id, duration: Number.POSITIVE_INFINITY, onDismiss: () => finish(null) },
    );
  });
}

function ConfirmToast({
  options,
  onCancel,
  onConfirm,
}: {
  options: ConfirmOptions;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const titleId = useId();
  const descriptionId = useId();
  const cancelRef = useRef<HTMLButtonElement>(null);
  const destructive = options.tone === "destructive";

  // Il focus va sul tasto che non fa danni: un Invio di troppo annulla.
  useEffect(() => {
    cancelRef.current?.focus();
  }, []);

  return (
    <div
      role="alertdialog"
      aria-labelledby={titleId}
      aria-describedby={options.description ? descriptionId : undefined}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.stopPropagation();
          onCancel();
        }
      }}
      className="bg-popover text-popover-foreground w-full rounded-2xl border p-4 shadow-[0_16px_40px_-16px_oklch(0.2_0_0/0.35)]"
    >
      <div className="flex gap-3">
        {destructive && (
          <span className="bg-danger-subtle text-danger flex size-9 shrink-0 items-center justify-center rounded-full">
            <TriangleAlert className="size-4" />
          </span>
        )}
        <div className="min-w-0 flex-1 pt-0.5">
          <p id={titleId} className="text-sm leading-snug font-semibold">
            {options.title}
          </p>
          {options.description && (
            <div
              id={descriptionId}
              className="text-muted-foreground mt-1 text-[13px] leading-relaxed"
            >
              {options.description}
            </div>
          )}
        </div>
      </div>
      <div className="mt-3.5 flex justify-end gap-2">
        <Button ref={cancelRef} variant="ghost" size="sm" onClick={onCancel}>
          {options.cancelLabel ?? "Annulla"}
        </Button>
        <Button
          variant={destructive ? "destructive" : "default"}
          size="sm"
          onClick={onConfirm}
        >
          {options.confirmLabel}
        </Button>
      </div>
    </div>
  );
}
