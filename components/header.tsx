import React from "react";
import Image from "next/image";
import { SMTLogo } from "./icons";

export const Header = () => {
  return (
    <header className="w-full flex items-center justify-center gap-3 mb-8">
      <SMTLogo
        className="h-[4.2rem] w-[4.2rem]"
      />
      <h1 className="text-3xl md:text-4xl font-bold text-primary">
        Sanjivan Medico Traders
      </h1>
    </header>
  );
};