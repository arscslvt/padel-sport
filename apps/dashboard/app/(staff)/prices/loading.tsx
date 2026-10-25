import { PageSkeleton } from "@/app/_components/page-skeleton";

/** Lo scheletro di «Listino»: il titolo subito, il contenuto in forma (page-skeleton.tsx). */
export default function Loading() {
  return (
    <PageSkeleton
      title="Listino"
      description="Quanto costano i servizi che si prenotano dal sito, dall'app e allo sportello."
      variant="list"
    />
  );
}
