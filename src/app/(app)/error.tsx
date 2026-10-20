"use client";

import { useEffect } from "react";
import { RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/error-state";

export default function AppError({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  const digest = error instanceof Error && "digest" in error ? String(error.digest) : null;

  return (
    <ErrorState
      title="Não foi possível carregar"
      description="Pode ser falta de internet ou o banco de dados fora do ar. Tente de novo em alguns segundos."
    >
      <Button onClick={() => retry()} size="lg">
        <RotateCw /> Tentar de novo
      </Button>
      {digest && <p className="text-[11px] text-muted-foreground/70">Código: {digest}</p>}
    </ErrorState>
  );
}
