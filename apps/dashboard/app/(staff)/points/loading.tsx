import { PageSkeleton } from "@/app/_components/page-skeleton";

/** Lo scheletro di «Punti e premi»: il titolo subito, il contenuto in forma (page-skeleton.tsx). */
export default function Loading() {
  return (
    <PageSkeleton
      title="Punti e premi"
      description="Catalogo premi, causali dei punti, punti automatici e premi riscattati da consegnare."
      variant="tabs"
    />
  );
}
