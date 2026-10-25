import { PageSkeleton } from "@/app/_components/page-skeleton";

/** Lo scheletro di «Comunicazioni»: il titolo subito, il contenuto in forma (page-skeleton.tsx). */
export default function Loading() {
  return (
    <PageSkeleton
      title="Comunicazioni"
      description="Le comunicazioni pubblicate nello Studio, da inviare agli iscritti. L'invio non si richiama."
      variant="list"
    />
  );
}
