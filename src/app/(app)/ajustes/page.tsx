import { Suspense } from "react";
import { connection } from "next/server";
import { Download, LogOut } from "lucide-react";
import { logout } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { CategoryManager } from "@/components/category-manager";
import { ListSkeleton } from "@/components/skeletons";
import { SectionTitle } from "@/components/summary";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { getCategories } from "@/lib/queries";

export default function SettingsPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="pt-2 text-lg font-semibold tracking-tight">Ajustes</h1>

      <section className="flex flex-col gap-2">
        <SectionTitle>Categorias</SectionTitle>
        <Suspense fallback={<ListSkeleton />}>
          <Categories />
        </Suspense>
      </section>

      <section className="flex flex-col gap-2">
        <SectionTitle>Aparência</SectionTitle>
        <ThemeSwitcher />
      </section>

      <section className="flex flex-col gap-2">
        <SectionTitle>Dados</SectionTitle>
        <Button variant="outline" asChild>
          <a href="/api/export" download>
            <Download /> Exportar todos os lançamentos (CSV)
          </a>
        </Button>
        <form action={logout}>
          <Button variant="ghost" type="submit" className="w-full text-muted-foreground">
            <LogOut /> Sair
          </Button>
        </form>
      </section>
    </div>
  );
}

async function Categories() {
  await connection();
  const categories = await getCategories();
  return <CategoryManager categories={categories} />;
}
