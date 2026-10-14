"use client";

import { useState } from "react";

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/app/_components/tabs";

import { CourtsSettings } from "./courts-settings";
import { HoursSettings } from "./hours-settings";
import { NotificationSettings } from "./notification-settings";
import { RulesSettings } from "./rules-settings";

/**
 * Le linguette di Configurazione: le proprie notifiche, poi la prenotazione
 * online divisa per argomento. Prima era una pagina sola, lunga, dove le
 * notifiche personali e le regole del club si leggevano allo stesso livello.
 *
 * La linguetta aperta sta nell'indirizzo (`?tab=`): si ricarica, si torna
 * indietro o si manda il link e si riparte da lì. Cambiarla non ricarica la
 * pagina, riscrive solo l'indirizzo.
 */

const TABS = [
  { value: "notifications", label: "Notifiche" },
  { value: "hours", label: "Orari" },
  { value: "courts", label: "Campi" },
  { value: "rules", label: "Regole" },
] as const;

type SettingsTab = (typeof TABS)[number]["value"];

function isTab(value: string | undefined): value is SettingsTab {
  return TABS.some((tab) => tab.value === value);
}

export function SettingsTabs({ initialTab }: { initialTab?: string }) {
  const [tab, setTab] = useState<SettingsTab>(
    isTab(initialTab) ? initialTab : "notifications",
  );

  const change = (value: string) => {
    if (!isTab(value)) return;
    setTab(value);
    const url = new URL(window.location.href);
    url.searchParams.set("tab", value);
    window.history.replaceState(null, "", url);
  };

  return (
    <Tabs value={tab} onValueChange={change} className="max-w-4xl gap-6">
      {/*
       * Da telefono le linguette restano in alto mentre si scorre (gli orari
       * di una settimana sono lunghi), sotto la barra di stato e sopra un
       * fondo traslucido che arriva ai bordi, come nella scheda cliente.
       */}
      <div className="dashboard-material bg-background/85 sticky top-[env(safe-area-inset-top)] z-20 -mx-4 px-4 py-2 backdrop-blur-xl md:static md:mx-0 md:bg-transparent md:p-0 md:backdrop-blur-none">
        <TabsList>
          {TABS.map((item) => (
            <TabsTrigger key={item.value} value={item.value}>
              {item.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </div>

      <TabsContent value="notifications" className="settings-enter">
        <NotificationSettings />
      </TabsContent>
      {/*
       * Orari resta montata anche quando non si vede: una bozza a metà
       * sopravvive a un giro in un'altra linguetta, invece di sparire.
       */}
      <TabsContent
        value="hours"
        forceMount
        className="settings-enter data-[state=inactive]:hidden"
      >
        <HoursSettings />
      </TabsContent>
      <TabsContent value="courts" className="settings-enter">
        <CourtsSettings />
      </TabsContent>
      <TabsContent value="rules" className="settings-enter">
        <RulesSettings />
      </TabsContent>
    </Tabs>
  );
}
