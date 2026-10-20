import { Suspense } from "react";
import { connection } from "next/server";
import { BottomNav } from "@/components/bottom-nav";
import { TransactionDrawer } from "@/components/transaction-drawer";
import { getCategories, getSuggestions } from "@/lib/queries";

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col px-4 pt-[max(env(safe-area-inset-top),1rem)] pb-28">
        {children}
      </div>
      <BottomNav />
      <Suspense>
        <Editor />
      </Suspense>
    </>
  );
}

async function Editor() {
  await connection();
  const [categories, suggestions] = await Promise.all([getCategories(), getSuggestions()]);
  return <TransactionDrawer categories={categories} suggestions={suggestions} />;
}
