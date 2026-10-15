"use client";

import { useAuth, useUser } from "@clerk/nextjs";
import { Bell, LogOut } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";
import { ListGroup, ListRow } from "@/app/_components/list";
import {
  SettingsSection,
  SettingsSkeleton,
  SettingsStack,
} from "@/app/(staff)/settings/_components/settings-section";
import { Skeleton } from "@/components/ui/skeleton";
import { DURATION, EASE } from "@/lib/motion";

import { PersonalDetails } from "./personal-details";
import { ProfileHero } from "./profile-hero";
import { ActiveDevices, PasswordRow } from "./security";
import { SignInMethods } from "./sign-in-methods";
import { StaffSection } from "./staff-section";

/**
 * Il profilo di chi lavora nel gestionale.
 *
 * Si legge dall'alto come la pagina del proprio account su iOS: chi sei (la
 * foto e il nome, che si cambiano qui), come entri (email e Google), quanto
 * è protetto l'accesso (password, dispositivi), le preferenze personali, e
 * in fondo l'uscita.
 *
 * Tutto quello che non chiede verifiche si modifica qui. Email, password e
 * dispositivi si vedono qui ma si cambiano nel pannello di Clerk, che chiede
 * un codice o la password prima di toccare l'accesso.
 *
 * Le sezioni hanno la forma di Configurazione (`SettingsSection`): elenchi
 * raggruppati da telefono, titolo e spiegazione a sinistra da desktop.
 * L'unico movimento è l'ingresso in sequenza, dall'alto.
 */
export function ProfileView({
  role,
  isAdmin,
}: {
  role: string;
  /** Gli amministratori vedono anche lo staff, e lo gestiscono. */
  isAdmin: boolean;
}) {
  const { isLoaded } = useUser();
  const { signOut } = useAuth();

  if (!isLoaded) return <ProfileSkeleton />;

  return (
    <div className="max-w-4xl space-y-8">
      <Rise index={0}>
        <ProfileHero role={role} />
      </Rise>

      <SettingsStack>
        <Rise index={1}>
          <SettingsSection
            title="Dati personali"
            description="Come compari nel gestionale."
          >
            <PersonalDetails />
          </SettingsSection>
        </Rise>

        <Rise index={2}>
          <SettingsSection
            title="Accesso"
            description="Le email e gli account con cui entri. Per cambiarli ti chiediamo un codice di conferma."
          >
            <SignInMethods />
          </SettingsSection>
        </Rise>

        <Rise index={3}>
          <SettingsSection
            title="Sicurezza"
            description="Se vedi un dispositivo che non riconosci, scollegalo da «Gestisci i dispositivi»."
          >
            <PasswordRow />
            <ActiveDevices />
          </SettingsSection>
        </Rise>

        {isAdmin && (
          <Rise index={4}>
            <SettingsSection
              title="Staff"
              description="Chi entra nel gestionale. Chi togli perde subito l'accesso; il suo account resta."
            >
              <StaffSection />
            </SettingsSection>
          </Rise>
        )}

        <Rise index={5}>
          <SettingsSection title="Preferenze">
            <ListGroup>
              <ListRow
                href="/settings?tab=notifications"
                leading={<Bell className="size-5" />}
                title="Notifiche"
                subtitle="Cosa ricevere, e su questo dispositivo"
                chevron
              />
            </ListGroup>
          </SettingsSection>
        </Rise>

        <Rise index={6}>
          <SettingsSection title="Sessione">
            <ListGroup>
              <ListRow
                leading={<LogOut className="size-5" />}
                title="Esci"
                tone="danger"
                onClick={() => void signOut()}
              />
            </ListGroup>
          </SettingsSection>
        </Rise>
      </SettingsStack>
    </div>
  );
}

/**
 * L'ingresso di una sezione: sale di pochi pixel mentre appare, una dopo
 * l'altra dall'alto. Fuori da `ProfileView` di proposito: un componente
 * definito dentro il render sarebbe nuovo a ogni aggiornamento, e React
 * rimonterebbe le sezioni perdendo quello che si sta scrivendo.
 */
function Rise({ index, children }: { index: number; children: ReactNode }) {
  const reduce = useReducedMotion();

  return (
    <motion.div
      initial={reduce ? { opacity: 0 } : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: reduce ? 0.15 : DURATION.base,
        delay: reduce ? 0 : index * 0.06,
        ease: EASE,
      }}
    >
      {children}
    </motion.div>
  );
}

/** La forma della pagina mentre Clerk carica l'utente. */
function ProfileSkeleton() {
  return (
    <div className="max-w-4xl space-y-8" aria-busy>
      <div className="flex flex-col items-center gap-4 md:flex-row md:gap-5 md:rounded-2xl md:border md:bg-card md:p-6">
        <Skeleton className="size-24 rounded-full md:size-20" />
        <div className="flex flex-col items-center gap-2 md:flex-1 md:items-start">
          <Skeleton className="h-6 w-44" />
          <Skeleton className="h-4 w-56" />
        </div>
      </div>
      <SettingsStack>
        <SettingsSkeleton rows={2} />
        <SettingsSkeleton rows={2} />
      </SettingsStack>
    </div>
  );
}
