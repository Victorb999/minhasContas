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
    <div className="flex flex-col gap-6 lg:min-h-0 lg:flex-1">
      <h1 className="pt-2 text-lg font-semibold tracking-tight lg:pt-0 lg:text-2xl">Ajustes</h1>

      <div className="flex flex-col gap-6 lg:grid lg:min-h-0 lg:flex-1 lg:grid-rows-[minmax(0,1fr)] lg:grid-cols-[minmax(0,28rem)_minmax(0,22rem)] lg:gap-8">
        <section className="panel flex flex-col gap-2">
          <SectionTitle>Categorias</SectionTitle>
          <Suspense fallback={<ListSkeleton />}>
            <Categories />
          </Suspense>
        </section>

        <div className="flex flex-col gap-6">
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
      </div>
    </div>
  );
}

async function Categories() {
  await connection();
  const categories = await getCategories();
  return <CategoryManager categories={categories} />;
}
