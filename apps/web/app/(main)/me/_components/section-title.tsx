import { Heading } from "@/components/ui/heading";

/**
 * L'intestazione di un blocco dentro una sezione dell'area personale.
 *
 * Titolo e azione stanno sulla stessa riga, centrati fra loro; la riga di
 * contesto va sotto a tutta larghezza, così su telefono non si stringe in una
 * colonna accanto al bottone.
 */
export function SectionTitle({
  id,
  title,
  description,
  action,
}: {
  id: string;
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <Heading as="h2" size="sub" id={id} className="min-w-0">
          {title}
        </Heading>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      {description && (
        <p className="text-muted-foreground mt-1.5 max-w-[52ch] text-sm leading-relaxed">
          {description}
        </p>
      )}
    </div>
  );
}
