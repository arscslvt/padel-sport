"use client";

import { useAuth, useUser } from "@clerk/nextjs";
import { LogOut } from "lucide-react";

import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useSidebar } from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { useProfileDialog } from "../_providers/profile-dialog.provider";

export default function UserCard() {
  const { user } = useUser();
  const { signOut } = useAuth();
  const { isMobile, setOpenMobile } = useSidebar();
  const { openProfile } = useProfileDialog();

  if (!user) {
    return (
      <Skeleton>
        <div className="flex items-center gap-4 p-2">
          <div className="rounded-full bg-border h-10 w-10" />
          <div className="flex-1">
            <div className="h-4 bg-border rounded w-3/4 mb-2" />
            <div className="h-3 bg-border rounded w-1/2" />
          </div>
        </div>
      </Skeleton>
    );
  }

  const handleOpenProfile = () => {
    if (isMobile) setOpenMobile(false);
    openProfile();
  };

  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={handleOpenProfile}
        aria-label="Apri le impostazioni del profilo"
        className="flex min-w-0 flex-1 items-center gap-2.5 rounded-md p-2 text-left transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
      >
        <Avatar>
          <AvatarImage src={user?.imageUrl} alt={user?.fullName ?? "User"} />
        </Avatar>
        <p className="truncate text-sm font-medium">{user?.fullName}</p>
      </button>

      <div>
        <Button
          size={"icon"}
          variant={"ghost"}
          className="group/button rounded-full hover:bg-destructive/10 focus-visible:bg-destructive/10"
          onClick={() => signOut()}
        >
          <LogOut className="size-4 group-hover/button:text-destructive" />
        </Button>
      </div>
    </div>
  );
}
