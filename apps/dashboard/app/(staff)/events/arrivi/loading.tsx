import { PageSkeleton } from "@/app/_components/page-skeleton";

/** Lo scheletro di «Arrivi»: il titolo subito, il contenuto in forma (page-skeleton.tsx). */
export default function Loading() {
  return (
    <PageSkeleton
      title="Arrivi"
      description="L'appello all'ingresso: le spunte si salvano da sole, anche fra più telefoni."
      variant="search"
    />
  );
}
