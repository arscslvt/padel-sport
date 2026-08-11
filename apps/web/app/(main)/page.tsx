import { Suspense } from "react";

import { FeatureCards } from "@/components/landing/feature-cards";
import { FindPlayersSection } from "@/components/landing/find-players-section";
import { Hero } from "@/components/landing/hero";
import { SupportSection } from "@/components/landing/support-section";
import { UpcomingEventsSection } from "@/components/landing/upcoming-events-section";
import { TrackHomePageView } from "@/providers/amplitude.provider";

export const revalidate = 300;

export default function Home() {
  return (
    <>
      <TrackHomePageView />
      <Hero />
      <FeatureCards />
      <FindPlayersSection />
      {/* In Suspense: la latenza di Sanity non deve ritardare l'LCP dell'hero. */}
      <Suspense fallback={null}>
        <UpcomingEventsSection />
      </Suspense>
      <SupportSection />
    </>
  );
}
