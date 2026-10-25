import { PageSkeleton } from "@/app/_components/page-skeleton";

/** Lo scheletro di «Profilo»: il titolo subito, il contenuto in forma (page-skeleton.tsx). */
export default function Loading() {
  return (
    <PageSkeleton
      title="Profilo"
      description="Come ti vede il resto dello staff, e come entri nel gestionale."
      variant="detail"
    />
  );
}
