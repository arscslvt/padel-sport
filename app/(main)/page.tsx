import Image from "next/image";

import HeroVideo from "@/components/hero-video";
import { Button } from "@/components/ui/button";

import stickerLightning from "@/assets/stickers/lightning.png";
import stickerPadelBall from "@/assets/stickers/padel-ball.png";

import { ArrowRight, PhoneCall } from "lucide-react";
import { getInfo } from "@/lib/info";

export default function Home() {
  return (
    <div>
      <div className="bg-linear-to-t from-emerald-900 to-background">
        <div className="relative flex flex-col lg:flex-row items-end md:items-center lg:justify-center h-dvh gap-22 md:gap-14 lg:w-4/5 lg:mx-auto">
          <div className="absolute bottom-0 inset-x-0 lg:relative items-center lg:items-start z-10 flex-1 text-white flex flex-col gap-8 px-4 pb-6 bg-linear-to-t md:bg-none from-emerald-900 from-50% to-transparent lg:pb-6">
            <div className="flex flex-col items-center lg:items-start gap-2">
              <h1 className="text-[22px] md:text-4xl lg:text-4xl leading-10 font-heading font-bold max-w-145 text-center lg:text-left">
                Mettersi in gioco non è mai stato così bello
              </h1>
              <h4 className="md:text-[18px] lg:text-lg text-white/80 text-center lg:text-left">
                Dal principiante al pro: da noi trovi avversari, community e
                tanto divertimento.
              </h4>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full md:w-max">
              <a href={getInfo("bookingUrl")} className="flex w-full">
                <Button
                  size={"lg"}
                  className="w-full md:w-max h-14 px-8 rounded-t-4xl rounded-b-sm sm:rounded-l-4xl sm:rounded-r-md bg-emerald-400 hover:bg-emerald-500 text-emerald-950 font-heading"
                >
                  Prenota il tuo campo
                </Button>
              </a>
              <a
                href={`tel:${getInfo("cell")}`}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Chiama PadelSport Melilli"
                className="flex w-full"
              >
                <Button
                  size={"lg"}
                  className="w-full md:w-max h-12 sm:h-14 px-6! rounded-b-4xl rounded-t-sm  sm:rounded-r-4xl sm:rounded-l-md bg-emerald-100 hover:bg-emerald-200 text-emerald-950 font-heading"
                >
                  <PhoneCall />
                  Chiamaci
                </Button>
              </a>
            </div>
          </div>

          <div className="flex md:flex-1 justify-center md:pt-6 lg:pt-8 max-h-dvh z-0">
            <div className="relative h-full w-dvw md:w-max pointer-events-none select-none">
              <Image
                src={stickerPadelBall}
                alt="Sticker Ball Sticker"
                className="hidden md:block absolute top-28 -left-10 lg:-left-14 size-32 lg:size-28 z-10 -rotate-12 scale-x-[-1]"
              />
              <Image
                src={stickerLightning}
                alt="Sticker Lightning Sticker"
                className="hidden md:block absolute bottom-64 lg:bottom-58 -right-12 lg:-right-14 size-32 lg:size-28 z-10 rotate-6"
              />
              <HeroVideo
                autoPlay
                loop
                muted
                playsInline
                className="relative z-0 h-full w-full md:w-138 lg:w-108 rounded-t-xl md:rounded-t-3xl object-cover -translate-y-4 md:translate-y-0"
                preload="auto"
                controls={false}
              />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 hidden md:block h-44 lg:h-52 bg-linear-to-t from-emerald-900 via-emerald-900/80 to-transparent" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
