import { BRAND } from "@/lib/brand";
import { cn } from "@/lib/utils";

/**
 * Il segno di Vetro: un campo da padel visto dall'alto. Il perimetro è la
 * parete di vetro, la linea verde in mezzo è la rete. Una forma geometrica
 * semplice, leggibile anche a 16px.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={cn("size-6", className)}
    >
      <rect
        x="5"
        y="2.5"
        width="14"
        height="19"
        rx="3.5"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path
        d="M5 8h14M5 16h14M12 8v8"
        stroke="currentColor"
        strokeOpacity="0.45"
        strokeWidth="1.2"
      />
      <path
        d="M3.5 12h17"
        stroke="var(--brand)"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Segno e nome insieme: il nome è nella stessa serif dei titoli. */
export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <LogoMark />
      <span className="font-display text-[1.6rem] leading-none tracking-[-0.01em]">
        {BRAND.name}
      </span>
    </span>
  );
}
