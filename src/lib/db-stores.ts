// Realtime hooks + adapters that map DB rows to the customer-app Store/Product shapes.
import { useEffect, useState } from "react";
import { supabase } from "../integrations/supabase/client";
import type { CategoryKey, Store, Product } from "./data";

export type DbStoreRow = {
  id: string;
  owner_id: string | null;
  name: string;
  category: string | null;
  phone: string | null;
  address: string | null;
  description: string | null;
  cover_url: string | null;
  logo_url: string | null;
  latitude: number | null;
  longitude: number | null;
  is_open: boolean;
  status: "active" | "suspended";
  working_hours: string | null;
  commission_rate: number;
  commission_type: string;
  commission_amount: number;
  delivery_available: boolean;
  created_at: string;
};

export type DbProductRow = {
  id: string;
  store_id: string;
  name_ar: string;
  description: string | null;
  price_iqd: number;
  image_url: string | null;
  category: string | null;
  is_available: boolean;
  sort_order: number;
};

// Admin form values → customer-app CategoryKey
export const STORE_CATEGORY_OPTIONS: { value: string; label: string; key: CategoryKey }[] = [
  { value: "restaurants", label: "مطعم", key: "restaurants" },
  { value: "cosmetics", label: "كوزمتك", key: "cosmetics" },
  { value: "grocery", label: "بقالة", key: "grocery" },
  { value: "sweets", label: "حلويات", key: "desserts" },
  { value: "drinks", label: "مشروبات", key: "desserts" },
];

const CATEGORY_KEY_MAP: Record<string, CategoryKey> = {
  restaurants: "restaurants",
  cosmetics: "cosmetics",
  grocery: "grocery",
  sweets: "desserts",
  drinks: "desserts",
  desserts: "desserts",
};

const DEFAULT_COVER =
  "https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=800&q=80";
const DEFAULT_LOGO =
  "https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=200&h=200&q=80";

const FALLBACK_COVER: Record<string, string> = {
  restaurants: "https://images.unsplash.com/photo-1552566626-52f8b828add9?auto=format&fit=crop&w=800&q=80",
  grocery: "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=800&q=80",
  cosmetics: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=800&q=80",
  desserts: "https://images.unsplash.com/photo-1551024506-0bccd828d307?auto=format&fit=crop&w=800&q=80",
  freelance: "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&w=800&q=80",
  taxi: "https://images.unsplash.com/photo-1566008885218-90abf9200ddb?auto=format&fit=crop&w=800&q=80",
};
const FALLBACK_LOGO: Record<string, string> = {
  restaurants: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=200&h=200&q=80",
  grocery: "https://images.unsplash.com/photo-1604719312566-8912e9227c6a?auto=format&fit=crop&w=200&h=200&q=80",
  cosmetics: "https://images.unsplash.com/photo-1512496015851-a90fb38ba796?auto=format&fit=crop&w=200&h=200&q=80",
  desserts: "https://images.unsplash.com/photo-1587049352846-4a222e784d38?auto=format&fit=crop&w=200&h=200&q=80",
  freelance: "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&w=200&h=200&q=80",
  taxi: "https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?auto=format&fit=crop&w=200&h=200&q=80",
};

export function mapDbCategoryToKey(cat: string | null): CategoryKey | null {
  if (!cat) return null;
  // Built-in aliases first; otherwise the raw value is an admin-created category key.
  return CATEGORY_KEY_MAP[cat] ?? cat;
}

export function adaptDbStore(row: DbStoreRow): Store | null {
  const key = mapDbCategoryToKey(row.category);
  if (!key) return null;
  const isOpen = row.is_open && row.status === "active";
  return {
    id: row.id,
    category: key,
    name: row.name,
    cover: row.cover_url || FALLBACK_COVER[key],
    logo: row.logo_url || FALLBACK_LOGO[key],
    rating: 5.0,
    reviews: 0,
    distanceKm: 0,
    deliveryMin: 30,
    deliveryFee: 2000,
    minOrder: 0,
    isOpen,
    tags: row.working_hours ? [row.working_hours] : [],
    description: row.description ?? "",
    address: row.address ?? "",
    phone: row.phone ?? "",
  };
}

export function adaptDbProduct(row: DbProductRow): Product {
  return {
    id: row.id,
    storeId: row.store_id,
    name: row.name_ar,
    description: row.description ?? "",
    price: row.price_iqd,
    image:
      row.image_url ||
      "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=600&q=80",
    category: row.category ?? "عام",
    rating: 5.0,
    prepMin: 15,
    available: row.is_available,
  };
}

// Module-level caches: seed hooks synchronously so revisits render instantly
// while a background refresh runs (stale-while-revalidate).
const storesCache: { list: Store[] | null } = { list: null };
const storeCache = new Map<string, Store | null>();
const productsCache = new Map<string, Product[]>();

const STORES_LS_KEY = "thawani-stores-cache-v1";
const STORE_COLUMNS =
  "id,owner_id,name,category,phone,address,description,cover_url,logo_url,is_open,status,working_hours,created_at";

function readPersistedStores(): Store[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORES_LS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Store[];
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function persistStores(list: Store[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORES_LS_KEY, JSON.stringify(list));
  } catch {}
}

function seedStoresCache(): Store[] | null {
  if (storesCache.list) return storesCache.list;
  const persisted = readPersistedStores();
  if (persisted) storesCache.list = persisted;
  return storesCache.list;
}

let storesInFlight: Promise<Store[]> | null = null;

// Fetch (and cache) the store list. Safe to call repeatedly — concurrent calls share one request.
export function prefetchDbStores(): Promise<Store[]> {
  if (storesInFlight) return storesInFlight;
  storesInFlight = (async () => {
    const { data } = await supabase
      .from("stores")
      .select(STORE_COLUMNS)
      .eq("status", "active")
      .order("created_at", { ascending: false });
    const adapted = ((data ?? []) as unknown as DbStoreRow[])
      .map(adaptDbStore)
      .filter((s): s is Store => s !== null);
    storesCache.list = adapted;
    persistStores(adapted);
    return adapted;
  })().finally(() => {
    storesInFlight = null;
  });
  return storesInFlight;
}

// Subscribe to all stores + realtime; returns adapted Store[] (only rows with mappable category)
export function useDbStores(): { stores: Store[]; loading: boolean } {
  const seed = seedStoresCache();
  const [stores, setStores] = useState<Store[]>(seed ?? []);
  const [loading, setLoading] = useState(seed === null);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      const list = await prefetchDbStores();
      if (!alive) return;
      setStores(list);
      setLoading(false);
    };
    load();
    const ch = supabase
      .channel("public_stores")
      .on("postgres_changes", { event: "*", schema: "public", table: "stores" }, load)
      .subscribe();
    return () => {
      alive = false;
      supabase.removeChannel(ch);
    };
  }, []);

  return { stores, loading };
}


export function useDbStore(id: string): { store: Store | null; loading: boolean } {
  const cached = id ? storeCache.get(id) : undefined;
  const [store, setStore] = useState<Store | null>(cached ?? null);
  const [loading, setLoading] = useState(cached === undefined);

  useEffect(() => {
    if (!id) return;
    let alive = true;
    const load = async () => {
      const { data } = await supabase.from("stores").select("*").eq("id", id).maybeSingle();
      if (!alive) return;
      const adapted = data ? adaptDbStore(data as DbStoreRow) : null;
      storeCache.set(id, adapted);
      setStore(adapted);
      setLoading(false);
    };
    load();
    const ch = supabase
      .channel(`store_${id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "stores", filter: `id=eq.${id}` },
        load,
      )
      .subscribe();
    return () => {
      alive = false;
      supabase.removeChannel(ch);
    };
  }, [id]);

  return { store, loading };
}

export function useDbProducts(storeId: string): { products: Product[]; loading: boolean } {
  const cached = storeId ? productsCache.get(storeId) : undefined;
  const [products, setProducts] = useState<Product[]>(cached ?? []);
  const [loading, setLoading] = useState(cached === undefined);

  useEffect(() => {
    if (!storeId) return;
    let alive = true;
    const load = async () => {
      const { data } = await supabase
        .from("products")
        .select("*")
        .eq("store_id", storeId)
        .eq("is_available", true)
        .order("sort_order");
      if (!alive) return;
      const adapted = ((data ?? []) as DbProductRow[]).map(adaptDbProduct);
      productsCache.set(storeId, adapted);
      setProducts(adapted);
      setLoading(false);
    };
    load();
    const ch = supabase
      .channel(`store_products_${storeId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "products", filter: `store_id=eq.${storeId}` },
        load,
      )
      .subscribe();
    return () => {
      alive = false;
      supabase.removeChannel(ch);
    };
  }, [storeId]);

  return { products, loading };
}


// Search available products across ALL stores (live from the database).
export function useDbProductSearch(query: string): {
  products: (Product & { storeName?: string })[];
  loading: boolean;
} {
  const [products, setProducts] = useState<(Product & { storeName?: string })[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 1) {
      setProducts([]);
      setLoading(false);
      return;
    }
    let alive = true;
    setLoading(true);
    const t = setTimeout(async () => {
      const safe = q.replace(/[%,()]/g, " ");
      const { data } = await supabase
        .from("products")
        .select("*, stores!inner(id,name,status)")
        .eq("is_available", true)
        .eq("stores.status", "active")
        .or(`name_ar.ilike.%${safe}%,description.ilike.%${safe}%,category.ilike.%${safe}%`)
        .limit(20);
      if (!alive) return;
      const rows = (data ?? []) as unknown as (DbProductRow & { stores?: { name?: string } })[];
      setProducts(
        rows.map((r) => ({ ...adaptDbProduct(r), storeName: r.stores?.name ?? undefined })),
      );
      setLoading(false);
    }, 250);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [query]);

  return { products, loading };
}
