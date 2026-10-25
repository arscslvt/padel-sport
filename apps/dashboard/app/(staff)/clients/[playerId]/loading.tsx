import { PageSkeleton } from "@/app/_components/page-skeleton";

/** La scheda di un cliente mentre arriva dal server. */
export default function Loading() {
  return (
    <PageSkeleton
      // Il nome arriva con la scheda: intanto, la sua forma.
      title={
        <span className="bg-foreground/[0.07] inline-block h-7 w-44 animate-pulse rounded-md align-middle" />
      }
      back={{ href: "/clients", label: "Clienti" }}
      variant="detail"
    />
  );
}
