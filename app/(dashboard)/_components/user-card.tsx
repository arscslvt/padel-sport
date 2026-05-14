"use client";

import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth, useUser } from "@clerk/nextjs";
import { LogOut } from "lucide-react";

export default function UserCard() {
  const { user } = useUser();
  const { signOut } = useAuth();

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

  return (
    <div className="flex items-center gap-2.5 p-2">
      <div className="flex-1 flex items-center gap-2.5">
        <Avatar>
          <AvatarImage src={user?.imageUrl} alt={user?.fullName ?? "User"} />
        </Avatar>
        <div>
          <p className="text-sm font-medium">{user?.fullName}</p>
        </div>
      </div>

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
