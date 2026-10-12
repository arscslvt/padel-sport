"use client";

import { formatDistanceToNow } from "date-fns";
import { it } from "date-fns/locale";
import { Bell, BellOff, Loader2, Send, Smartphone, Trash2 } from "lucide-react";
import { ListGroup, ListRow } from "@/app/_components/list";
import { CategoryToggles } from "@/app/_components/notifications/category-toggles";
import { StatusBadge } from "@/app/_components/status-badge";
import { useConfirm } from "@/app/_providers/confirm.provider";
import { deniedHelp, usePush } from "@/app/_providers/push.provider";
import { Switch } from "@/components/ui/switch";

/**
 * Le notifiche push, in Configurazione.
 *
 * Tre cose distinte, dall'alto in basso: questo dispositivo (acceso o spento,
 * con la prova), cosa ricevere (vale per tutti i propri dispositivi) e chi
 * riceve le notifiche nello staff — per togliere il telefono di chi non c'è
 * più senza dovergli chiedere di farlo lui.
 */
export function NotificationSettings() {
  const push = usePush();
  const confirm = useConfirm();

  return (
    <section id="notifiche" className="scroll-mt-6 space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Notifiche</h2>
        <p className="text-muted-foreground max-w-2xl text-sm">
          Gli avvisi del gestionale sul telefono o sul computer, anche quando è
          chiuso: nuove prenotazioni, disdette, richieste, conferme che non
          arrivano ai clienti.
        </p>
      </div>

      <div className="max-w-xl space-y-6">
        <ThisDevice />

        <CategoryToggles
          title="Cosa ricevere"
          muted={push.muted}
          onChange={push.setMuted}
          disabled={!push.loaded}
          footer="Vale su tutti i dispositivi da cui hai attivato le notifiche."
        />

        {push.devices.length > 0 && (
          <ListGroup
            title="Dispositivi dello staff"
            footer="Chi non fa più parte dello staff va tolto da qui: le notifiche contengono nomi e orari dei clienti."
          >
            {push.devices.map((device) => {
              const mine = device.endpoint === push.endpoint;
              return (
                <ListRow
                  key={device._id}
                  leading={<Smartphone className="size-5" />}
                  title={device.device}
                  subtitle={[
                    device.userName,
                    device.lastError
                      ? "ultimo invio non riuscito"
                      : device.lastSuccessAt
                        ? `ultimo avviso ${formatDistanceToNow(device.lastSuccessAt, { addSuffix: true, locale: it })}`
                        : `attivo ${formatDistanceToNow(device.createdAt, { addSuffix: true, locale: it })}`,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                  trailing={
                    mine ? (
                      <StatusBadge tone="info">Questo</StatusBadge>
                    ) : (
                      <button
                        type="button"
                        aria-label={`Togli ${device.device}`}
                        className="text-muted-foreground hover:text-danger flex size-10 items-center justify-center rounded-full transition-colors"
                        onClick={async () => {
                          const result = await confirm({
                            title: "Togliere il dispositivo?",
                            description: `${device.device}${device.userName ? ` di ${device.userName}` : ""} smette di ricevere le notifiche. Potrà riattivarle da lì.`,
                            confirmLabel: "Togli",
                            cancelLabel: "Indietro",
                            tone: "destructive",
                          });
                          if (result) await push.removeDevice(device);
                        }}
                      >
                        <Trash2 className="size-4" />
                      </button>
                    )
                  }
                />
              );
            })}
          </ListGroup>
        )}
      </div>
    </section>
  );
}

function ThisDevice() {
  const push = usePush();

  if (push.support === null) {
    return (
      <ListGroup title="Questo dispositivo">
        <ListRow title="Controllo il browser…" />
      </ListGroup>
    );
  }

  if (push.support === "needs-install") {
    return (
      <ListGroup
        title="Questo dispositivo"
        footer="Su iPhone e iPad le notifiche arrivano solo al gestionale aggiunto alla schermata Home: Condividi › Aggiungi alla schermata Home, poi aprilo dall'icona."
      >
        <ListRow
          leading={<BellOff className="size-5" />}
          title="Da installare"
          subtitle="Safari non riceve notifiche da una scheda"
          onClick={push.openPrompt}
          chevron
        />
      </ListGroup>
    );
  }

  if (push.support === "unsupported") {
    return (
      <ListGroup title="Questo dispositivo">
        <ListRow
          leading={<BellOff className="size-5" />}
          title="Non disponibili"
          subtitle="Questo browser non riceve notifiche push"
        />
      </ListGroup>
    );
  }

  if (push.permission === "denied") {
    return (
      <ListGroup title="Questo dispositivo" footer={deniedHelp()}>
        <ListRow
          leading={<BellOff className="size-5" />}
          title="Bloccate dal browser"
          subtitle="Il permesso è stato negato"
        />
      </ListGroup>
    );
  }

  const on = Boolean(push.endpoint);

  return (
    <ListGroup
      title="Questo dispositivo"
      footer={
        push.loaded && !push.configured
          ? "Il server non ha ancora la chiave per le notifiche (VAPID): finché manca non si possono attivare."
          : undefined
      }
    >
      <label
        htmlFor="push-this-device"
        className="flex min-h-14 cursor-pointer items-center gap-3 px-4 py-2.5"
      >
        <span className="text-muted-foreground flex shrink-0 items-center justify-center">
          {on ? <Bell className="size-5" /> : <BellOff className="size-5" />}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] leading-snug">
            {on ? "Notifiche attive" : "Notifiche spente"}
          </span>
          <span className="text-muted-foreground mt-0.5 block text-[13px] leading-snug">
            {on
              ? "Arrivano anche con il gestionale chiuso"
              : "Accendile per ricevere gli avvisi qui"}
          </span>
        </span>
        {push.working ? (
          <Loader2 className="text-muted-foreground size-4 animate-spin" />
        ) : (
          <Switch
            id="push-this-device"
            checked={on}
            disabled={!push.configured}
            onCheckedChange={(checked) =>
              checked ? void push.enable() : void push.disable()
            }
          />
        )}
      </label>
      {on && (
        <ListRow
          leading={<Send className="size-5" />}
          title="Invia una notifica di prova"
          onClick={() => void push.sendTest()}
        />
      )}
    </ListGroup>
  );
}
