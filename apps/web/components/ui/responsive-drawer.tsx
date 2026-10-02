"use client";

import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import * as React from "react";
import { useMediaQuery } from "usehooks-ts";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { cn } from "@/lib/utils";

import type { ProviderProps } from "@/types/components/provider.type";

interface ResponsiveProviderContextProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  isDesktop?: boolean;
}

const ResponsiveProviderContext = React.createContext<
  ResponsiveProviderContextProps | undefined
>({} as ResponsiveProviderContextProps);

export type ResponsiveDrawerProps = ProviderProps & {
  open?: boolean;
  setOpen?: (open: boolean) => void;
};

export function ResponsiveDrawer({
  children,
  open = false,
  setOpen,
}: ResponsiveDrawerProps) {
  // Impostiamo initializeWithValue:false per avere un primo render deterministico (false) sia su server che client
  const isDesktop = useMediaQuery("(min-width: 768px)", {
    initializeWithValue: false,
  });

  const handleSetOpen = (open: boolean) => {
    setOpen?.(open);
  };

  if (isDesktop) {
    return (
      <ResponsiveProviderContext.Provider
        value={{ open, setOpen: handleSetOpen, isDesktop }}
      >
        <Dialog open={open} onOpenChange={handleSetOpen}>
          {children}
        </Dialog>
      </ResponsiveProviderContext.Provider>
    );
  }

  return (
    <ResponsiveProviderContext.Provider
      value={{ open, setOpen: handleSetOpen, isDesktop }}
    >
      <Drawer open={open} onOpenChange={handleSetOpen}>
        {children}
      </Drawer>
    </ResponsiveProviderContext.Provider>
  );
}

type ResponsiveDrawerTriggerProps = ProviderProps;

export function ResponsiveDrawerTrigger({
  children,
}: ResponsiveDrawerTriggerProps) {
  const { open, setOpen, isDesktop } =
    React.useContext(ResponsiveProviderContext) || {};

  const handleClick = () => {
    setOpen?.(!open);
  };

  if (isDesktop) {
    return (
      <DialogTrigger onClick={handleClick} asChild>
        {children}
      </DialogTrigger>
    );
  }

  return (
    <DrawerTrigger asChild onClick={handleClick}>
      {children}
    </DrawerTrigger>
  );
}

type ResponsiveDrawerContentProps = ProviderProps &
  React.HTMLAttributes<HTMLDivElement>;

export function ResponsiveDrawerContent({
  children,
  className,
  ...props
}: ResponsiveDrawerContentProps) {
  const { open, setOpen, isDesktop } =
    React.useContext(ResponsiveProviderContext) || {};

  // Gli altri attributi (per esempio `onPaste`) arrivano al contenitore vero,
  // modale o drawer che sia: è lui ad avere il fuoco quando si apre.
  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className={cn("sm:max-w-106.25", className)} {...props}>
          {children}
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerContent className={cn(className)} {...props}>
        {children}
      </DrawerContent>
    </Drawer>
  );
}

export function ResponsiveDrawerHeader({
  title,
  description,
  visuallyHidden = false,
}: {
  title: string;
  description?: string;
  visuallyHidden?: boolean;
}) {
  const { isDesktop } = React.useContext(ResponsiveProviderContext) || {};

  const Wrapper = visuallyHidden ? VisuallyHidden : React.Fragment;

  if (isDesktop) {
    return (
      <Wrapper>
        <DialogHeader>
          <DialogTitle className="font-heading">{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
      </Wrapper>
    );
  }

  return (
    <DrawerHeader className="text-left">
      <DrawerTitle className="font-heading">{title}</DrawerTitle>
      {description && <DrawerDescription>{description}</DrawerDescription>}
    </DrawerHeader>
  );
}

export function ResponsiveDrawerFooter({
  children,
  className,
}: ProviderProps & React.HTMLAttributes<HTMLDivElement>) {
  const { isDesktop } = React.useContext(ResponsiveProviderContext) || {};

  if (isDesktop) {
    return <div className={cn("mt-auto", className)}>{children}</div>;
  }

  return <DrawerFooter className={cn(className)}>{children}</DrawerFooter>;
}
