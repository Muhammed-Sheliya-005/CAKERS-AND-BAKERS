import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type CartLine = { productId: number; variantId?: number; quantity: number };
type CartContextValue = {
  items: CartLine[];
  count: number;
  add: (productId: number, quantity?: number, variantId?: number) => void;
  update: (productId: number, quantity: number, variantId?: number) => void;
  remove: (productId: number, variantId?: number) => void;
  clear: () => void;
};
const CartContext = createContext<CartContextValue | null>(null);
const STORAGE_KEY = "cakers-cart-v1";
function readCart(): CartLine[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]") as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is CartLine =>
      !!item &&
      Number.isInteger(item.productId) &&
      item.productId > 0 &&
      (item.variantId === undefined || (Number.isInteger(item.variantId) && item.variantId > 0)) &&
      Number.isInteger(item.quantity) &&
      item.quantity > 0 &&
      item.quantity <= 20
    );
  } catch {
    return [];
  }
}
const sameLine = (item: CartLine, productId: number, variantId?: number) =>
  item.productId === productId && item.variantId === variantId;
export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartLine[]>(readCart);
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); } catch {}
  }, [items]);
  const value = useMemo<CartContextValue>(() => ({
    items,
    count: items.reduce((sum, item) => sum + item.quantity, 0),
    add: (productId, quantity = 1, variantId) => setItems(old => {
      const match = old.find(item => sameLine(item, productId, variantId));
      if (match) return old.map(item => sameLine(item, productId, variantId) ? { ...item, quantity: Math.min(20, item.quantity + quantity) } : item);
      return [...old, { productId, ...(variantId ? { variantId } : {}), quantity: Math.max(1, Math.min(20, quantity)) }];
    }),
    update: (productId, quantity, variantId) => setItems(old => quantity <= 0
      ? old.filter(item => !sameLine(item, productId, variantId))
      : old.map(item => sameLine(item, productId, variantId) ? { ...item, quantity: Math.min(20, quantity) } : item)),
    remove: (productId, variantId) => setItems(old => old.filter(item => !sameLine(item, productId, variantId))),
    clear: () => setItems([]),
  }), [items]);
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
export function useCart() {
  const value = useContext(CartContext);
  if (!value) throw new Error("useCart must be used within CartProvider");
  return value;
}
