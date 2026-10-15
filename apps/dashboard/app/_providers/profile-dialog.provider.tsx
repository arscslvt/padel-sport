"use client";

import type React from "react";
import { createContext, useContext, useMemo, useState } from "react";

import UserProfileDialog from "@/components/user-profile-dialog";

/**
 * Le pagine del profilo di Clerk che apriamo da noi. Nome e foto si cambiano
 * nella pagina `/profile`; qui finisce solo quello che chiede una verifica:
 * email, account collegati, password, dispositivi.
 */
export type ClerkProfilePage = "account" | "security";

type ProfileDialogContextValue = {
  openProfile: (page?: ClerkProfilePage) => void;
};

const ProfileDialogContext = createContext<ProfileDialogContextValue | null>(
  null,
);

export function useProfileDialog() {
  const context = useContext(ProfileDialogContext);
  if (!context) {
    throw new Error(
      "useProfileDialog must be used within a ProfileDialogProvider.",
    );
  }

  return context;
}

/**
 * Con `routing="hash"` Clerk legge la sua pagina dall'ancora dell'indirizzo:
 * `#/security` apre «Sicurezza», nessuna ancora apre il profilo. La si scrive
 * prima che il componente si monti e la si toglie alla chiusura, senza
 * aggiungere voci alla cronologia: «Indietro» deve uscire dalla pagina, non
 * dal pannello.
 */
function setClerkHash(page: ClerkProfilePage | null) {
  const url = new URL(window.location.href);
  url.hash = page === "security" ? "/security" : "";
  window.history.replaceState(window.history.state, "", url);
}

/**
 * Tiene il dialog del profilo Clerk fuori dall'albero della Sidebar: su mobile
 * la sidebar vive dentro il Drawer, che viene smontato alla chiusura, e con lui
 * verrebbe smontato anche il dialog appena aperto.
 */
export default function ProfileDialogProvider({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const [open, setOpen] = useState(false);
  // Resta impostata anche a pannello chiuso: il contenuto non deve sparire
  // mentre il dialog esce in dissolvenza.
  const [page, setPage] = useState<ClerkProfilePage>("account");

  const value = useMemo<ProfileDialogContextValue>(
    () => ({
      openProfile: (next = "account") => {
        setClerkHash(next);
        setPage(next);
        setOpen(true);
      },
    }),
    [],
  );

  return (
    <ProfileDialogContext.Provider value={value}>
      {children}
      <UserProfileDialog
        open={open}
        page={page}
        onOpenChange={(next) => {
          if (!next) setClerkHash(null);
          setOpen(next);
        }}
      />
    </ProfileDialogContext.Provider>
  );
}
