import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "update_order_status",
  title: "Update order status",
  description:
    "Update the status of an order. Only allowed for the store owner, assigned driver, or admin — database rules decide.",
  inputSchema: {
    order_id: z.string().uuid().describe("The order id."),
    status: z
      .enum([
        "pending",
        "accepted",
        "preparing",
        "ready",
        "searching_driver",
        "driver_assigned",
        "on_the_way",
        "delivered",
        "rejected",
        "cancelled",
      ])
      .describe("The new order status."),
  },
  annotations: { readOnlyHint: false, destructiveHint: true, openWorldHint: false },
  handler: async ({ order_id, status }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("customer_orders")
      .update({ status })
      .eq("id", order_id)
      .select("id, status")
      .maybeSingle();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    if (!data) {
      return {
        content: [{ type: "text", text: "Order not updated — not found or not permitted." }],
        isError: true,
      };
    }
    return {
      content: [{ type: "text", text: JSON.stringify(data) }],
      structuredContent: { order: data },
    };
  },
});
