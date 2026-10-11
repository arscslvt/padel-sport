"use client";

import { useAuth, useUser } from "@clerk/nextjs";
import { LogOut } from "lucide-react";

import { Avatar, AvatarImage } from "@/components/ui/avatar";
import {
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
  useSidebar,
} from "@/components/ui/sidebar";
import { useProfileDialog } from "../_providers/profile-dialog.provider";

export default function UserCard() {
  const { user } = useUser();
  const { signOut } = useAuth();
  const { isMobile, setOpenMobile } = useSidebar();
  const { openProfile } = useProfileDialog();

  if (!user) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuSkeleton showIcon />
        </SidebarMenuItem>
      </SidebarMenu>
    );
  }

  const handleOpenProfile = () => {
    if (isMobile) setOpenMobile(false);
    openProfile();
  };

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton
          size="lg"
          onClick={handleOpenProfile}
          aria-label="Apri le impostazioni del profilo"
          tooltip={user.fullName ?? "Profilo"}
        >
          <Avatar className="size-8 shrink-0">
            <AvatarImage src={user.imageUrl} alt={user.fullName ?? "Utente"} />
          </Avatar>
          <span className="truncate font-medium">{user.fullName}</span>
        </SidebarMenuButton>

        {/*
         * `SidebarMenuAction` sparisce da sé a barra stretta: uscire è un gesto
         * che non si deve poter fare per sbaglio mirando all'avatar, e in tre
         * centimetri i due bersagli finirebbero uno sull'altro. Con la barra
         * stretta si esce dal profilo, che è un clic più in là ma è voluto.
         */}
        <SidebarMenuAction
          onClick={() => signOut()}
          aria-label="Esci dalla dashboard"
          className="hover:bg-destructive/10 hover:text-destructive"
        >
          <LogOut />
        </SidebarMenuAction>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
