// Server-only helpers for storing images in the private "app-images" bucket.
export const IMAGE_BUCKET = "app-images";

export type ImageFolder =
  | "stores"
  | "products"
  | "advertisements"
  | "categories"
  | "users";

const EXT_BY_MIME: Record<string, string> = {
  "image/webp": "webp",
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/gif": "gif",
};

export function publicImageUrl(path: string) {
  return `/api/public/img/${path.split("/").map(encodeURIComponent).join("/")}`;
}

export function parseDataUrl(dataUrl: string): { bytes: Uint8Array; mime: string; ext: string } {
  const match = /^data:([^;,]+);base64,(.*)$/s.exec(dataUrl);
  if (!match) throw new Error("صيغة الصورة غير صحيحة");
  const mime = match[1].toLowerCase();
  const ext = EXT_BY_MIME[mime];
  if (!ext) throw new Error("نوع الصورة غير مدعوم");
  const binary = atob(match[2]);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return { bytes, mime, ext };
}

export async function storeDataUrl(
  dataUrl: string,
  folder: ImageFolder,
  ownerKey: string,
): Promise<string> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { bytes, mime, ext } = parseDataUrl(dataUrl);
  const path = `${folder}/${ownerKey}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabaseAdmin.storage
    .from(IMAGE_BUCKET)
    .upload(path, bytes, { contentType: mime, upsert: false, cacheControl: "31536000" });
  if (error) throw new Error(error.message);
  return publicImageUrl(path);
}
