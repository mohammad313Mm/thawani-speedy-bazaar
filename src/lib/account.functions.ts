import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Permanently deletes the calling user's account and all related data.
 */
export const deleteMyAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const userId = context.userId;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Stores owned by this user (and their products)
    const { data: stores } = await supabaseAdmin
      .from("stores")
      .select("id")
      .eq("owner_id", userId);
    const storeIds = (stores ?? []).map((s) => s.id);
    if (storeIds.length) {
      await supabaseAdmin.from("products").delete().in("store_id", storeIds);
      await supabaseAdmin.from("customer_orders").delete().in("store_id", storeIds);
      await supabaseAdmin.from("stores").delete().in("id", storeIds);
    }

    // Release any orders this user was delivering
    await supabaseAdmin
      .from("customer_orders")
      .update({ driver_id: null })
      .eq("driver_id", userId);

    // Orders placed as a customer
    await supabaseAdmin.from("customer_orders").delete().eq("customer_id", userId);

    await supabaseAdmin.from("driver_delivery_areas").delete().eq("driver_id", userId);
    await supabaseAdmin.from("device_tokens").delete().eq("user_id", userId);
    await supabaseAdmin.from("support_chat_messages").delete().eq("user_id", userId);
    await supabaseAdmin.from("support_messages").delete().eq("user_id", userId);
    await supabaseAdmin.from("driver_applications").delete().eq("user_id", userId);
    await supabaseAdmin.from("merchant_applications").delete().eq("user_id", userId);
    await supabaseAdmin.from("user_roles").delete().eq("user_id", userId);
    await supabaseAdmin.from("profiles").delete().eq("id", userId);

    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (error) throw new Error(error.message);

    return { ok: true };
  });
