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
import { ArrowUpRightIcon, Calendar1Icon, ChevronLeft } from "lucide-react";
import Link from "next/link";
import React from "react";

export default function page() {
  return (
    <div className="min-h-dvh grid place-content-center text-white">
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Calendar1Icon />
          </EmptyMedia>
          <EmptyTitle>Pagina degli eventi in arrivo</EmptyTitle>
          <EmptyDescription className="text-white/80">
            Stiamo lavorando per offrirti una fantastica esperienza di tornei ed
            eventi. Resta sintonizzato!
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
        <Button
          variant="link"
          asChild
          className="text-muted-foreground"
          size="sm"
        >
          <a
            href={getInfo("instagramUrl")}
            target="_blank"
            className="text-white"
          >
            Seguici su Instagram <ArrowUpRightIcon />
          </a>
        </Button>
      </Empty>
    </div>
  );
}
