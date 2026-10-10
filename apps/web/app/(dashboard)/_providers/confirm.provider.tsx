"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useRef,
  useState,
} from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  ResponsiveDrawer,
  ResponsiveDrawerContent,
  ResponsiveDrawerFooter,
  ResponsiveDrawerHeader,
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
 */

interface ConfirmOptions {
  title: string;
  description?: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  tone?: "default" | "destructive";
  /** Una scelta in più, per esempio «Avvisa il cliente su WhatsApp». */
  checkbox?: { label: string; defaultChecked?: boolean };
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
              <ResponsiveDrawerHeader
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
