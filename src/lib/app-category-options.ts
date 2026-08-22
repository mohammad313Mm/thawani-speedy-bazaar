// Admin-created categories exposed as {value,label} options for merchant forms.
import { useEffect, useState } from "react";
import { fetchAppCategories } from "./app-categories";

export function useAppCategoryOptions(): {
  categories: { value: string; label: string }[];
  loading: boolean;
} {
  const [categories, setCategories] = useState<{ value: string; label: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    void fetchAppCategories().then((rows) => {
      if (!alive) return;
      setCategories(rows.map((r) => ({ value: r.key, label: r.name })));
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, []);

  return { categories, loading };
}
