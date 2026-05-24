"use client";

import { UserProfile, useAuth, useUser } from "@clerk/nextjs";
import { LogOut, Settings } from "lucide-react";
import { useState } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";

export default function UserMenu() {
  const { user, isLoaded } = useUser();
  const { signOut } = useAuth();
  const [profileOpen, setProfileOpen] = useState(false);

  if (!isLoaded) {
    return <Skeleton className="h-9 w-9 rounded-full" />;
  }

  if (!user) {
    return null;
  }

  const initials =
    user.firstName?.[0] || user.lastName?.[0] || user.username?.[0] || "U";

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="flex items-center gap-2 rounded-full p-1 pr-2 hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors"
            aria-label="Apri menu profilo"
          >
            <Avatar className="h-8 w-8">
              <AvatarImage
                src={user.imageUrl}
                alt={user.fullName ?? "Profilo"}
              />
              <AvatarFallback className="text-xs font-medium">
                {initials.toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className="hidden sm:inline text-sm font-medium max-w-40 truncate">
              {user.fullName ?? user.primaryEmailAddress?.emailAddress}
            </span>
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-60">
          <DropdownMenuLabel className="flex flex-col gap-0.5 py-2">
            <span className="text-sm font-medium leading-tight">
              {user.fullName ?? "Utente"}
            </span>
            {user.primaryEmailAddress?.emailAddress && (
              <span className="text-xs text-muted-foreground truncate">
                {user.primaryEmailAddress.emailAddress}
              </span>
            )}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => setProfileOpen(true)}>
            <Settings className="h-4 w-4 mr-2" />
            Impostazioni profilo
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={() => signOut({ redirectUrl: "/" })}
            className="text-destructive focus:text-destructive focus:bg-destructive/10"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={profileOpen} onOpenChange={setProfileOpen}>
        <DialogContent
          className="max-w-fit p-0 bg-transparent border-0 shadow-none sm:max-w-fit"
          showCloseButton={false}
        >
          <DialogTitle className="sr-only">Impostazioni profilo</DialogTitle>
          <UserProfile routing="hash" />
        </DialogContent>
      </Dialog>
    </>
  );
}
