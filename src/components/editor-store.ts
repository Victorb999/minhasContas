"use client";

import { useSyncExternalStore } from "react";
import type { TransactionDTO } from "@/lib/queries";
import type { TxType } from "@/db/schema";

// Estado global mínimo do editor: qualquer componente (botão +, item da lista) pode abri-lo.
type EditorState = { open: boolean; tx: TransactionDTO | null; type: TxType; nonce: number };

let state: EditorState = { open: false, tx: null, type: "expense", nonce: 0 };
const listeners = new Set<() => void>();

function set(next: Partial<EditorState>) {
  state = { ...state, ...next };
  listeners.forEach((l) => l());
}

export function openNewTransaction(type: TxType = "expense") {
  set({ open: true, tx: null, type, nonce: state.nonce + 1 });
}

export function openEditTransaction(tx: TransactionDTO) {
  set({ open: true, tx, type: tx.type, nonce: state.nonce + 1 });
}

export function closeEditor() {
  set({ open: false });
}

export function useEditor() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => state,
    () => state,
  );
}
