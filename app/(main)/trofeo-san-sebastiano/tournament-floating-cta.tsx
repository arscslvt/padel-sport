"use client";

import { MessageCircle, PhoneCall } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
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
        <div className="pointer-events-auto rounded-2xl border border-white/20 bg-background/95 p-4 shadow-xl">
          <p className="text-sm font-semibold uppercase tracking-wide text-white/75">
            Come partecipare
          </p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <Button asChild className="sm:flex-1">
              <a href={whatsappHref} target="_blank" rel="noopener noreferrer">
                <MessageCircle /> Scrivici su WhatsApp
              </a>
            </Button>
            <Button asChild variant="secondary" className="sm:flex-1">
              <a href={phoneHref}>
                <PhoneCall /> Chiamaci al cellulare
              </a>
            </Button>
          </div>
        </div>
      </div>

      {isDocked && (
        <div className="absolute inset-x-0 bottom-0 rounded-2xl border border-white/20 bg-background/95 p-4 shadow-xl">
          <p className="text-sm font-semibold uppercase tracking-wide text-white/75">
            Come partecipare
          </p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <Button asChild className="sm:flex-1">
              <a href={whatsappHref} target="_blank" rel="noopener noreferrer">
                <MessageCircle /> Scrivici su WhatsApp
              </a>
            </Button>
            <Button asChild variant="secondary" className="sm:flex-1">
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
