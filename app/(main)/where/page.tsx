import React from "react";
import Image from "next/image";

import mapImage from "@/assets/map/map-1.jpg";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function WherePage() {
  return (
    <div className="min-h-dvh flex flex-col">
      <div className="flex flex-1 flex-col items-center px-4">
        <div className="max-w-[800px] md:max-h-[600px] overflow-clip border border-white/20 rounded-3xl mx-auto shadow-lg shadow-black/20">
          <Image
            src={mapImage}
            alt="Map"
            objectFit="cover"
            className="w-full h-full object-cover"
          />
        </div>
        <div className="flex flex-col items-center">
          <h2 className="text-white text-3xl lg:text-4xl font-heading font-semibold text-center mt-8">
            Dove Siamo
          </h2>
          <p className="text-center text-white/80 mt-4 px-4 max-w-[600px] mx-auto">
            Ci trovi a Melilli, in provincia di Siracusa.
            <br />
            Via Pertini, 96010 Melilli SR
          </p>

          <Link
            href={"https://maps.app.goo.gl/WWQoVqCrdZEY8Tj87"}
            target="_blank"
            rel="noopener noreferrer"
            passHref
          >
            <Button
              size={"lg"}
              variant="secondary"
              className="mx-auto mt-8 rounded-full"
            >
              Apri in Google Maps
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
