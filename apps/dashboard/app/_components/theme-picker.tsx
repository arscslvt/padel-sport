"use client";

import { type LucideIcon, Moon, Sun, SunMoon } from "lucide-react";
import { useTheme } from "next-themes";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

/**
 * Chiaro, scuro o come il dispositivo.
 *
 * Di base è «Automatico» (`defaultTheme`, app/layout.tsx): il gestionale
 * cambia con il sistema, di sera compreso. La scelta a mano resta in questo
 * browser (next-themes la tiene in `localStorage`), non segue l'account: lo
 * stesso membro dello staff può volere il chiaro al bancone e lo scuro a casa.
 *
 * Due forme, come le altre voci dell'account: il controllo a segmenti in
 * «Altro» da telefono, il menu in fondo alla barra laterale da desktop.
 */

type ThemeChoice = "system" | "light" | "dark";

const THEME_OPTIONS: readonly {
  value: ThemeChoice;
  label: string;
  icon: LucideIcon;
}[] = [
  { value: "system", label: "Automatico", icon: SunMoon },
  { value: "light", label: "Chiaro", icon: Sun },
  { value: "dark", label: "Scuro", icon: Moon },
];

/** Il controllo a segmenti del pannello «Altro». */
export function ThemeSegmentedControl({ className }: { className?: string }) {
  // Prima dell'idratazione `theme` non c'è ancora: nessun segmento acceso,
  // invece di uno sbagliato.
  const { theme, setTheme } = useTheme();

  return (
    <fieldset
      className={cn(
        "bg-foreground/[0.06] grid grid-cols-3 gap-1 rounded-xl p-1",
        className,
      )}
    >
      <legend className="sr-only">Aspetto</legend>
      {THEME_OPTIONS.map((option) => {
        const selected = theme === option.value;

        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={selected}
            onClick={() => setTheme(option.value)}
            className={cn(
              "flex min-h-10 items-center justify-center gap-1.5 rounded-lg text-sm transition-colors",
              selected
                ? "bg-card dark:bg-foreground/15 font-medium shadow-xs"
                : "text-muted-foreground",
            )}
          >
            <option.icon className="size-4" />
            {option.label}
          </button>
        );
      })}
    </fieldset>
  );
}

/**
 * «Aspetto» in fondo alla barra laterale. L'icona è sempre la stessa: quella
 * del tema in uso cambierebbe tra server e browser, e con lei l'idratazione.
 */
export function ThemeMenuButton() {
  const { theme, setTheme } = useTheme();

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton tooltip="Aspetto">
              <SunMoon />
              <span>Aspetto</span>
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="right" align="end" className="w-44">
            <DropdownMenuLabel>Aspetto</DropdownMenuLabel>
            <DropdownMenuRadioGroup
              value={theme}
              onValueChange={(value) => setTheme(value)}
            >
              {THEME_OPTIONS.map((option) => (
                <DropdownMenuRadioItem key={option.value} value={option.value}>
                  <option.icon className="text-muted-foreground" />
                  {option.label}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
