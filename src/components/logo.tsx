import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" aria-hidden className={cn("size-8", className)}>
      <defs>
        <linearGradient id="logo-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#8b5cf6" />
          <stop offset="1" stopColor="#6d28d9" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="18" fill="url(#logo-g)" />
      <rect x="14" y="34" width="8" height="16" rx="3" fill="#fff" opacity=".55" />
      <rect x="28" y="26" width="8" height="24" rx="3" fill="#fff" opacity=".8" />
      <rect x="42" y="16" width="8" height="34" rx="3" fill="#34d399" />
    </svg>
  );
}
