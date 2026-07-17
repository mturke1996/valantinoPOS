/**
 * Client-side prepare step before posting to /api/upload/image.
 * - Keeps original file when already high-quality and within safe size
 * - Downscales only huge images (max edge 4096) at high WebP/JPEG quality
 * - Caps payload for Vercel serverless body limits (~4.5MB)
 */

/** Soft cap so multipart + base64 re-encode stays under Vercel body limits */
export const UPLOAD_SAFE_MAX_BYTES = 3.5 * 1024 * 1024;
/** Absolute client refusal — ImgBB max is 32MB */
export const UPLOAD_HARD_MAX_BYTES = 32 * 1024 * 1024;
/** Keep product photos sharp; only shrink beyond this edge */
export const UPLOAD_MAX_EDGE = 4096;
export const UPLOAD_ENCODE_QUALITY = 0.92;

const SUPPORTED_INPUT = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
]);

export type PrepareUploadResult = {
  file: File;
  optimized: boolean;
  originalBytes: number;
  outputBytes: number;
  width: number | null;
  height: number | null;
};

function baseName(fileName: string): string {
  return fileName.replace(/\.[^.]+$/, "") || "product";
}

async function encodeCanvas(
  canvas: HTMLCanvasElement,
  type: "image/webp" | "image/jpeg",
  quality: number,
): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), type, quality);
  });
}

export async function prepareImageForUpload(
  file: File,
): Promise<PrepareUploadResult> {
  const originalBytes = file.size;
  const mime = (file.type || "").toLowerCase();

  if (!mime.startsWith("image/") && !SUPPORTED_INPUT.has(mime)) {
    throw new Error("الملف ليس صورة");
  }
  if (originalBytes > UPLOAD_HARD_MAX_BYTES) {
    throw new Error("حجم الصورة كبير جداً — الحد الأقصى 32 ميجابايت");
  }

  // Keep animated GIFs intact when they fit the safe payload
  if (mime === "image/gif") {
    if (originalBytes > UPLOAD_SAFE_MAX_BYTES) {
      throw new Error(
        "ملف GIF كبير جداً للرفع المباشر — استخدم JPG/PNG/WebP بجودة عالية",
      );
    }
    return {
      file,
      optimized: false,
      originalBytes,
      outputBytes: originalBytes,
      width: null,
      height: null,
    };
  }

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    // Browser can't decode (e.g. some HEIC) — try raw upload if small enough
    if (originalBytes <= UPLOAD_SAFE_MAX_BYTES) {
      return {
        file,
        optimized: false,
        originalBytes,
        outputBytes: originalBytes,
        width: null,
        height: null,
      };
    }
    throw new Error(
      "تعذّر قراءة الصورة — جرّب تصديرها كـ JPG أو PNG بجودة عالية",
    );
  }

  const srcW = bitmap.width;
  const srcH = bitmap.height;
  const longest = Math.max(srcW, srcH);
  const needsResize = longest > UPLOAD_MAX_EDGE;
  const needsCompress = originalBytes > UPLOAD_SAFE_MAX_BYTES;

  if (!needsResize && !needsCompress) {
    bitmap.close();
    return {
      file,
      optimized: false,
      originalBytes,
      outputBytes: originalBytes,
      width: srcW,
      height: srcH,
    };
  }

  let targetW = srcW;
  let targetH = srcH;
  if (needsResize) {
    const scale = UPLOAD_MAX_EDGE / longest;
    targetW = Math.max(1, Math.round(srcW * scale));
    targetH = Math.max(1, Math.round(srcH * scale));
  }

  const canvas = document.createElement("canvas");
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext("2d", { alpha: true });
  if (!ctx) {
    bitmap.close();
    throw new Error("تعذّر تجهيز الصورة للرفع");
  }
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, 0, 0, targetW, targetH);
  bitmap.close();

  let quality = UPLOAD_ENCODE_QUALITY;
  let blob =
    (await encodeCanvas(canvas, "image/webp", quality)) ??
    (await encodeCanvas(canvas, "image/jpeg", quality));

  // If still oversized, gently step quality down (still visually high)
  while (blob && blob.size > UPLOAD_SAFE_MAX_BYTES && quality > 0.78) {
    quality -= 0.04;
    blob =
      (await encodeCanvas(canvas, "image/webp", quality)) ??
      (await encodeCanvas(canvas, "image/jpeg", quality));
  }

  // Last resort: shrink edge further while staying sharp
  if (blob && blob.size > UPLOAD_SAFE_MAX_BYTES) {
    try {
      const mid = await createImageBitmap(blob);
      const scale = Math.sqrt(UPLOAD_SAFE_MAX_BYTES / blob.size) * 0.92;
      const w2 = Math.max(1, Math.round(mid.width * scale));
      const h2 = Math.max(1, Math.round(mid.height * scale));
      canvas.width = w2;
      canvas.height = h2;
      ctx.drawImage(mid, 0, 0, w2, h2);
      mid.close();
      blob =
        (await encodeCanvas(canvas, "image/webp", 0.88)) ??
        (await encodeCanvas(canvas, "image/jpeg", 0.88));
      targetW = w2;
      targetH = h2;
    } catch {
      // keep previous blob attempt
    }
  }

  if (!blob) {
    throw new Error("تعذّر تحويل الصورة للرفع");
  }
  if (blob.size > UPLOAD_SAFE_MAX_BYTES) {
    throw new Error(
      "الصورة ما زالت كبيرة بعد التحسين — قلّل الدقة يدوياً ثم أعد المحاولة",
    );
  }

  const outType = (blob.type || "image/webp") as string;
  const ext = outType.includes("jpeg") ? "jpg" : "webp";
  const outFile = new File([blob], `${baseName(file.name)}.${ext}`, {
    type: outType,
    lastModified: Date.now(),
  });

  return {
    file: outFile,
    optimized: true,
    originalBytes,
    outputBytes: outFile.size,
    width: targetW,
    height: targetH,
  };
}
