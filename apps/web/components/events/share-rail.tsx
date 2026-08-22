"use client";

import { Check, Link2 } from "lucide-react";
import { useState } from "react";
import { FaFacebookF, FaWhatsapp, FaXTwitter } from "react-icons/fa6";
import { toast } from "sonner";

import { cn } from "@/lib/utils";

const CLUB = "ASD Padel Sport Melilli";

/**
 * Il testo precompilato di WhatsApp e X.
 *
 * Il solo titolo, staccato dalla pagina, arriva in chat come una riga senza
 * contesto: non dice né cos'è né di chi è. «Nuovo» però cade sugli eventi già
 * passati, che si condividono come ricordo e non come invito.
 */
function shareMessage(title: string, concluded: boolean) {
  return concluded
    ? `Guarda l'evento «${title}» dell'${CLUB}`
    : `Scopri di più sul nuovo evento «${title}» presso l'${CLUB}`;
}

const ITEM_CLASS =
  "grid size-9 place-content-center rounded-full border border-border text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none";

interface ShareRailProps {
  url: string;
  title: string;
  /** Evento già svolto: cambia solo il taglio del messaggio precompilato. */
  concluded?: boolean;
  orientation?: "vertical" | "horizontal";
  className?: string;
}

export function ShareRail({
  url,
  title,
  concluded = false,
  orientation = "vertical",
  className,
}: ShareRailProps) {
  const [copied, setCopied] = useState(false);

  const encodedUrl = encodeURIComponent(url);
  const encodedMessage = encodeURIComponent(shareMessage(title, concluded));

  const targets = [
    {
      // Facebook ignora qualunque testo passato allo sharer e ricava il
      // messaggio dall'Open Graph della pagina: qui passa solo l'URL.
      label: "Condividi su Facebook",
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      icon: FaFacebookF,
    },
    {
      label: "Condividi su WhatsApp",
      href: `https://wa.me/?text=${encodedMessage}%20${encodedUrl}`,
      icon: FaWhatsapp,
    },
    {
      label: "Condividi su X",
      href: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedMessage}`,
      icon: FaXTwitter,
    },
  ];

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Link copiato negli appunti");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Non è stato possibile copiare il link");
    }
  };

  return (
    <div
      className={cn(
        "flex gap-2",
        orientation === "vertical" ? "flex-col" : "flex-row",
        className,
      )}
    >
      {targets.map(({ label, href, icon: Icon }) => (
        <a
          key={label}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={label}
          title={label}
          className={ITEM_CLASS}
        >
          <Icon className="size-4" />
        </a>
      ))}
      <button
        type="button"
        onClick={copyLink}
        aria-label="Copia il link dell'articolo"
        title="Copia il link"
        className={ITEM_CLASS}
      >
        {copied ? (
          <Check className="size-4 text-primary" />
        ) : (
          <Link2 className="size-4" />
        )}
      </button>
    </div>
  );
}
