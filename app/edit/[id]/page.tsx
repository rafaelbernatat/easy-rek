"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";

export default function EditPage() {
  const params = useParams();
  const router = useRouter();
  const recordingId = params.id as string;

  useEffect(() => {
    // Redirecionar diretamente para a rota do editor
    console.log("🔄 [EDIT PAGE] Redirecionando para /editor/" + recordingId);
    router.push(`/editor/${recordingId}`);
  }, [recordingId, router]);

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-slate-50">
      <div className="text-slate-600">Carregando...</div>
    </div>
  );
}
