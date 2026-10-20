import {
  Briefcase,
  Car,
  CreditCard,
  Ellipsis,
  FileText,
  Gift,
  GraduationCap,
  HandHeart,
  HeartPulse,
  Home,
  Landmark,
  PartyPopper,
  PawPrint,
  Percent,
  Plane,
  Repeat,
  Shield,
  ShoppingBag,
  ShoppingCart,
  Shirt,
  Smartphone,
  Sofa,
  Sparkles,
  Undo2,
  Utensils,
  Wallet,
  Wrench,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const CATEGORY_ICONS: Record<string, LucideIcon> = {
  home: Home,
  zap: Zap,
  "heart-pulse": HeartPulse,
  "credit-card": CreditCard,
  "shopping-cart": ShoppingCart,
  utensils: Utensils,
  car: Car,
  "party-popper": PartyPopper,
  repeat: Repeat,
  sparkles: Sparkles,
  "paw-print": PawPrint,
  "graduation-cap": GraduationCap,
  sofa: Sofa,
  gift: Gift,
  "hand-heart": HandHeart,
  landmark: Landmark,
  briefcase: Briefcase,
  "file-text": FileText,
  shield: Shield,
  undo: Undo2,
  percent: Percent,
  plane: Plane,
  "shopping-bag": ShoppingBag,
  shirt: Shirt,
  smartphone: Smartphone,
  wallet: Wallet,
  wrench: Wrench,
  ellipsis: Ellipsis,
};

export const CATEGORY_COLORS = [
  "#8b5cf6", "#6366f1", "#3b82f6", "#0ea5e9", "#14b8a6", "#10b981", "#22c55e", "#84cc16",
  "#eab308", "#f97316", "#ef4444", "#f43f5e", "#ec4899", "#d946ef", "#a16207", "#64748b",
];

export function CategoryIcon({
  icon,
  color,
  className,
  size = "md",
}: {
  icon: string;
  color: string;
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  const Icon = CATEGORY_ICONS[icon] ?? Ellipsis;
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-xl",
        size === "sm" && "size-7 rounded-lg [&_svg]:size-3.5",
        size === "md" && "size-10 [&_svg]:size-5",
        size === "lg" && "size-12 [&_svg]:size-6",
        className,
      )}
      style={{ backgroundColor: `${color}22`, color }}
    >
      <Icon />
    </span>
  );
}
