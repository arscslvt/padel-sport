import React from "react";
import Image from "next/image";

import HeroVideo from "@/components/hero-video";
import { Button } from "@/components/ui/button";

import stickerLightning from "@/assets/stickers/lightning.png";
import stickerPadelBall from "@/assets/stickers/padel-ball.png";
import Link from "next/link";

export default function Home() {
  return (
    <div>
      <div className="bg-gradient-to-t from-emerald-900 to-background">
        <div className="flex items-end justify-center overflow-hidden h-dvh lg:h-[calc(100vh-6rem)] lg:mt-[6rem] gap-22">
          <div className="relative items-center z-10 flex-1 text-white flex flex-col gap-8 px-4 pb-8 bg-gradient-to-t from-emerald-900 from-50% to-transparent lg:pb-6">
            <div className="flex flex-col items-center gap-2">
              <h1 className="text-[28px] lg:text-4xl leading-10 font-heading font-semibold max-w-[580px] text-center">
                Mettersi in gioco non è mai stato così bello
              </h1>
              <h4 className="lg:text-lg text-white/80 text-center">
                Dal principiante al pro: da noi trovi avversari, tornei e tanto
                divertimento.
              </h4>
            </div>

            <div>
              <Link href={"https://links.asdpadelsport.com/prenota"}>
                <Button
                  size={"lg"}
                  className="h-14 px-8 rounded-full bg-emerald-400 hover:bg-emerald-500 text-emerald-950 font-heading"
                >
                  Prenota il tuo campo
                </Button>
              </Link>
            </div>
          </div>

          <div className="absolute inset-0 md:pt-16 flex justify-center w-dvw h-dvh lg:h-full lg:w-auto z-0">
            <div className="relative w-auto h-full pointer-events-none select-none">
              <Image
                src={stickerPadelBall}
                alt="Sticker Ball Sticker"
                className="absolute top-32 -left-10 lg:-left-14 size-32 lg:size-28 z-10 -rotate-12 scale-x-[-1]"
              />
              <Image
                src={stickerLightning}
                alt="Sticker Ball Sticker"
                className="absolute bottom-72 lg:bottom-48 -right-12 lg:-right-14 size-32 lg:size-28 z-10 rotate-[6deg]"
              />
              <HeroVideo
                autoPlay
                loop
                muted
                playsInline
                className="relative z-0 h-full w-dvw md:w-auto rounded-none md:rounded-t-3xl object-cover"
                preload="auto"
                controls={false}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
