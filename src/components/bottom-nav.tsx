"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChartColumn, House, List, Plus, Settings } from "lucide-react";
import { openNewTransaction } from "@/components/editor-store";
import { cn } from "@/lib/utils";

const items = [
  { href: "/", label: "Mês", icon: House },
  { href: "/ano", label: "Ano", icon: ChartColumn },
  null,
  { href: "/lancamentos", label: "Lançamentos", icon: List },
  { href: "/ajustes", label: "Ajustes", icon: Settings },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t bg-background/85 backdrop-blur-lg">
      <div className="mx-auto grid h-16 max-w-lg grid-cols-5 items-center">
        {items.map((item) =>
          item === null ? (
            <div key="fab" className="flex justify-center">
              <button
                type="button"
                onClick={() => openNewTransaction()}
                aria-label="Novo lançamento"
                className="-mt-7 flex size-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/30 transition-transform active:scale-95"
              >
                <Plus className="size-7" strokeWidth={2.5} />
              </button>
            </div>
          ) : (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-1 text-[11px] font-medium transition-colors",
                (item.href === "/" ? pathname === "/" : pathname.startsWith(item.href))
                  ? "text-primary"
                  : "text-muted-foreground",
              )}
            >
              <item.icon className="size-5" />
              {item.label}
            </Link>
          ),
        )}
      </div>
    </nav>
  );
}
