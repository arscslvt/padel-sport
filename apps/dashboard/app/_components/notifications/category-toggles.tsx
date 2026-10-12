"use client";

import {
  NOTIFICATION_CATEGORIES,
  type NotificationCategory,
} from "@padel-sport/backend/convex/utils/notificationCategories";
import type { ReactNode } from "react";

import { ListGroup } from "@/app/_components/list";
import { Switch } from "@/components/ui/switch";

/**
 * I tipi di avviso, uno per riga con il suo interruttore.
 *
 * Lo stesso elenco nella richiesta di attivazione e in Configurazione: chi
 * sceglie la prima volta e chi ci ripensa vede le stesse parole. La
 * descrizione va a capo invece di troncarsi — è quella che dice cosa si
 * spegne davvero.
 */
export function CategoryToggles({
  muted,
  onChange,
  disabled,
  title,
  footer,
}: {
  muted: readonly NotificationCategory[];
  onChange: (muted: NotificationCategory[]) => void;
  disabled?: boolean;
  title?: ReactNode;
  footer?: ReactNode;
}) {
  const toggle = (key: NotificationCategory, on: boolean) =>
    onChange(on ? muted.filter((item) => item !== key) : [...muted, key]);

  return (
    <ListGroup title={title} footer={footer}>
      {NOTIFICATION_CATEGORIES.map((category) => {
        const id = `notification-category-${category.key}`;
        return (
          <label
            key={category.key}
            htmlFor={id}
            className="flex min-h-14 cursor-pointer items-center gap-3 px-4 py-2.5"
          >
            <span className="min-w-0 flex-1">
              <span className="block text-[15px] leading-snug">
                {category.label}
              </span>
              <span className="text-muted-foreground mt-0.5 block text-[13px] leading-snug">
                {category.description}
              </span>
            </span>
            <Switch
              id={id}
              checked={!muted.includes(category.key)}
              disabled={disabled}
              onCheckedChange={(on) => toggle(category.key, on)}
            />
          </label>
        );
      })}
    </ListGroup>
  );
}
