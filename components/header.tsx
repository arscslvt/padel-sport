import React from "react";
import Image from "next/image";

import logo from "@/assets/branding/logo.svg";
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
} from "./ui/navigation-menu";

export default function Header() {
  return (
    <div className="fixed w-dvw top-0 z-50 flex flex-col lg:flex-row justify-center items-center h-32 min-h-22 lg:px-32 pt-6 lg:pt-0">
      <div>
        <Image
          src={logo}
          alt="PadelSport Logo"
          className="h-10 lg:h-12 w-auto"
        />
      </div>
      <div className="flex justify-end flex-1">
        <NavigationMenu orientation="horizontal" viewport={false}>
          <NavigationMenuList className="gap-3">
            <NavigationMenuItem>
              <NavigationMenuLink
                className=" text-white hover:bg-white/20 hover:text-white font-medium lg:px-4 rounded-full cursor-pointer"
                href="/dove"
              >
                Dove trovarci
              </NavigationMenuLink>
            </NavigationMenuItem>
            <NavigationMenuItem>
              <NavigationMenuLink
                className="text-white hover:bg-white/20 hover:text-white font-medium lg:px-4 rounded-full cursor-pointer"
                href="/club"
              >
                Il Club
              </NavigationMenuLink>
            </NavigationMenuItem>

            <NavigationMenuItem>
              <NavigationMenuLink
                className="text-white hover:bg-white/20 hover:text-white font-medium lg:px-4 rounded-full cursor-pointer"
                href="/eventi"
              >
                Tornei ed Eventi
              </NavigationMenuLink>
            </NavigationMenuItem>
          </NavigationMenuList>
        </NavigationMenu>
      </div>
    </div>
  );
}
