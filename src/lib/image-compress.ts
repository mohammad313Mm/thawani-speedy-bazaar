import { uploadImage } from "./image-upload.functions";

// Client-side image compression to a data URL.
// Used as an intermediate step before uploading to storage.
export async function compressImageToDataUrl(
  file: File,
  opts: { maxWidth?: number; maxHeight?: number; quality?: number; mime?: string } = {},
): Promise<string> {
  const { maxWidth = 1200, maxHeight = 1200, quality = 0.8, mime = "image/webp" } = opts;
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("فشل تحميل الصورة"));
      el.src = url;
    });
    let { width, height } = img;
    const ratio = Math.min(maxWidth / width, maxHeight / height, 1);
    width = Math.round(width * ratio);
    height = Math.round(height * ratio);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas غير مدعوم");
    ctx.drawImage(img, 0, 0, width, height);
    const out = canvas.toDataURL(mime, quality);
    // Older browsers silently fall back to PNG when WebP is unsupported.
    return out.startsWith("data:image/") ? out : canvas.toDataURL("image/jpeg", quality);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export type ImageFolder = "stores" | "products" | "advertisements" | "categories" | "users";

// Compress on the device, then store the file in Supabase Storage and return
// the URL to persist in the database (never base64).
export async function compressAndUploadImage(
  file: File,
  folder: ImageFolder,
  opts: { maxWidth?: number; maxHeight?: number; quality?: number } = {},
): Promise<string> {
  const dataUrl = await compressImageToDataUrl(file, opts);
  const { url } = await uploadImage({ data: { dataUrl, folder } });
  return url;
}
