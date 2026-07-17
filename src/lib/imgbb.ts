export interface ImgbbUploadResult {
  /** Full-resolution original image URL — prefer this for product storage */
  url: string;
  /** Medium/display variant (lower resolution) — previews only */
  displayUrl: string;
  thumbUrl: string;
  mediumUrl: string;
  deleteUrl: string | null;
  width: number | null;
  height: number | null;
  size: number | null;
}

export interface ImgbbApiResponse {
  success: boolean;
  status: number;
  data?: {
    url: string;
    display_url: string;
    delete_url?: string;
    width?: string | number;
    height?: string | number;
    size?: string | number;
    image?: { url: string };
    thumb?: { url: string };
    medium?: { url: string };
  };
  error?: { message?: string };
}

function toInt(value: string | number | undefined): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

export function parseImgbbResponse(body: ImgbbApiResponse): ImgbbUploadResult {
  if (!body.success || !body.data) {
    throw new Error(body.error?.message ?? "فشل رفع الصورة إلى ImgBB");
  }
  const data = body.data;
  // ImgBB: `image.url` / `url` = original; `display_url` / `medium` = smaller variant
  const originalUrl = data.image?.url || data.url;
  if (!originalUrl) {
    throw new Error("استجابة ImgBB بدون رابط صورة أصلية");
  }
  return {
    url: originalUrl,
    displayUrl: data.display_url || originalUrl,
    thumbUrl: data.thumb?.url ?? data.display_url ?? originalUrl,
    mediumUrl: data.medium?.url ?? data.display_url ?? originalUrl,
    deleteUrl: data.delete_url ?? null,
    width: toInt(data.width),
    height: toInt(data.height),
    size: toInt(data.size),
  };
}

/** Best URL to persist for products / logos (always original when available). */
export function pickBestImageUrl(result: ImgbbUploadResult): string {
  return result.url || result.displayUrl;
}
