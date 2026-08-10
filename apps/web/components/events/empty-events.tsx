import {
  ArrowUpRightIcon,
  Calendar1Icon,
  ChevronLeft,
  SearchX,
} from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { getInfo } from "@/lib/info";

export const EmptyEventsPage = () => (
  <Empty className="text-foreground">
    <EmptyHeader>
      <EmptyMedia variant="icon">
        <Calendar1Icon />
      </EmptyMedia>
      <EmptyTitle>Nessun evento in programma</EmptyTitle>
      <EmptyDescription className="text-muted-foreground">
        Al momento non ci sono eventi o tornei programmati. Torna presto per
        scoprire le ultime novità!
      </EmptyDescription>
    </EmptyHeader>
    <EmptyContent>
      <div className="flex gap-2">
        <Link href={"/"}>
          <Button variant="outline">
            <ChevronLeft /> Torna alla Home
          </Button>
        </Link>
      </div>
    </EmptyContent>
    <Button variant="link" asChild className="text-muted-foreground" size="sm">
      <a
        href={getInfo("instagramUrl")}
        target="_blank"
        className="text-foreground"
      >
        Seguici su Instagram <ArrowUpRightIcon />
      </a>
    </Button>
  </Empty>
);

export const EmptySearchResults = ({
  query,
  onReset,
}: {
  query: string;
  onReset: () => void;
}) => (
  <Empty className="text-foreground">
    <EmptyHeader>
      <EmptyMedia variant="icon">
        <SearchX />
      </EmptyMedia>
      <EmptyTitle>Nessun risultato per «{query}»</EmptyTitle>
      <EmptyDescription className="text-muted-foreground">
        Prova con un altro termine, oppure sfoglia tutti gli articoli.
      </EmptyDescription>
    </EmptyHeader>
    <EmptyContent>
      <Button variant="outline" onClick={onReset}>
        Azzera la ricerca
      </Button>
    </EmptyContent>
  </Empty>
);
