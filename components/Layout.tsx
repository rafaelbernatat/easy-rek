"use client";

import React from "react";

export const Layout: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  return (
    <div className="flex-1 bg-slate-100 flex items-center justify-center relative overflow-hidden">
      {/* Background Pattern or Gradient could go here */}
      <div className="absolute inset-0 z-0 bg-slate-50 opacity-50 pointer-events-none" />
      <div className="relative z-10 w-full h-full flex flex-col justify-center p-8">
        {children}
      </div>
    </div>
  );
};
