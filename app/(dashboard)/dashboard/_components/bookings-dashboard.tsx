"use client";

import { useAction, useMutation, useQuery } from "convex/react";
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
  Users,
  UsersRound,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/app/(dashboard)/_components/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/app/(dashboard)/_components/tabs";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FaWhatsapp } from "react-icons/fa";
import { Input } from "../../_components/input";
import { AnimatePresence, motion } from "motion/react";
import { Checkbox } from "@/components/ui/checkbox";
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

function BookingCard({
  booking,
  isUpdating,
  onAccept,
}: {
  booking: Booking;
  isUpdating: boolean;
  onAccept: (
    bookingId: Id<"bookings">,
    withNotification: boolean,
  ) => Promise<void>;
}) {
  const totalAmount = booking.pricePerPlayer * booking.players.length;
  const deleteBooking = useMutation(api.bookings.delete.default);

  const [withNotification, setWithNotification] = useState(true);

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
                deleteBooking({ bookingId: booking._id }).then(() => {
                  toast.dismiss();
                  toast.success("Prenotazione cancellata", {
                    description: (
                      <>
                        <span className="font-semibold">
                          {booking.bookedBy}
                        </span>{" "}
                        è stato avvisato della cancellazione della prenotazione.
                      </>
                    ),
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
    <article className="rounded-lg border bg-muted/20 p-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:justify-between">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold">{booking.bookedBy}</h3>
            <BookingStatusBadge status={booking.status} />
            <Badge variant="outline">{levelLabels[booking.level]}</Badge>
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
  const bookings = useQuery(api.bookings.list.default, {
    includePast: false,
  });
  const acceptBooking = useMutation(api.bookings.update.accept);
  const [updatingId, setUpdatingId] = useState<Id<"bookings"> | null>(null);

  const [showSearch, setShowSearch] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

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

  const nextBooking = acceptedBookings?.[0] ?? null;

  const handleAccept = async (
    bookingId: Id<"bookings">,
    withNotification: boolean,
  ) => {
    try {
      setUpdatingId(bookingId);
      await acceptBooking({ bookingId, withNotification });
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
                {nextBooking.bookForAll ? (
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
              {nextBooking && !nextBooking?.bookForAll && (
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

      <Tabs defaultValue="pending" className="space-y-3">
        <div>
          <TabsList className="w-full md:w-max">
            <TabsTrigger value="pending">
              In attesa ({pendingBookings.length})
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
                  isUpdating={updatingId === booking._id}
                  onAccept={handleAccept}
                />
              ))}
            </div>
          )}
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
                  isUpdating={updatingId === booking._id}
                  onAccept={handleAccept}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </>
  );
}
