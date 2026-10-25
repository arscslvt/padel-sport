import { PageSkeleton } from "@/app/_components/page-skeleton";

/** Lo scheletro di «Richieste»: il titolo subito, il contenuto in forma (page-skeleton.tsx). */
export default function Loading() {
  return (
    <PageSkeleton
      title="Richieste"
      description="Assistenza, ricerca compagni e segnalazioni sui punti arrivate dal sito: qui chi aspetta ancora una risposta."
      variant="list"
    />
  );
}
