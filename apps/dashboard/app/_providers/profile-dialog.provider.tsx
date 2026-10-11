"use client";

import type React from "react";
import { createContext, useContext, useMemo, useState } from "react";

import UserProfileDialog from "@/components/user-profile-dialog";

type ProfileDialogContextValue = {
  openProfile: () => void;
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
 * Tiene il dialog del profilo Clerk fuori dall'albero della Sidebar: su mobile
 * la sidebar vive dentro il Drawer, che viene smontato alla chiusura, e con lui
 * verrebbe smontato anche il dialog appena aperto.
 */
export default function ProfileDialogProvider({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const [open, setOpen] = useState(false);

  const value = useMemo<ProfileDialogContextValue>(
    () => ({ openProfile: () => setOpen(true) }),
    [],
  );

  return (
    <ProfileDialogContext.Provider value={value}>
      {children}
      <UserProfileDialog open={open} onOpenChange={setOpen} />
    </ProfileDialogContext.Provider>
  );
}
