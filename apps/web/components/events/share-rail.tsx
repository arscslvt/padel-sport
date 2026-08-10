"use client";

import { Check, Link2 } from "lucide-react";
import { useState } from "react";
import { FaFacebookF, FaWhatsapp, FaXTwitter } from "react-icons/fa6";
import { toast } from "sonner";

import { cn } from "@/lib/utils";

const ITEM_CLASS =
  "grid size-9 place-content-center rounded-full border border-border text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none";

interface ShareRailProps {
  url: string;
  title: string;
  orientation?: "vertical" | "horizontal";
  className?: string;
}

export function ShareRail({
  url,
  title,
  orientation = "vertical",
  className,
}: ShareRailProps) {
  const [copied, setCopied] = useState(false);

  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);

  const targets = [
    {
      label: "Condividi su Facebook",
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      icon: FaFacebookF,
    },
    {
      label: "Condividi su WhatsApp",
      href: `https://wa.me/?text=${encodedTitle}%20${encodedUrl}`,
      icon: FaWhatsapp,
    },
    {
      label: "Condividi su X",
      href: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`,
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
