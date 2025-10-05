const info: { [key: string]: string } = {
  name: "A.S.D. PadelSport Melilli",
  address: "Via Pertini, 96010 Melilli (SR) — Italia",
  email: "segreteria@asdpadelsport.com",
  cf: "93119030893",

  instagramUrl: "https://www.instagram.com/padelsportmelilli/",
  facebookUrl: "https://www.facebook.com/padelsportmelilli/",
};

type InfoKey = keyof typeof info;

export function getInfo(key: InfoKey): string | undefined {
  return info[key];
}
