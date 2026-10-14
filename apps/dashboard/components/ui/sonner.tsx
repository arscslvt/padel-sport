"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner, ToasterProps } from "sonner"

import { useIsMobile } from "@/hooks/use-mobile"

const Toaster = ({ ...props }: ToasterProps) => {
  const { resolvedTheme } = useTheme()
  const isMobile = useIsMobile()

  return (
    <Sonner
      // Il tema in uso, non la preferenza: con «automatico» la preferenza è
      // "system", e qui conta se ora è chiaro o scuro.
      theme={resolvedTheme === "dark" ? "dark" : "light"}
      // Da telefono gli avvisi scendono dall'alto, come le notifiche di iOS:
      // in basso finivano sopra la barra delle sezioni, e dietro la tastiera
      // mentre si scrive. Sotto la barra di stato, che nell'app installata
      // la pagina copre (`viewportFit: cover`). Si chiudono scorrendo in su.
      // Da desktop restano in basso a destra, lontani dal lavoro.
      position={isMobile ? "top-center" : "bottom-right"}
      mobileOffset={{
        top: "calc(env(safe-area-inset-top) + 0.5rem)",
        left: "0.75rem",
        right: "0.75rem",
      }}
      className="toaster group"
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
        } as React.CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }
