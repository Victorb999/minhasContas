"use client";

import { useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import { Monitor, Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

const options = [
  { value: "light", label: "Claro", icon: Sun },
  { value: "dark", label: "Escuro", icon: Moon },
  { value: "system", label: "Sistema", icon: Monitor },
];

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();
  // O tema só é conhecido no cliente.
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  return (
    <div className="grid grid-cols-3 gap-1 rounded-xl bg-muted p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => setTheme(o.value)}
          className={cn(
            "flex h-9 items-center justify-center gap-1.5 rounded-lg text-sm font-medium",
            mounted && theme === o.value ? "bg-background shadow-sm" : "text-muted-foreground",
          )}
        >
          <o.icon className="size-4" />
          {o.label}
        </button>
      ))}
    </div>
  );
}
