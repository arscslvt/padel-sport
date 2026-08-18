import QRCode from "qrcode";

import { bookingUrl } from "@/lib/booking-links";

/**
 * QR della prenotazione, in un posto solo: lo serve la route
 * `/api/bookings/[code]/qr` e lo allega la mail di conferma.
 *
 * Dentro ci finisce l'indirizzo della pagina pubblica, non il codice nudo:
 * chi lo inquadra con la fotocamera si aspetta di arrivare da qualche parte, e
 * allo staff basta comunque leggere il codice scritto sotto.
 */

/** PNG del QR, in bianco e nero come il resto del sistema. */
export function bookingQrPng(code: string): Promise<Buffer> {
  return QRCode.toBuffer(bookingUrl(code), {
    type: "png",
    width: 512,
    margin: 1,
    color: { dark: "#0a0a0aff", light: "#ffffffff" },
  });
}
