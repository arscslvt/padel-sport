const info: { [key: string]: string } = {
  name: "A.S.D. Padel Sport Melilli",
  address: "Via Pertini, 96010 Melilli (SR) — Italia",
  legalAddress: "Ronco Ernani 2, 96010 Melilli (SR) — Italia",
  email: "segreteria@asdpadelsport.com",
  cf: "93119030893",
  piva: "02198040897",
  cell: "+39 320 175 5897",
  whatsapp: "+39 320 175 5897",

  instagramUrl: "https://www.instagram.com/padelsportmelilli/",
  facebookUrl: "https://www.facebook.com/padelsportmelilli/",
  bookingUrl: "/book",
};

type InfoKey = keyof typeof info;

export function getInfo(key: InfoKey): string | undefined {
  return info[key];
}
