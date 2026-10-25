import { PageSkeleton } from "@/app/_components/page-skeleton";

/** Lo scheletro di «Clienti»: il titolo subito, il contenuto in forma (page-skeleton.tsx). */
export default function Loading() {
  return (
    <PageSkeleton
      title="Clienti"
      description="Anagrafica, tessera annuale, account e punti di chi frequenta il club."
      variant="search"
      mobileActions={1}
    />
  );
}
