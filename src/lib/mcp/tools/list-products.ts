import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_products",
  title: "List store products",
  description: "List the available products of a store, with Arabic names and prices in Iraqi Dinar.",
  inputSchema: {
    store_id: z.string().uuid().describe("The store id returned by list_stores."),
    search: z.string().nullable().describe("Optional text to match against the product name."),
    limit: z.number().int().min(1).max(100).nullable().describe("Max products to return (default 50)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ store_id, search, limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    let query = supabase
      .from("products")
      .select("id, name_ar, description, price_iqd, category, is_available, image_url")
      .eq("store_id", store_id)
      .eq("is_available", true)
      .order("sort_order", { ascending: true })
      .limit(limit ?? 50);
    if (search) query = query.ilike("name_ar", `%${search}%`);
    const { data, error } = await query;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? []) }],
      structuredContent: { products: data ?? [] },
    };
  },
});
