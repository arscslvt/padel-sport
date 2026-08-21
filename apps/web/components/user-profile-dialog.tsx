"use client";

import { UserProfile } from "@clerk/nextjs";
import { XIcon } from "lucide-react";

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";

export default function UserProfileDialog({
  open,
  onOpenChange,
}: Readonly<{ open: boolean; onOpenChange: (open: boolean) => void }>) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-fit p-0 bg-transparent border-0 shadow-none sm:max-w-fit"
        showCloseButton={false}
      >
        <DialogTitle className="sr-only">Impostazioni profilo</DialogTitle>
        <UserProfile routing="hash" />

        {/*
         * La chiusura di default di DialogContent è una X senza sfondo di 16px:
         * troppo piccola da toccare e poco visibile sopra la card di Clerk, che
         * qui occupa tutto il contenuto del dialog.
         */}
        <DialogClose
          aria-label="Chiudi le impostazioni del profilo"
          className="absolute top-3 right-3 z-10 flex size-9 items-center justify-center rounded-full border bg-background/90 text-foreground shadow-sm backdrop-blur transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <XIcon className="size-4" />
        </DialogClose>
      </DialogContent>
    </Dialog>
  );
}
