import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Product } from "./data";

export interface CartItem {
  productId: string;
  quantity: number;
  notes?: string;
  product: Product; // snapshot so DB-backed products work without a global lookup
}

interface CartContextValue {
  items: CartItem[];
  storeId: string | null;
  addItem: (product: Product, qty?: number) => void;
  updateQty: (productId: string, qty: number) => void;
  removeItem: (productId: string) => void;
  clear: () => void;
  favorites: string[]; // product ids
  favStores: string[]; // store ids
  toggleFavorite: (productId: string) => void;
  toggleFavStore: (storeId: string) => void;
  subtotal: number;
  itemCount: number;
}

const CartContext = createContext<CartContextValue | null>(null);

const KEY_ITEMS = "thawani-cart";
const KEY_STORE = "thawani-cart-store";
const KEY_FAV = "thawani-favs";
const KEY_FAV_STORES = "thawani-fav-stores";

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [storeId, setStoreId] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [favStores, setFavStores] = useState<string[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const i = localStorage.getItem(KEY_ITEMS);
      const s = localStorage.getItem(KEY_STORE);
      const f = localStorage.getItem(KEY_FAV);
      const fs = localStorage.getItem(KEY_FAV_STORES);
      if (i) {
        const parsed = JSON.parse(i) as CartItem[];
        // Drop legacy entries missing the product snapshot to prevent crashes.
        setItems(parsed.filter((it) => it && it.product && it.productId));
      }
      if (s) setStoreId(s);
      if (f) setFavorites(JSON.parse(f));
      if (fs) setFavStores(JSON.parse(fs));
    } catch {}
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(KEY_ITEMS, JSON.stringify(items));
    if (storeId) localStorage.setItem(KEY_STORE, storeId);
    else localStorage.removeItem(KEY_STORE);
  }, [items, storeId, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(KEY_FAV, JSON.stringify(favorites));
    localStorage.setItem(KEY_FAV_STORES, JSON.stringify(favStores));
  }, [favorites, favStores, hydrated]);

  const addItem = (product: Product, qty = 1) => {
    if (!product) return;
    if (storeId && storeId !== product.storeId) {
      if (
        !confirm(
          "سلتك تحتوي على منتجات من متجر آخر. هل تريد إفراغها وإضافة هذا المنتج؟",
        )
      )
        return;
      setItems([{ productId: product.id, quantity: qty, product }]);
      setStoreId(product.storeId);
      return;
    }
    setStoreId(product.storeId);
    setItems((prev) => {
      const found = prev.find((i) => i.productId === product.id);
      if (found)
        return prev.map((i) =>
          i.productId === product.id
            ? { ...i, quantity: i.quantity + qty, product }
            : i,
        );
      return [...prev, { productId: product.id, quantity: qty, product }];
    });
  };

  const updateQty = (productId: string, qty: number) => {
    if (qty <= 0) return removeItem(productId);
    setItems((prev) => prev.map((i) => (i.productId === productId ? { ...i, quantity: qty } : i)));
  };

  const removeItem = (productId: string) => {
    setItems((prev) => {
      const next = prev.filter((i) => i.productId !== productId);
      if (next.length === 0) setStoreId(null);
      return next;
    });
  };

  const clear = () => {
    setItems([]);
    setStoreId(null);
  };

  const toggleFavorite = (productId: string) => {
    setFavorites((prev) =>
      prev.includes(productId) ? prev.filter((x) => x !== productId) : [...prev, productId],
    );
  };
  const toggleFavStore = (id: string) => {
    setFavStores((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const { subtotal, itemCount } = useMemo(() => {
    let sub = 0;
    let count = 0;
    for (const it of items) {
      const p = it.product;
      if (!p) continue;
      const price = p.discountPrice ?? p.price;
      sub += price * it.quantity;
      count += it.quantity;
    }
    return { subtotal: sub, itemCount: count };
  }, [items]);

  // storeId sanity vs items
  useEffect(() => {
    if (items.length === 0 && storeId) setStoreId(null);
  }, [items, storeId]);

  return (
    <CartContext.Provider
      value={{
        items,
        storeId,
        addItem,
        updateQty,
        removeItem,
        clear,
        favorites,
        favStores,
        toggleFavorite,
        toggleFavStore,
        subtotal,
        itemCount,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be inside CartProvider");
  return ctx;
}
