"use client";

import { LevelBars } from "@/components/level-bars";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LEVEL_RANGES } from "@/lib/levels";

/**
 * La scelta della fascia di livello, con le stanghette in coda a ogni voce.
 *
 * Le stanghette stanno dentro il testo della voce, non accanto: Radix ricopia
 * quel testo nel bottone, e così la fascia scelta le mostra anche da chiusa.
 */
export function LevelSelect({
  id,
  value,
  onValueChange,
}: {
  id: string;
  /** Posizione della fascia in `LEVEL_RANGES`. */
  value: number;
  onValueChange: (index: number) => void;
}) {
  return (
    <Select
      value={String(value)}
      onValueChange={(next) => onValueChange(Number(next))}
    >
      <SelectTrigger
        id={id}
        className="w-full *:data-[slot=select-value]:flex-1"
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {LEVEL_RANGES.map((range, index) => (
          <SelectItem
            key={range.label}
            value={String(index)}
            className="*:[span]:last:flex-1"
          >
            <span className="flex w-full items-center justify-between gap-3">
              {range.label}
              <LevelBars filled={index + 1} />
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
