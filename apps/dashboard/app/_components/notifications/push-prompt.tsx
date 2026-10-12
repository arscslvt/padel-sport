"use client";

import {
  NOTIFICATION_CATEGORIES,
  type NotificationCategory,
} from "@padel-sport/backend/convex/utils/notificationCategories";
import { ChevronDown, Loader2, Share } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";

import { ListGroup, ListRow } from "@/app/_components/list";
import { SheetHeader } from "@/app/_components/sheet-header";
import { Button } from "@/components/ui/button";
import {
  ResponsiveDrawer,
  ResponsiveDrawerContent,
  ResponsiveDrawerFooter,
} from "@/components/ui/responsive-drawer";
import type { PushSupport } from "@/lib/push";
import { cn } from "@/lib/utils";

import { CategoryToggles } from "./category-toggles";

/**
 * La richiesta di attivare le notifiche: modale da computer, drawer da
 * telefono.
 *
 * Viene prima del permesso del browser, e non è un doppione: il permesso
 * negato non si può più chiedere, quindi lo si chiede solo a chi ha già detto
 * sì qui, dopo aver visto cosa riceverà. Dentro c'è già la scelta dei tipi di
 * avviso, chiusa sotto «Cosa ricevere»: chi vuole tutto non deve fare niente.
 *
 * Su iPhone, nella scheda di Safari, le notifiche non esistono: al loro posto
 * le istruzioni per aggiungere il gestionale alla schermata Home.
 *
 * I dati arrivano dal provider (push.provider.tsx) come proprietà: è lui a
 * disegnarla, e a decidere quando.
 */
export function PushPrompt({
  open,
  support,
  muted,
  working,
  onEnable,
  onClose,
}: {
  open: boolean;
  support: PushSupport | null;
  muted: readonly NotificationCategory[];
  working: boolean;
  onEnable: (muted: NotificationCategory[]) => Promise<boolean>;
  /** `accepted`: ha attivato. Altrimenti la richiesta si rimanda. */
  onClose: (accepted: boolean) => void;
}) {
  return (
    <ResponsiveDrawer
      open={open}
      setOpen={(next) => {
        if (!next) onClose(false);
      }}
    >
      <ResponsiveDrawerContent className="sm:max-w-md md:max-h-[90dvh] md:overflow-y-auto">
        {open &&
          (support === "needs-install" ? (
            <InstallSteps onDone={() => onClose(false)} />
          ) : (
            <Ask
              muted={muted}
              working={working}
              onEnable={onEnable}
              onClose={onClose}
            />
          ))}
      </ResponsiveDrawerContent>
    </ResponsiveDrawer>
  );
}

function Ask({
  muted,
  working,
  onEnable,
  onClose,
}: {
  muted: readonly NotificationCategory[];
  working: boolean;
  onEnable: (muted: NotificationCategory[]) => Promise<boolean>;
  onClose: (accepted: boolean) => void;
}) {
  const [customizing, setCustomizing] = useState(false);
  const [draft, setDraft] = useState<NotificationCategory[]>([...muted]);

  // Le preferenze salvate arrivano dal server: se arrivano dopo l'apertura,
  // la bozza le segue finché non la si è toccata.
  const [touched, setTouched] = useState(false);
  useEffect(() => {
    if (!touched) setDraft([...muted]);
  }, [muted, touched]);

  const total = NOTIFICATION_CATEGORIES.length;
  const active = total - draft.length;

  const accept = async () => {
    const enabled = await onEnable(draft);
    // Negato dal browser: inutile restare qui, non lo si può richiedere. Un
    // errore di rete invece lascia la richiesta aperta per riprovare.
    if (enabled || Notification.permission === "denied") onClose(enabled);
  };

  return (
    <>
      <SheetHeader
        title="Vuoi ricevere le notifiche?"
        description="Ti avvisiamo appena arriva una prenotazione o c'è qualcosa da sistemare, anche con il gestionale chiuso."
      />

      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 pt-1 pb-2 md:-mx-1 md:px-1">
        <Preview />

        <ListGroup>
          <ListRow
            title="Cosa ricevere"
            onClick={() => setCustomizing((value) => !value)}
            trailing={
              <span className="text-muted-foreground flex items-center gap-1 text-[15px]">
                {active === total ? "Tutto" : `${active} di ${total}`}
                <ChevronDown
                  className={cn(
                    "size-4 transition-transform duration-200",
                    customizing && "rotate-180",
                  )}
                />
              </span>
            }
          />
        </ListGroup>

        {customizing && (
          <CategoryToggles
            muted={draft}
            onChange={(next) => {
              setTouched(true);
              setDraft(next);
            }}
            footer={
              active === 0
                ? "Accendine almeno uno, o non arriverà niente."
                : undefined
            }
          />
        )}

        <p className="text-muted-foreground px-1 text-xs leading-relaxed">
          Il browser ti chiederà il permesso. Puoi cambiare idea quando vuoi da
          Configurazione.
        </p>
      </div>

      <ResponsiveDrawerFooter className="grid grid-cols-2 gap-2 pb-[calc(1rem+env(safe-area-inset-bottom))] md:pb-0">
        <Button
          variant="outline"
          className="h-12 rounded-xl"
          disabled={working}
          onClick={() => onClose(false)}
        >
          Non ora
        </Button>
        <Button
          className="h-12 rounded-xl"
          disabled={working || active === 0}
          onClick={accept}
        >
          {working && <Loader2 className="size-4 animate-spin" />}
          Attiva
        </Button>
      </ResponsiveDrawerFooter>
    </>
  );
}

/** Una notifica come arriverà: dice più di qualunque spiegazione. */
function Preview() {
  return (
    <div
      aria-hidden
      className="bg-card flex items-start gap-3 rounded-2xl border p-3 shadow-[0_1px_2px_rgb(0_0_0/0.04)]"
    >
      <Image
        src="/icons/icon-192.png"
        alt=""
        width={36}
        height={36}
        className="size-9 shrink-0 rounded-lg border"
      />
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline justify-between gap-2">
          <span className="truncate text-[13px] font-semibold">
            Nuova prenotazione dal sito
          </span>
          <span className="text-muted-foreground shrink-0 text-xs">ora</span>
        </span>
        <span className="text-muted-foreground mt-0.5 block text-[13px] leading-snug">
          Marco ha prenotato per sabato alle 18:30 (partita aperta).
        </span>
      </span>
    </div>
  );
}

function InstallSteps({ onDone }: { onDone: () => void }) {
  const [device, setDevice] = useState("iPhone");
  useEffect(() => {
    const ua = navigator.userAgent;
    if (
      /iPad/.test(ua) ||
      (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)
    ) {
      setDevice("iPad");
    }
  }, []);

  return (
    <>
      <SheetHeader
        title={`Notifiche su ${device}`}
        description={`Su ${device} arrivano solo al gestionale aggiunto alla schermata Home. Si fa una volta sola.`}
      />

      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 pt-1 pb-2 md:-mx-1 md:px-1">
        <ListGroup>
          <ListRow
            leading={<Step n={1} />}
            title={
              <span className="inline-flex items-center gap-1">
                Tocca <Share className="size-4" aria-label="Condividi" />{" "}
                Condividi
              </span>
            }
            subtitle="Nella barra di Safari."
          />
          <ListRow
            leading={<Step n={2} />}
            title="Scegli «Aggiungi alla schermata Home»"
            subtitle="Se non la vedi, scorri il menu."
          />
          <ListRow
            leading={<Step n={3} />}
            title="Apri il Gestionale dall'icona"
            subtitle="Accedi di nuovo: lì ti chiederemo le notifiche."
          />
        </ListGroup>
      </div>

      <ResponsiveDrawerFooter className="pb-[calc(1rem+env(safe-area-inset-bottom))] md:pb-0">
        <Button className="h-12 w-full rounded-xl" onClick={onDone}>
          Ho capito
        </Button>
      </ResponsiveDrawerFooter>
    </>
  );
}

function Step({ n }: { n: number }) {
  return (
    <span className="bg-muted text-foreground flex size-7 items-center justify-center rounded-full text-[13px] font-semibold tabular-nums">
      {n}
    </span>
  );
}
