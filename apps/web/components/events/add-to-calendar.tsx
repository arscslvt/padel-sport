"use client";

import { CalendarPlus, ChevronDown, Download } from "lucide-react";
import type { ComponentType } from "react";
import { useEffect, useState } from "react";
import { FaApple, FaGoogle, FaMicrosoft } from "react-icons/fa6";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { CalendarEvent } from "@/lib/calendar";
import { googleCalendarUrl, outlookCalendarUrl } from "@/lib/calendar";
import { cn } from "@/lib/utils";

type Platform = "apple" | "android" | "windows" | "other";

type CalendarTarget = {
  id: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  href: string;
  /**
   * Il .ics è servito dal nostro dominio con `Content-Disposition: attachment`,
   * quindi apre direttamente il calendario di sistema: niente scheda nuova.
   */
  local?: boolean;
};

/**
 * iPadOS 13+ si dichiara "MacIntel", quindi il ramo Apple copre già gli iPad.
 * `userAgentData` non è disponibile ovunque: lo uniamo alla UA classica.
 */
function detectPlatform(): Platform {
  if (typeof navigator === "undefined") return "other";

  const uaData = (
    navigator as Navigator & { userAgentData?: { platform?: string } }
  ).userAgentData;
  const haystack = `${navigator.userAgent} ${uaData?.platform ?? ""} ${
    navigator.platform ?? ""
  }`;

  if (/Android/i.test(haystack)) return "android";
  if (/iPhone|iPad|iPod|Mac/i.test(haystack)) return "apple";
  if (/Win/i.test(haystack)) return "windows";

  return "other";
}

const PRIMARY_BY_PLATFORM: Record<Platform, string> = {
  apple: "apple",
  android: "google",
  windows: "outlook",
  other: "ics",
};

function linkProps(target: Pick<CalendarTarget, "local">) {
  return target.local
    ? {}
    : { target: "_blank", rel: "noopener noreferrer" as const };
}

export function AddToCalendar({
  event,
  icsHref,
  className,
}: {
  event: CalendarEvent;
  icsHref: string;
  className?: string;
}) {
  // Resta `null` fino all'hydration: il markup del server non può conoscere l'OS.
  const [platform, setPlatform] = useState<Platform | null>(null);

  useEffect(() => setPlatform(detectPlatform()), []);

  const targets: CalendarTarget[] = [
    {
      id: "apple",
      label: "Apple Calendar",
      icon: FaApple,
      href: icsHref,
      local: true,
    },
    {
      id: "google",
      label: "Google Calendar",
      icon: FaGoogle,
      href: googleCalendarUrl(event),
    },
    {
      id: "outlook",
      label: "Outlook",
      icon: FaMicrosoft,
      href: outlookCalendarUrl(event),
    },
    {
      id: "ics",
      label: "Scarica file .ics",
      icon: Download,
      href: icsHref,
      local: true,
    },
  ];

  const fallback = targets[targets.length - 1];
  const primary = platform
    ? (targets.find((t) => t.id === PRIMARY_BY_PLATFORM[platform]) ?? fallback)
    : null;

  const others = targets.filter((target) => target.id !== primary?.id);
  const PrimaryIcon = primary?.icon ?? CalendarPlus;

  return (
    <div className={cn("flex items-center", className)}>
      <a
        href={primary?.href ?? icsHref}
        {...linkProps(primary ?? { local: true })}
        className="focus-visible:ring-ring/50 inline-flex h-9 items-center gap-2 rounded-l-full border border-border pr-3 pl-4 text-sm font-medium whitespace-nowrap text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground focus-visible:ring-3 focus-visible:outline-none"
      >
        <PrimaryIcon className="size-4 shrink-0" />
        {primary && primary.id !== "ics"
          ? `Aggiungi a ${primary.label}`
          : "Aggiungi al calendario"}
      </a>

      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label="Altre opzioni per il calendario"
          className="focus-visible:ring-ring/50 grid h-9 w-8 place-content-center rounded-r-full border border-l-0 border-border text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground focus-visible:ring-3 focus-visible:outline-none"
        >
          <ChevronDown className="size-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-52">
          <DropdownMenuLabel>Salva l&apos;evento in</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {others.map((target) => {
            const Icon = target.icon;

            return (
              <DropdownMenuItem key={target.id} asChild>
                <a href={target.href} {...linkProps(target)}>
                  <Icon className="size-4" />
                  {target.label}
                </a>
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
