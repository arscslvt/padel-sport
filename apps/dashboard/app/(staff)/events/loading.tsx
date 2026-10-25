import { PageSkeleton } from "@/app/_components/page-skeleton";

/** Lo scheletro di «Iscrizioni»: il titolo subito, il contenuto in forma (page-skeleton.tsx). */
export default function Loading() {
  return (
    <PageSkeleton
      title="Iscrizioni"
      description="Chi ha segnalato la propria presenza agli eventi con modulo di iscrizione."
      variant="list"
    />
  );
}
