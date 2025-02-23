import React from "react";
import Image from "next/image";

export const Header = () => {
  return (
    <header className="w-full flex items-center justify-center gap-3 mb-8">
      <Image
        src="/favicon.png"
        alt="Sanjivan Medico Traders Logo"
        width={40}
        height={40}
        className="object-contain"
      />
      <h1 className="text-2xl md:text-3xl font-semibold text-primary">
        Sanjivan Medico Traders
      </h1>
    </header>
  );
};