"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChartColumn, House, List, Plus, Settings } from "lucide-react";
import { Logo } from "@/components/logo";
import { openNewTransaction } from "@/components/editor-store";
import { cn } from "@/lib/utils";

const items = [
  { href: "/", label: "Mês", icon: House },
  { href: "/ano", label: "Ano", icon: ChartColumn },
  { href: "/lancamentos", label: "Lançamentos", icon: List },
  { href: "/ajustes", label: "Ajustes", icon: Settings },
] as const;

function useIsActive() {
  const pathname = usePathname();
  return (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));
}

/** Celular: barra inferior com o botão + no centro. */
export function BottomNav() {
  const isActive = useIsActive();
  const [first, second, third, fourth] = items;

  const link = (item: (typeof items)[number]) => (
    <Link
      key={item.href}
      href={item.href}
      className={cn(
        "flex flex-col items-center gap-1 text-[11px] font-medium transition-colors",
        isActive(item.href) ? "text-primary" : "text-muted-foreground",
      )}
    >
      <item.icon className="size-5" />
      {item.label}
    </Link>
  );

  return (
    <nav className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 lg:hidden">
      <div className="mx-auto grid h-16 max-w-lg grid-cols-5 items-center">
        {link(first)}
        {link(second)}
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => openNewTransaction()}
            aria-label="Novo lançamento"
            className="-mt-7 flex size-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/30 transition-transform active:scale-95"
          >
            <Plus className="size-7" strokeWidth={2.5} />
          </button>
        </div>
        {link(third)}
        {link(fourth)}
      </div>
    </nav>
  );
}

/** Desktop: menu lateral fixo. */
export function SideNav() {
  const isActive = useIsActive();

  return (
    <aside className="hidden w-60 shrink-0 flex-col gap-6 border-r bg-card/50 p-4 lg:flex">
      <div className="flex items-center gap-2.5 px-2 pt-2">
        <Logo className="size-9" />
        <span className="text-base font-semibold tracking-tight">Minhas Contas</span>
      </div>

      <button
        type="button"
        onClick={() => openNewTransaction()}
        className="flex h-11 items-center justify-center gap-2 rounded-xl bg-primary font-medium text-primary-foreground shadow-md shadow-primary/25 transition-colors hover:bg-primary/90"
      >
        <Plus className="size-5" strokeWidth={2.5} />
        Novo lançamento
      </button>

      <nav className="flex flex-col gap-1">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors",
              isActive(item.href)
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-accent hover:text-foreground",
            )}
          >
            <item.icon className="size-4.5" />
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
