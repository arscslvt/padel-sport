/**
 * Indirizzi pubblici di una prenotazione.
 *
 * Vivono separati da `booking-qr.ts` perché quello importa la libreria che
 * disegna il QR — roba da server — mentre questi servono anche al browser, che
 * compone il link al calendario.
 */
/**
 * Il dominio canonico è quello nudo: in produzione `www` risponde 301 e manda
 * qui. Conta perché questi indirizzi finiscono dentro un QR e dentro il `src`
 * di un'immagine nelle mail, dove un salto in più è un modo in più di
 * rompersi — ed è lo stesso host che il template WhatsApp usa per il pulsante.
 */
export const SITE_URL = "https://asdpadelsport.com";

export const bookingPath = (code: string) => `/booking/${code}`;

export const bookingUrl = (code: string) => `${SITE_URL}${bookingPath(code)}`;

export const bookingIcsPath = (code: string) => `${bookingPath(code)}/ics`;

export function bookingQrPngUrl(code: string) {
  return `${SITE_URL}/api/bookings/${code}/qr`;
}
