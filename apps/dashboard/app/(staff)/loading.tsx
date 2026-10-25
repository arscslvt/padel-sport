import { AgendaSkeleton } from "@/app/_components/agenda/agenda";
import { AgendaTitle, TodayLabel } from "@/app/_components/agenda/greeting";
import { PageBody, PageHeader } from "@/app/_components/page-header";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Lo scheletro dell'agenda (page-skeleton.tsx spiega perché c'è).
 *
 * Il titolo è quello vero, saluto compreso: la sequenza del saluto si conta
 * dal suo inizio e non dal montaggio (agenda/greeting.tsx), quindi quando
 * arriva la pagina vera riprende da dov'era invece di ripartire. Accanto, la
 * forma della colonna del meteo da desktop.
 */
export default function Loading() {
  return (
    <div className="flex flex-1 flex-col">
      <PageHeader
        title={<AgendaTitle />}
        clipTitle={false}
        description={<TodayLabel />}
        actions={
          <div className="flex items-center gap-2">
            {[0, 1, 2].map((index) => (
              <Skeleton key={index} className="size-10 rounded-full" />
            ))}
          </div>
        }
      />
      <PageBody className="page-skeleton">
        <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-start lg:gap-8 xl:grid-cols-[minmax(0,1fr)_20rem]">
          <div className="min-w-0">
            <AgendaSkeleton />
          </div>
          <aside className="hidden lg:block">
            <Skeleton className="h-96 w-full rounded-3xl" />
          </aside>
        </div>
      </PageBody>
    </div>
  );
}
