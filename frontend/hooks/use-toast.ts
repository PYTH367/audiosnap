// ────────────────────────────────────────────────────────────
// Minimal toast store implemented with plain React state + a module-
// level subscriber list. Avoids pulling in a full state-management
// library just for "show a message for 4 seconds."
// ────────────────────────────────────────────────────────────
"use client";

import { useEffect, useState, useCallback } from "react";

export type ToastVariant = "default" | "success" | "error";

export interface ToastItem {
  id: string;
  title: string;
  description?: string;
  variant?: ToastVariant;
}

let toasts: ToastItem[] = [];
const listeners = new Set<(items: ToastItem[]) => void>();

function emit() {
  listeners.forEach((listener) => listener(toasts));
}

export function pushToast(toast: Omit<ToastItem, "id">) {
  const id = crypto.randomUUID();
  toasts = [...toasts, { variant: "default", ...toast, id }];
  emit();
  setTimeout(() => dismissToast(id), 4500);
}

export function dismissToast(id: string) {
  toasts = toasts.filter((t) => t.id !== id);
  emit();
}

export function useToast() {
  const [items, setItems] = useState<ToastItem[]>(toasts);

  useEffect(() => {
    listeners.add(setItems);
    return () => {
      listeners.delete(setItems);
    };
  }, []);

  const toast = useCallback(
    (title: string, opts?: { description?: string; variant?: ToastVariant }) =>
      pushToast({ title, description: opts?.description, variant: opts?.variant ?? "default" }),
    []
  );

  return { toasts: items, toast, dismiss: dismissToast };
}
