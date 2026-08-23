// Server-only helpers shared by the admin server functions.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function assertAdminCaller(ctx: { supabase: any; userId: string }) {
  const { data, error } = await ctx.supabase.rpc("has_role", {
    _user_id: ctx.userId,
    _role: "admin",
  });
  if (error || !data) throw new Error("Forbidden: admin role required");
}
