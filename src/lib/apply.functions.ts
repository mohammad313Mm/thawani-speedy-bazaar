import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

// Registration requests (merchant / driver). The area is resolved on the server
// from the caller's real coordinates (or their profile) and stored on the row,
// so the admin dashboard can isolate requests per area.

const schema = z.object({
  kind: z.enum(["merchant", "driver"]),
  full_name: z.string().min(1),
  phone: z.string().min(1),
  store_name: z.string().nullable().optional(),
  vehicle_type: z.string().nullable().optional(),
  applicant_note: z.string().nullable().optional(),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
});

export const submitApplication = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => schema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const userId = context.userId;

    // 1) area from coordinates when available, else the profile's area.
    let areaId: string | null = null;
    if (typeof data.lat === "number" && typeof data.lng === "number") {
      const { data: resolved } = await supabaseAdmin.rpc("area_for_point" as never, {
        _lat: data.lat,
        _lng: data.lng,
      } as never);
      areaId = (resolved as string | null) ?? null;
    }
    if (!areaId) {
      const { data: prof } = await supabaseAdmin
        .from("profiles")
        .select("area_id")
        .eq("id", userId)
        .maybeSingle();
      areaId = ((prof as { area_id: string | null } | null)?.area_id) ?? null;
    } else {
      // keep the profile in sync so every other area-scoped feature agrees
      await supabaseAdmin.from("profiles").update({ area_id: areaId }).eq("id", userId);
    }

    const base = {
      user_id: userId,
      full_name: data.full_name,
      phone: data.phone,
      status: "pending" as const,
      email: null,
      area_id: areaId,
      applicant_note: data.applicant_note ?? null,
    };

    const table = data.kind === "merchant" ? "merchant_applications" : "driver_applications";
    const row =
      data.kind === "merchant"
        ? { ...base, store_name: data.store_name ?? null }
        : { ...base, vehicle_type: data.vehicle_type ?? null };

    const { error } = await supabaseAdmin
      .from(table)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .upsert(row as any, { onConflict: "user_id" });
    if (error) throw new Error(error.message);

    return { ok: true, area_id: areaId };
  });
