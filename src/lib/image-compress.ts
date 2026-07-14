// Client-side image compression to a data URL (JPEG, base64).
// Keeps output small enough to store directly in a text column.
export async function compressImageToDataUrl(
  file: File,
  opts: { maxWidth?: number; maxHeight?: number; quality?: number } = {},
): Promise<string> {
  const { maxWidth = 1200, maxHeight = 1200, quality = 0.8 } = opts;
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
    return canvas.toDataURL("image/jpeg", quality);
  } finally {
    URL.revokeObjectURL(url);
  }
}
