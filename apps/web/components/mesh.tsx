import React from "react";

export default function MeshEffect() {
  return (
    <div className="blur-xl fixed inset-0 w-dvw h-dvh z-0">
      <div className="absolute inset-x-0 w-full bottom-36 h-22">
        <div className="absolute w-full h-22 translate-y-0 bg-[#D2F3D4] rounded-[50%]" />
        <div className="absolute w-full h-22 translate-y-8 bg-[#0DE146] rounded-[50%]" />
        <div className="absolute w-full h-22 translate-y-16 bg-[#0F9878] rounded-[50%]" />
      </div>
    </div>
  );
}
