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
  /** Dati inseriti e non salvati: il pannello non si chiude da solo. */
  dirty?: boolean;
  onCloseAttempt?: () => void;
}

const ResponsiveProviderContext = React.createContext<
  ResponsiveProviderContextProps | undefined
>({} as ResponsiveProviderContextProps);

/**
 * Se il pannello aperto è la modale (desktop) o il drawer dal basso
 * (telefono): serve a chi ci mette dentro un drawer annidato, che esiste solo
 * nel secondo caso.
 */
export function useResponsiveDrawer(): { isDesktop: boolean } {
  const context = React.useContext(ResponsiveProviderContext);
  return { isDesktop: Boolean(context?.isDesktop) };
}

export type ResponsiveDrawerProps = ProviderProps & {
  open?: boolean;
  setOpen?: (open: boolean) => void;
  /**
   * Ci sono dati inseriti e non salvati. Il pannello allora non si chiude più
   * da solo — trascinandolo, toccando fuori, con Esc — e chiama invece
   * `onCloseAttempt`, che di norma chiede «Uscire senza salvare?». Senza dati
   * si chiude come sempre: chiedere conferma per niente insegna a non leggere.
   */
  dirty?: boolean;
  onCloseAttempt?: () => void;
};

export function ResponsiveDrawer({
  children,
  open = false,
  setOpen,
  dirty = false,
  onCloseAttempt,
}: ResponsiveDrawerProps) {
  // Impostiamo initializeWithValue:false per avere un primo render deterministico (false) sia su server che client
  const isDesktop = useMediaQuery("(min-width: 768px)", {
    initializeWithValue: false,
  });

  const handleSetOpen = (open: boolean) => {
    if (!open && dirty && onCloseAttempt) {
      onCloseAttempt();
      return;
    }
    setOpen?.(open);
  };

  if (isDesktop) {
    return (
      <ResponsiveProviderContext.Provider
        value={{
          open,
          setOpen: handleSetOpen,
          isDesktop,
          dirty,
          onCloseAttempt,
        }}
      >
        <Dialog open={open} onOpenChange={handleSetOpen}>
          {children}
        </Dialog>
      </ResponsiveProviderContext.Provider>
    );
  }

  return (
    <ResponsiveProviderContext.Provider
      value={{ open, setOpen: handleSetOpen, isDesktop, dirty, onCloseAttempt }}
    >
      <Drawer open={open} onOpenChange={handleSetOpen} dismissible={!dirty}>
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
  const { open, setOpen, isDesktop, dirty, onCloseAttempt } =
    React.useContext(ResponsiveProviderContext) || {};

  // Con dati non salvati, un tocco fuori o Esc non chiudono: chiedono. Da
  // telefono il drawer è anche non trascinabile (`dismissible`), perché Vaul
  // chiuderebbe prima di poter chiedere.
  const guardOutside = (event: Event) => {
    if (!dirty || !onCloseAttempt) return;
    event.preventDefault();
    onCloseAttempt();
  };

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
    <Drawer open={open} onOpenChange={setOpen} dismissible={!dirty}>
      <DrawerContent
        className={cn(className)}
        onPointerDownOutside={guardOutside}
        onEscapeKeyDown={guardOutside}
        {...props}
      >
        {children}
      </DrawerContent>
    </Drawer>
  );
}

export function ResponsiveDrawerHeader({
  title,
  description,
  visuallyHidden = false,
  className,
  titleClassName = "font-heading",
}: {
  title: string;
  description?: string;
  visuallyHidden?: boolean;
  className?: string;
  /** Il carattere del titolo: di norma il display del sito (/tournament). */
  titleClassName?: string;
}) {
  const { isDesktop } = React.useContext(ResponsiveProviderContext) || {};

  const Wrapper = visuallyHidden ? VisuallyHidden : React.Fragment;

  if (isDesktop) {
    return (
      <Wrapper>
        <DialogHeader className={className}>
          <DialogTitle className={titleClassName}>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
      </Wrapper>
    );
  }

  return (
    <DrawerHeader className={cn("text-left", className)}>
      <DrawerTitle className={titleClassName}>{title}</DrawerTitle>
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
