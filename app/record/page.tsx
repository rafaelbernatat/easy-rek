"use client";

import dynamic from "next/dynamic";

// Importação dinâmica do componente ScreenRecorder para evitar SSR
const ScreenRecorder = dynamic(
  () => import("@/components/recorder/ScreenRecorder"),
  { ssr: false }
);

export default function RecordPage() {
  return <ScreenRecorder />;
}
