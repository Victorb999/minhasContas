import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/error-state";

export default function NotFound() {
  return (
    <ErrorState title="Página não encontrada" description="O endereço que você abriu não existe neste app.">
      <Button asChild size="lg">
        <Link href="/">Voltar ao início</Link>
      </Button>
    </ErrorState>
  );
}
