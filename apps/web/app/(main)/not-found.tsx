import { NotFoundHero } from "@/components/not-found-hero";

/**
 * 404 per tutte le rotte del gruppo `(main)` — incluse /events/<slug> inesistenti.
 * Header e Footer arrivano già da `(main)/layout.tsx`: qui va reso solo il
 * contenuto, altrimenti la navigazione comparirebbe due volte.
 */
export default function MainNotFound() {
  return (
    <div className="mx-auto flex min-h-[70dvh] w-full max-w-6xl items-center px-6 pt-10 pb-16 lg:px-12">
      <NotFoundHero />
    </div>
  );
}
