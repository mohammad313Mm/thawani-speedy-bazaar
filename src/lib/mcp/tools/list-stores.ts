import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_stores",
  title: "List stores",
  description:
    "List active stores on Thawani Hub. Optionally filter by category (restaurants, grocery, cosmetics, sweets) or search by name.",
  inputSchema: {
    category: z.string().nullable().describe("Optional category key to filter by."),
    search: z.string().nullable().describe("Optional text to match against the store name."),
    limit: z.number().int().min(1).max(50).nullable().describe("Max stores to return (default 20)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ category, search, limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    let query = supabase
      .from("stores")
      .select("id, name, category, description, address, phone, is_open, delivery_available")
      .eq("status", "active")
      .limit(limit ?? 20);
    if (category) query = query.eq("category", category);
    if (search) query = query.ilike("name", `%${search}%`);
    const { data, error } = await query;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? []) }],
      structuredContent: { stores: data ?? [] },
    };
  },
});
