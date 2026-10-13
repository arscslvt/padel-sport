import { NotFoundHero } from "@/components/not-found-hero";

/**
 * 404 per tutte le rotte del gruppo `(main)` — incluse /events/<slug> inesistenti.
 * Header e Footer arrivano già da `(main)/layout.tsx`: qui va reso solo il
 * contenuto, altrimenti la navigazione comparirebbe due volte.
 */
export default function MainNotFound() {
  return (
    <div className="page-container flex min-h-[70dvh] items-center pt-10 pb-16">
      <NotFoundHero />
    </div>
  );
}
