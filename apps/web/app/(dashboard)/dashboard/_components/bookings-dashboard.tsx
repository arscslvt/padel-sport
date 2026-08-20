"use client";

import { api } from "@padel-sport/backend/convex/_generated/api";
import type { Doc, Id } from "@padel-sport/backend/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  ChevronUp,
  Clock3,
  EllipsisIcon,
  Phone,
  Search,
  ShieldCheck,
  Trash,
  Unlink,
  Users,
  UsersRound,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FaWhatsapp } from "react-icons/fa";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/app/(dashboard)/_components/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/app/(dashboard)/_components/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { mergeablePairs, mergedPartnerOf } from "@/lib/booking-merge";
import { cn } from "@/lib/utils";
import { Input } from "../../_components/input";
import MergePairs from "./merge-pairs";

// import { minimal, organic } from "@/.web-kits";
// import { usePatch } from "@web-kits/audio/react";

type Booking = Doc<"bookings">;

const levelLabels: Record<Booking["level"], string> = {
  principiante: "Principiante",
  intermedio: "Intermedio",
  avanzato: "Avanzato",
};

const statusLabels: Record<Booking["status"], string> = {
  pending_on_site_payment: "In attesa",
  accepted_on_site_payment: "Accettata",
  cancelled: "Cancellata",
};

function formatBookingDate(timestamp: number) {
  return format(timestamp, "EEEE d MMMM, HH:mm", { locale: it });
}

function BookingStatusBadge({ status }: { status: Booking["status"] }) {
  return (
    <Badge
      variant={"default"}
      className={cn(
        status === "accepted_on_site_payment"
          ? "bg-green-50 text-green-900 border-green-200"
          : status === "cancelled"
            ? "bg-red-50 text-red-900 border-red-200"
            : "bg-amber-50 text-amber-900 border-amber-200",
      )}
    >
      {statusLabels[status]}
    </Badge>
  );
}

function DashboardSkeleton() {
  const statSkeletons = ["stat-a", "stat-b", "stat-c"] as const;
  const listSkeletons = ["row-a", "row-b", "row-c"] as const;

  return (
    <div className="space-y-6 px-4">
      <div className="grid gap-4 md:grid-cols-3">
        {statSkeletons.map((item) => (
          <Card key={item}>
            <CardHeader className="gap-3">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-16" />
            </CardHeader>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72" />
        </CardHeader>
        <CardContent className="space-y-3">
          {listSkeletons.map((item) => (
            <Skeleton key={item} className="h-28 w-full rounded-lg" />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * I tre elenchi della pagina. Il nome è quello che viaggia in `?tab=`, ed è lo
 * stesso che `utils/staffLinks` scrive nei link delle notifiche.
 */
const BOOKINGS_TABS = ["pending", "merge", "all"] as const;
type BookingsTab = (typeof BOOKINGS_TABS)[number];

const isBookingsTab = (value: string | null): value is BookingsTab =>
  value !== null && BOOKINGS_TABS.includes(value as BookingsTab);

/** L'ancora nel DOM della singola prenotazione, per lo scroll dai link. */
const bookingAnchor = (bookingId: string) => `booking-${bookingId}`;

function BookingCard({
  booking,
  partner,
  highlighted,
  isUpdating,
  onAccept,
  onChanged,
}: {
  booking: Booking;
  /** L'altro gruppo, quando la struttura ha unito due prenotazioni parziali. */
  partner?: Booking;
  /** È quella indicata dal link della notifica: va trovata a colpo d'occhio. */
  highlighted?: boolean;
  isUpdating: boolean;
  onAccept: (
    bookingId: Id<"bookings">,
    withNotification: boolean,
  ) => Promise<void>;
  /** Ricarica l'agenda: senza reattività, l'elenco va richiesto di nuovo. */
  onChanged: () => void;
}) {
  const totalAmount = booking.pricePerPlayer * booking.players.length;

  const [withNotification, setWithNotification] = useState(true);

  /**
   * Annullare è un atto della struttura: passa dalla route che verifica la
   * sessione staff, non da una mutation che il browser potrebbe chiamare da
   * solo (app/api/dashboard/bookings).
   */
  const deleteBooking = async () => {
    const response = await fetch("/api/dashboard/bookings", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookingId: booking._id }),
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      throw new Error(payload?.error ?? "Non riesco ad annullare.");
    }

    onChanged();
  };
  const [splitting, setSplitting] = useState(false);

  /** Rimette i due gruppi su due campi distinti, se ce n'è uno libero. */
  const handleSplit = async () => {
    setSplitting(true);
    try {
      const response = await fetch("/api/dashboard/bookings/merge", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId: booking._id }),
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        toast.error("Campi non separati", {
          description: payload?.error ?? "Riprova fra poco.",
        });
        return;
      }

      toast.success("Campi separati", {
        description: payload?.court
          ? `La seconda prenotazione è passata su ${payload.court}.`
          : "Le due prenotazioni tornano su campi distinti.",
      });
    } catch {
      toast.error("Campi non separati", {
        description: "Controlla la connessione e riprova.",
      });
    } finally {
      setSplitting(false);
    }
  };

  const handleBooking = async () => {
    toast.dismiss();
    toast.promise(onAccept(booking._id, withNotification), {
      loading: "Accettando prenotazione...",
      description(data) {
        if (data instanceof Error) {
          return (
            data.message || "Non sono riuscito ad accettare la prenotazione."
          );
        }
        return "Il cliente vedrà ora la prenotazione come confermata e pagherà in struttura al suo arrivo.";
      },
      success: "Prenotazione accettata",
      error: "Non sono riuscito ad accettare la prenotazione.",
    });
  };

  const handleConfirmBooking = async () => {
    // minimal.click();
    toast("Conferma della prenotazione", {
      description: (
        <>
          Vuoi accettare la prenotazione di{" "}
          <span className="font-medium">{booking.bookedBy}</span> e confermare
          che pagherà in struttura?
          <div className="py-2">
            <div className="flex items-center gap-1.5">
              <Checkbox
                id="with-notification"
                checked={withNotification}
                onCheckedChange={(checked) => setWithNotification(!!checked)}
              />
              <Label htmlFor="with-notification">
                Invia conferma via WhatsApp al cliente
              </Label>
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            <Button
              variant="outline"
              className="flex-1 bg-transparent"
              onClick={() => toast.dismiss()}
            >
              Annulla
            </Button>
            <Button
              onClick={() => handleBooking()}
              disabled={isUpdating}
              className="flex-1"
            >
              <ShieldCheck className="size-4" />
              Conferma prenotazione
            </Button>
          </div>
        </>
      ),
      duration: Infinity,
    });
  };

  const handleDeleteBooking = async () => {
    toast("Stai cancellando una prenotazione", {
      description: (
        <>
          Sei sicuro di voler cancellare la prenotazione di{" "}
          <span className="font-semibold text-foreground whitespace-nowrap">
            {booking.bookedBy}
          </span>
          ?
          <div className="mt-2 text-amber-600">
            Questa azione non è reversibile.
          </div>
          <div className="mt-3 flex gap-2">
            <Button
              variant="outline"
              className="flex-1 bg-transparent"
              onClick={() => toast.dismiss()}
            >
              Annulla
            </Button>
            <Button
              onClick={() =>
                deleteBooking()
                  .then(() => {
                    toast.dismiss();
                    toast.success("Prenotazione cancellata", {
                      description: (
                        <>
                          <span className="font-semibold">
                            {booking.bookedBy}
                          </span>{" "}
                          è stato avvisato della cancellazione della
                          prenotazione.
                        </>
                      ),
                    });
                  })
                  .catch((error: Error) => {
                    toast.dismiss();
                    toast.error("Prenotazione non cancellata", {
                      description: error.message,
                    });
                  })
              }
              variant="destructive"
              className="flex-1"
            >
              <Trash className="size-4" />
              Cancella prenotazione
            </Button>
          </div>
        </>
      ),
      duration: Infinity,
    });
  };

  type ContactMethod = "phone" | "whatsapp";
  const callBookingPhone = (method: ContactMethod) => {
    if (!booking.phone) {
      toast.error("Numero di telefono non disponibile");
      return;
    }
    if (method === "phone") {
      window.open(`tel:${booking.phone}`, "_blank");
    } else if (method === "whatsapp") {
      window.open(`https://wa.me/${booking.phone}`, "_blank");
    }
  };

  return (
    <article
      id={bookingAnchor(booking._id)}
      className={cn(
        "scroll-mt-20 rounded-lg border bg-muted/20 p-4 transition-shadow",
        highlighted && "ring-2 ring-primary ring-offset-2",
      )}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:justify-between">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold">{booking.bookedBy}</h3>
            <BookingStatusBadge status={booking.status} />
            <Badge variant="outline">{levelLabels[booking.level]}</Badge>
            {booking.mergedWith && (
              <Badge className="border-blue-200 bg-blue-50 text-blue-900">
                <Users className="size-3.5" />
                Campo condiviso
                {partner ? ` con ${partner.bookedBy}` : ""}
              </Badge>
            )}
          </div>

          <div className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
            <div className="flex items-center gap-2">
              <CalendarDays className="size-4" />
              <span className="capitalize">
                {formatBookingDate(booking.bookingDate)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="size-4" />
              <span>{booking.phone || "Numero non disponibile"}</span>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    size={"icon"}
                    variant={"outline"}
                    className="bg-white rounded-full size-6"
                  >
                    <EllipsisIcon className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuGroup>
                    <DropdownMenuLabel>Contatta</DropdownMenuLabel>
                    <DropdownMenuItem
                      onSelect={() => callBookingPhone("phone")}
                      disabled={!booking.phone}
                    >
                      <Phone className="size-4" />
                      <span>Chiama</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onSelect={() => callBookingPhone("whatsapp")}
                      disabled={!booking.phone}
                    >
                      <FaWhatsapp className="size-4" />
                      <span>WhatsApp</span>
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                  {booking.mergedWith && (
                    <DropdownMenuGroup>
                      <DropdownMenuLabel>Campo condiviso</DropdownMenuLabel>
                      <DropdownMenuItem
                        onSelect={() => void handleSplit()}
                        disabled={splitting}
                      >
                        <Unlink className="size-4" />
                        <span>Separa le prenotazioni</span>
                      </DropdownMenuItem>
                    </DropdownMenuGroup>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <div className="flex items-center gap-2">
              <UsersRound className="size-4" />
              <span>
                {booking.players.length} giocatori, {totalAmount} EUR totali
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Clock3 className="size-4" />
              <span>
                Inserita il{" "}
                {format(booking.createdAt, "d MMM yyyy, HH:mm", { locale: it })}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Clock3 className="size-4" />
              <span>
                {" "}
                {format(booking.createdAt, "d MMM yyyy, HH:mm", { locale: it })}
              </span>
            </div>
          </div>

          <div className="space-y-1.5 pt-2">
            <div>
              <Label className="gap-1">
                <Users className="size-3.5" strokeWidth={2.7} /> Giocatori
              </Label>
            </div>
            <div className="flex flex-wrap gap-2">
              {booking.players.map((player) => (
                <Badge
                  key={player}
                  variant="outline"
                  className="font-normal bg-white"
                >
                  {player}
                </Badge>
              ))}
            </div>
          </div>
        </div>

        <div className="flex min-w-0 flex-col md:items-end md:justify-end gap-2">
          <div className="text-sm">
            <div className="font-medium">Pagamento</div>
            <div className="text-muted-foreground">In struttura</div>
          </div>
          {booking.status === "pending_on_site_payment" ? (
            <div className="flex gap-2">
              <Button
                variant={"outline"}
                className="bg-red-50 border-destructive/20 text-destructive"
                onClick={handleDeleteBooking}
              >
                <X />
                Cancella
              </Button>
              <Button
                onClick={handleConfirmBooking}
                disabled={isUpdating}
                className="flex-1"
              >
                <ShieldCheck className="size-4" />
                Conferma prenotazione
              </Button>
            </div>
          ) : booking.status === "cancelled" ? (
            <div className="flex gap-2">
              <Button
                disabled
                variant="outline"
                className="flex-1 bg-muted text-muted-foreground opacity-100!"
              >
                <X className="size-4" />
                Prenotazione cancellata
              </Button>
            </div>
          ) : (
            <div className="flex gap-2">
              <Button
                disabled
                variant="outline"
                className="flex-1 bg-muted text-muted-foreground opacity-100!"
              >
                <CheckCircle2 className="size-4" />
                Già accettata
              </Button>
              <Button
                variant={"outline"}
                className="bg-red-50 border-destructive/20 text-destructive"
                onClick={handleDeleteBooking}
              >
                <Trash />
              </Button>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

export default function BookingsDashboard() {
  /**
   * L'agenda arriva da una route, non da `useQuery`: contiene nomi e telefoni
   * dei clienti, e il deployment Convex ha un URL pubblico. Si perde
   * l'aggiornamento in tempo reale — l'elenco si ricarica dopo ogni azione —
   * che per un'agenda è un prezzo basso.
   */
  const [bookings, setBookings] = useState<Booking[] | undefined>(undefined);

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/dashboard/bookings");
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        toast.error("Prenotazioni non caricate", {
          description: payload?.error ?? "Riprova fra poco.",
        });
        setBookings([]);
        return;
      }

      setBookings(payload.bookings ?? []);
    } catch {
      toast.error("Prenotazioni non caricate", {
        description: "Controlla la connessione e riprova.",
      });
      setBookings([]);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // I nomi dei campi servono a dire *quale* si libera unendo due prenotazioni.
  const courts = useQuery(api.modules.settings.booking.courts, {});
  const [updatingId, setUpdatingId] = useState<Id<"bookings"> | null>(null);

  const [showSearch, setShowSearch] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  /**
   * `?tab=` e `?booking=` sono l'atterraggio delle notifiche: la prima sceglie
   * l'elenco, la seconda la scheda da mettere in evidenza. Restano nell'URL,
   * così il link si può anche girare a un collega.
   */
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<BookingsTab>(() => {
    const requested = searchParams.get("tab");
    return isBookingsTab(requested) ? requested : "pending";
  });
  const highlightedId = searchParams.get("booking");

  const pendingBookings = useMemo(
    () =>
      (bookings ?? []).filter(
        (booking) => booking.status === "pending_on_site_payment",
      ),
    [bookings],
  );

  const acceptedBookings = useMemo(
    () =>
      (bookings ?? []).filter(
        (booking) => booking.status === "accepted_on_site_payment",
      ),
    [bookings],
  );

  // Le coppie che chiuderebbero un campo: due gruppi parziali alla stessa ora.
  const pairs = useMemo(() => mergeablePairs(bookings ?? []), [bookings]);

  /**
   * La prenotazione indicata dal link può non stare nell'elenco che il link
   * chiedeva — una in attesa nel frattempo accettata, per dirne una. Se non è
   * nell'elenco aperto si passa a «Tutte», dove c'è di sicuro: meglio spostare
   * il tab che mostrare una pagina che sembra aver perso la prenotazione.
   *
   * Lo scroll si fa una volta sola: dopo, la pagina è di chi la sta usando.
   */
  const scrolledTo = useRef<string | null>(null);

  useEffect(() => {
    if (!highlightedId || !bookings) return;
    if (scrolledTo.current === highlightedId) return;
    if (!bookings.some((booking) => booking._id === highlightedId)) return;

    const card = document.getElementById(bookingAnchor(highlightedId));

    if (!card) {
      if (tab !== "all") setTab("all");
      return;
    }

    scrolledTo.current = highlightedId;
    card.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [highlightedId, bookings, tab]);

  const nextBooking = acceptedBookings?.[0] ?? null;

  const handleAccept = async (
    bookingId: Id<"bookings">,
    withNotification: boolean,
  ) => {
    try {
      setUpdatingId(bookingId);

      const response = await fetch("/api/dashboard/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId, withNotification }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error ?? "Non riesco ad accettare.");
      }

      await load();
    } catch (error) {
      toast.error("Operazione non completata", {
        description:
          error instanceof Error
            ? error.message
            : "Non sono riuscito ad aggiornare la prenotazione.",
      });
    } finally {
      setUpdatingId(null);
    }
  };

  if (bookings === undefined) {
    return <DashboardSkeleton />;
  }

  return (
    <>
      <section className="grid gap-4 grid-cols-[1fr_1fr] lg:grid-cols-[1.3fr_1fr_1fr]">
        <Card className="col-span-2 lg:col-span-1">
          <CardHeader>
            <CardDescription>Prossima prenotazione</CardDescription>
            <CardTitle className="text-xl">
              {nextBooking ? (
                <>
                  <span className="text-blue-600">{nextBooking.bookedBy}</span>{" "}
                  ha prenotato per {formatBookingDate(nextBooking.bookingDate)}
                </>
              ) : (
                "Nessuna prenotazione in agenda"
              )}
            </CardTitle>
          </CardHeader>
          {nextBooking && (
            <CardContent className="text-sm text-muted-foreground">
              <div className="font-medium text-foreground flex flex-wrap gap-2">
                {nextBooking.mergedWith ? (
                  <Badge className="border-blue-200 bg-blue-50 text-blue-900">
                    <Users className="size-4" /> Campo condiviso
                  </Badge>
                ) : nextBooking.bookForAll ? (
                  <Badge variant={"outline"} className="bg-amber-50">
                    Prenotazione completa
                  </Badge>
                ) : (
                  <Badge
                    variant={"outline"}
                    className="bg-amber-50 border-amber-200 text-amber-900"
                  >
                    <AlertCircle className="size-4" /> Prenotazione parziale
                  </Badge>
                )}
                <Badge variant={"secondary"}>
                  per {nextBooking.players.length} giocatori
                </Badge>
              </div>
              {/* Il campo già completato non ha più bisogno dell'avviso: i
                  giocatori mancanti li ha trovati l'unione. */}
              {!nextBooking.bookForAll && !nextBooking.mergedWith && (
                <div className="mt-2 bg-amber-50 border border-amber-200 rounded-md p-2 text-xs text-amber-800/90">
                  Il cliente non ha prenotato per tutti i giocatori, assicurati
                  di trovare altri clienti interessati a giocare in quello slot
                  o contatta il cliente per proporgli di prenotare per tutti e 4
                  i giocatori.
                </div>
              )}
            </CardContent>
          )}
        </Card>

        <Card
          className={cn(
            pendingBookings.length && "border-amber-300 bg-amber-50",
          )}
        >
          <CardHeader>
            <CardDescription>
              <span
                className={cn(
                  "flex items-center gap-1",
                  !!pendingBookings.length && "text-amber-600 font-medium",
                )}
              >
                {!!pendingBookings.length && <AlertCircle className="size-4" />}
                Da confermare{" "}
              </span>
            </CardDescription>
            <CardTitle className="text-3xl">{pendingBookings.length}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Richieste in attesa di accettazione dallo staff.
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription>Confermate</CardDescription>
            <CardTitle className="text-3xl">
              {acceptedBookings.length}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Prenotazioni future gia validate nella dashboard.
          </CardContent>
        </Card>
      </section>

      <Tabs
        value={tab}
        onValueChange={(value) => isBookingsTab(value) && setTab(value)}
        className="space-y-3"
      >
        <div>
          <TabsList className="w-full md:w-max">
            <TabsTrigger value="pending">
              In attesa ({pendingBookings.length})
            </TabsTrigger>
            <TabsTrigger value="merge">
              Da completare ({pairs.length})
            </TabsTrigger>
            <TabsTrigger value="all">Tutte ({bookings.length})</TabsTrigger>
            <Button
              variant={"ghost"}
              onClick={() => setShowSearch(!showSearch)}
            >
              {showSearch ? <ChevronUp /> : <Search />}
            </Button>
          </TabsList>
          <AnimatePresence>
            {showSearch && (
              <motion.div
                initial={{
                  opacity: 0,
                  height: 0,
                  marginTop: 0,
                  filter: "blur(4px)",
                }}
                animate={{
                  opacity: 1,
                  height: "auto",
                  marginTop: 8,
                  filter: "blur(0px)",
                }}
                exit={{
                  opacity: 0,
                  height: 0,
                  marginTop: 0,
                  filter: "blur(4px)",
                }}
                className="overflow-visible"
                transition={{ duration: 0.3 }}
              >
                <Input
                  placeholder="Cerca prenotazioni..."
                  className="h-9 bg-white"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <TabsContent value="pending">
          <div className="mb-4">
            <h4 className="text-lg font-medium">In attesa di conferma</h4>
            <p className="text-sm text-muted-foreground">
              Accettando una prenotazione, confermi che il cliente paghera in
              struttura al suo arrivo.
            </p>
          </div>
          {pendingBookings.length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <CheckCircle2 className="size-5" />
                </EmptyMedia>
                <EmptyTitle>Nessuna richiesta in attesa</EmptyTitle>
                <EmptyDescription>
                  Le nuove prenotazioni compariranno qui appena arrivate.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <div className="space-y-3">
              {pendingBookings.map((booking) => (
                <BookingCard
                  key={booking._id}
                  booking={booking}
                  partner={mergedPartnerOf(booking, bookings)}
                  highlighted={booking._id === highlightedId}
                  isUpdating={updatingId === booking._id}
                  onAccept={handleAccept}
                  onChanged={() => void load()}
                />
              ))}
            </div>
          )}
        </TabsContent>
        <TabsContent value="merge">
          <div className="mb-4">
            <h4 className="text-lg font-medium">Campi da completare</h4>
            <p className="text-sm text-muted-foreground">
              Chi prenota può farlo anche senza essere in quattro: qui trovi due
              gruppi della stessa ora che insieme riempiono un campo, e unendoli
              l'altro torna prenotabile. In cima quelli dello stesso livello.
            </p>
          </div>
          <MergePairs
            onMerged={() => void load()}
            bookings={bookings}
            courts={(courts ?? []).map((court) => ({
              id: court.id,
              name: court.name,
            }))}
          />
        </TabsContent>
        <TabsContent value="all">
          <div className="mb-4">
            <h4 className="text-lg font-medium">
              Tutte le prenotazioni future
            </h4>
            <p className="text-sm text-muted-foreground">
              Vista completa degli slot prenotati con stato e dettagli di
              contatto.
            </p>
          </div>
          {bookings.length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <CalendarDays className="size-5" />
                </EmptyMedia>
                <EmptyTitle>Agenda vuota</EmptyTitle>
                <EmptyDescription>
                  Non sono presenti prenotazioni future da mostrare.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <div className="space-y-3">
              {bookings.map((booking) => (
                <BookingCard
                  key={booking._id}
                  booking={booking}
                  partner={mergedPartnerOf(booking, bookings)}
                  highlighted={booking._id === highlightedId}
                  isUpdating={updatingId === booking._id}
                  onAccept={handleAccept}
                  onChanged={() => void load()}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </>
  );
}
