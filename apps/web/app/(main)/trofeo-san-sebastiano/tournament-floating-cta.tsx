"use client";

import { MessageCircle, PhoneCall } from "lucide-react";
import { useEffect, useState } from "react";
import LiveDot from "@/app/tournament/components/live-dot";
import { Button } from "@/components/ui/button";
import { TOURNAMENT_LINK } from "@/lib/links";
import { cn } from "@/lib/utils";

type TournamentFloatingCtaProps = {
  whatsappHref: string;
  phoneHref: string;
  sourceId: string;
  containerId: string;
};

export default function TournamentFloatingCta({
  whatsappHref,
  phoneHref,
  sourceId,
  containerId,
}: TournamentFloatingCtaProps) {
  const [isFloating, setIsFloating] = useState(false);
  const [isDocked, setIsDocked] = useState(false);

  useEffect(() => {
    const updateFloatingState = () => {
      const sourceEl = document.getElementById(sourceId);
      const containerEl = document.getElementById(containerId);
      const top = sourceEl?.getBoundingClientRect().top;
      const containerBottom = containerEl?.getBoundingClientRect().bottom;
      if (typeof top !== "number" || typeof containerBottom !== "number") {
        return;
      }

      // Start floating shortly before the header card scrolls out of view.
      const reachedSourceThreshold = top <= 28;
      const dockStartY = window.innerHeight - 72;
      const dockReleaseY = window.innerHeight - 24;

      setIsFloating(reachedSourceThreshold);
      setIsDocked((previous) => {
        if (!reachedSourceThreshold) {
          return false;
        }

        if (previous) {
          return containerBottom <= dockReleaseY;
        }

        return containerBottom <= dockStartY;
      });
    };

    updateFloatingState();
    window.addEventListener("scroll", updateFloatingState, { passive: true });
    window.addEventListener("resize", updateFloatingState);

    return () => {
      window.removeEventListener("scroll", updateFloatingState);
      window.removeEventListener("resize", updateFloatingState);
    };
  }, [sourceId, containerId]);

  return (
    <div className="relative h-36">
      <div
        className={cn(
          "pointer-events-none fixed inset-x-0 bottom-4 z-50 mx-auto w-[min(calc(100vw-2rem),56rem)] transition-all duration-300",
          isFloating && !isDocked
            ? "translate-y-0 opacity-100"
            : "translate-y-6 opacity-0",
        )}
      >
        <div className="pointer-events-auto rounded-card border-border bg-background/95 border p-4 shadow-lg backdrop-blur-xl">
          <p className="text-muted-foreground text-xs tracking-[0.18em] uppercase">
            Segui il torneo
          </p>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row">
            <Button asChild size="pill" className="sm:flex-1">
              <a
                href={TOURNAMENT_LINK}
                target="_blank"
                rel="noopener noreferrer"
              >
                <LiveDot /> Vedi risultati in diretta
              </a>
            </Button>
          </div>
        </div>
      </div>

      {isDocked && (
        <div className="rounded-card border-border bg-background absolute inset-x-0 bottom-0 border p-4 shadow-lg">
          <p className="text-muted-foreground text-xs tracking-[0.18em] uppercase">
            Come partecipare
          </p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <Button asChild size="pill" className="sm:flex-1">
              <a href={whatsappHref} target="_blank" rel="noopener noreferrer">
                <MessageCircle /> Scrivici su WhatsApp
              </a>
            </Button>
            <Button asChild size="pill" variant="outline" className="sm:flex-1">
              <a href={phoneHref}>
                <PhoneCall /> Chiamaci al cellulare
              </a>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
