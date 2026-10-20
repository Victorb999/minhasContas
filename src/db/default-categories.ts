import type { TxType } from "./schema";

export type DefaultCategory = { name: string; type: TxType; color: string; icon: string };

export const DEFAULT_CATEGORIES: DefaultCategory[] = [
  { name: "Moradia", type: "expense", color: "#8b5cf6", icon: "home" },
  { name: "Contas", type: "expense", color: "#0ea5e9", icon: "zap" },
  { name: "Saúde", type: "expense", color: "#ef4444", icon: "heart-pulse" },
  { name: "Cartão", type: "expense", color: "#6366f1", icon: "credit-card" },
  { name: "Mercado", type: "expense", color: "#22c55e", icon: "shopping-cart" },
  { name: "Alimentação", type: "expense", color: "#f97316", icon: "utensils" },
  { name: "Transporte", type: "expense", color: "#eab308", icon: "car" },
  { name: "Lazer", type: "expense", color: "#ec4899", icon: "party-popper" },
  { name: "Assinaturas", type: "expense", color: "#14b8a6", icon: "repeat" },
  { name: "Beleza", type: "expense", color: "#d946ef", icon: "sparkles" },
  { name: "Pets", type: "expense", color: "#a16207", icon: "paw-print" },
  { name: "Educação", type: "expense", color: "#3b82f6", icon: "graduation-cap" },
  { name: "Vestuário", type: "expense", color: "#06b6d4", icon: "shirt" },
  { name: "Casa", type: "expense", color: "#84cc16", icon: "sofa" },
  { name: "Presentes", type: "expense", color: "#f43f5e", icon: "gift" },
  { name: "Doações", type: "expense", color: "#10b981", icon: "hand-heart" },
  { name: "Impostos e taxas", type: "expense", color: "#64748b", icon: "landmark" },
  { name: "Outros", type: "expense", color: "#94a3b8", icon: "ellipsis" },

  { name: "Salário", type: "income", color: "#10b981", icon: "briefcase" },
  { name: "Rescisão", type: "income", color: "#8b5cf6", icon: "file-text" },
  { name: "Benefícios", type: "income", color: "#0ea5e9", icon: "shield" },
  { name: "Reembolso", type: "income", color: "#f97316", icon: "undo" },
  { name: "Cashback", type: "income", color: "#ec4899", icon: "percent" },
  { name: "Restituição IR", type: "income", color: "#eab308", icon: "landmark" },
  { name: "Outras receitas", type: "income", color: "#94a3b8", icon: "ellipsis" },
];
