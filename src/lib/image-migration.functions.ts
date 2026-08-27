import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertAdminCaller } from "./admin-guard.server";

const schema = z.object({ dryRun: z.boolean().optional() }).optional();

type Target = { table: string; columns: string[]; folder: string };

const TARGETS: Target[] = [
  { table: "products", columns: ["image_url"], folder: "products" },
  { table: "stores", columns: ["logo_url", "cover_url"], folder: "stores" },
  { table: "advertisements", columns: ["image_url"], folder: "advertisements" },
  { table: "app_categories", columns: ["image_url", "icon_url"], folder: "categories" },
];

// One-off admin migration: moves every base64 data URL still stored in the
// database into storage, then rewrites the column to the served URL.
// A row is only rewritten AFTER its upload succeeded.
export const migrateBase64Images = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => schema.parse(data))
  .handler(async ({ data, context }) => {
    await assertAdminCaller(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { storeDataUrl } = await import("./image-storage.server");
    const dryRun = data?.dryRun ?? false;

    const report: Record<string, { found: number; migrated: number; failed: number; errors: string[] }> = {};

    for (const t of TARGETS) {
      const entry = { found: 0, migrated: 0, failed: 0, errors: [] as string[] };
      report[t.table] = entry;
      const { data: rows, error } = await supabaseAdmin
        .from(t.table as never)
        .select(["id", ...t.columns].join(","));
      if (error) {
        entry.errors.push(error.message);
        continue;
      }
      for (const row of (rows ?? []) as unknown as Record<string, string | null>[]) {
        const patch: Record<string, string> = {};
        for (const col of t.columns) {
          const val = row[col];
          if (!val || !val.startsWith("data:image/")) continue;
          entry.found++;
          if (dryRun) continue;
          try {
            patch[col] = await storeDataUrl(val, t.folder as never, String(row.id));
          } catch (e) {
            entry.failed++;
            entry.errors.push(`${t.table}.${col}/${row.id}: ${(e as Error).message}`);
          }
        }
        if (!dryRun && Object.keys(patch).length > 0) {
          const { error: upErr } = await supabaseAdmin
            .from(t.table as never)
            .update(patch as never)
            .eq("id", row.id as string);
          if (upErr) {
            entry.failed += Object.keys(patch).length;
            entry.errors.push(`${t.table}/${row.id}: ${upErr.message}`);
          } else {
            entry.migrated += Object.keys(patch).length;
          }
        }
      }
    }

    return { dryRun, report };
  });
