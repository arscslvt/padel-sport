"use client";

import { useUser } from "@clerk/nextjs";
import { formatDistanceToNow } from "date-fns";
import { it } from "date-fns/locale";
import { Bell, BellOff, Loader2, Send, Smartphone, Trash2 } from "lucide-react";
import { ListGroup, ListRow } from "@/app/_components/list";
import { CategoryToggles } from "@/app/_components/notifications/category-toggles";
import { StatusBadge } from "@/app/_components/status-badge";
import { useConfirm } from "@/app/_providers/confirm.provider";
import { deniedHelp, usePush } from "@/app/_providers/push.provider";
import { Switch } from "@/components/ui/switch";

import {
  SettingsSection,
  SettingsSkeleton,
  SettingsStack,
} from "./settings-section";

/**
 * Le notifiche push, la prima linguetta di Configurazione.
 *
 * Tre cose distinte, dall'alto in basso: questo dispositivo (acceso o spento,
 * con la prova), cosa ricevere (vale per tutti i propri dispositivi) e chi
 * riceve le notifiche nello staff — per togliere il telefono di chi non c'è
 * più senza dovergli chiedere di farlo lui.
 */
export function NotificationSettings({
  canManageDevices,
}: {
  /** Amministratore: vede e toglie anche i dispositivi dei colleghi. */
  canManageDevices: boolean;
}) {
  const push = usePush();
  const confirm = useConfirm();
  const { user } = useUser();
  // Gli altri dello staff vedono solo i propri: il telefono di un collega
  // lo toglie un amministratore (e la route lo rifiuta a chiunque altro).
  const devices = canManageDevices
    ? push.devices
    : push.devices.filter((device) => device.userId === user?.id);

  return (
    <SettingsStack>
      <SettingsSection
        title="Questo dispositivo"
        description="Gli avvisi del gestionale su questo telefono o computer."
      >
        <ThisDevice />
      </SettingsSection>

      <SettingsSection
        title="Cosa ricevere"
        description="Vale su tutti i dispositivi da cui hai attivato le notifiche."
      >
        <CategoryToggles
          muted={push.muted}
          onChange={push.setMuted}
          disabled={!push.loaded}
        />
      </SettingsSection>

      {devices.length > 0 && (
        <SettingsSection
          title={
            canManageDevices ? "Dispositivi dello staff" : "I tuoi dispositivi"
          }
          description={
            canManageDevices
              ? "Chi non fa più parte dello staff va tolto da qui. Le notifiche contengono nomi e orari dei clienti."
              : "Dove ricevi le notifiche del gestionale. Togli quelli che non usi più."
          }
        >
          <ListGroup>
            {devices.map((device) => {
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
        </SettingsSection>
      )}
    </SettingsStack>
  );
}

function ThisDevice() {
  const push = usePush();

  if (push.support === null) {
    return <SettingsSkeleton rows={1} />;
  }

  if (push.support === "needs-install") {
    return (
      <ListGroup footer="Su iPhone e iPad le notifiche arrivano solo al gestionale aggiunto alla schermata Home: Condividi › Aggiungi alla schermata Home, poi aprilo dall'icona.">
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
      <ListGroup>
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
      <ListGroup footer={deniedHelp()}>
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
