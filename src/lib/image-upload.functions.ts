import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const schema = z.object({
  dataUrl: z.string().startsWith("data:image/").max(14_000_000),
  folder: z.enum(["stores", "products", "advertisements", "categories", "users"]),
});

// Uploads a (client-compressed) image to storage and returns the URL to save
// in the database. Any signed-in user may upload only under their own prefix.
export const uploadImage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => schema.parse(data))
  .handler(async ({ data, context }) => {
    const { storeDataUrl } = await import("./image-storage.server");
    const url = await storeDataUrl(data.dataUrl, data.folder, context.userId);
    return { url };
  });
