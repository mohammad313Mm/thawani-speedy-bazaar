// Dynamic (admin-created) home-screen categories, merged with the built-in ones.
import { useEffect, useState } from "react";
import { supabase } from "../integrations/supabase/client";
import { CATEGORIES, type Category } from "./data";

export type AppCategoryRow = {
  id: string;
  key: string;
  name: string;
  description: string | null;
  image_url: string | null;
  icon_url: string | null;
  is_active: boolean;
  sort_order: number;
};

const DYNAMIC_COLORS = [
  "from-[oklch(0.66_0.18_255)] to-[oklch(0.72_0.16_290)]",
  "from-[oklch(0.7_0.17_150)] to-[oklch(0.75_0.15_180)]",
  "from-[oklch(0.68_0.19_300)] to-[oklch(0.74_0.16_330)]",
  "from-[oklch(0.7_0.18_200)] to-[oklch(0.66_0.2_240)]",
];

export function adaptAppCategory(row: AppCategoryRow, index = 0): Category {
  return {
    key: row.key,
    name: row.name,
    description: row.description ?? "",
    icon: "🏷️",
    color: DYNAMIC_COLORS[index % DYNAMIC_COLORS.length]!,
    iconUrl: row.icon_url,
    imageUrl: row.image_url,
  };
}

const cache: { rows: AppCategoryRow[] | null } = { rows: null };

export async function fetchAppCategories(): Promise<AppCategoryRow[]> {
  const { data } = await supabase
    .from("app_categories")
    .select("id,key,name,description,image_url,icon_url,is_active,sort_order")
    .eq("is_active", true)
    .order("sort_order")
    .order("created_at");
  const rows = (data ?? []) as unknown as AppCategoryRow[];
  cache.rows = rows;
  return rows;
}

/** Built-in categories + admin-created ones (live). */
export function useAllCategories(): { categories: Category[]; loading: boolean } {
  const [rows, setRows] = useState<AppCategoryRow[]>(cache.rows ?? []);
  const [loading, setLoading] = useState(cache.rows === null);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      const list = await fetchAppCategories();
      if (!alive) return;
      setRows(list);
      setLoading(false);
    };
    void load();
    const ch = supabase
      .channel("public_app_categories")
      .on("postgres_changes", { event: "*", schema: "public", table: "app_categories" }, load)
      .subscribe();
    return () => {
      alive = false;
      supabase.removeChannel(ch);
    };
  }, []);

  const dynamic = rows.map((r, i) => adaptAppCategory(r, i));
  return { categories: [...CATEGORIES, ...dynamic], loading };
}

/** Look up a single category (built-in or dynamic) by key. */
export function useCategory(key: string): { category: Category | null; loading: boolean } {
  const { categories, loading } = useAllCategories();
  return { category: categories.find((c) => c.key === key) ?? null, loading };
}
