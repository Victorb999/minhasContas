import { Suspense } from "react";
import { connection } from "next/server";
import { BottomNav, SideNav } from "@/components/bottom-nav";
import { TransactionDrawer } from "@/components/transaction-drawer";
import { getCategories, getSuggestions } from "@/lib/queries";

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex flex-1 lg:h-dvh lg:flex-none lg:overflow-hidden">
      <SideNav />
      {/* No celular a página rola inteira; no desktop ocupa a tela e cada painel rola por dentro. */}
      <main className="mx-auto flex w-full max-w-lg min-w-0 flex-1 flex-col px-4 pt-[max(env(safe-area-inset-top),1rem)] pb-28 lg:mx-0 lg:max-w-none lg:min-h-0 lg:px-8 lg:py-6">
        {children}
      </main>
      <BottomNav />
      <Suspense>
        <Editor />
      </Suspense>
    </div>
  );
}

async function Editor() {
  await connection();
  const [categories, suggestions] = await Promise.all([getCategories(), getSuggestions()]);
  return <TransactionDrawer categories={categories} suggestions={suggestions} />;
}
