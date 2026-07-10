export interface ImgbbUploadResult {
  url: string;
  displayUrl: string;
  thumbUrl: string;
  mediumUrl: string;
  deleteUrl: string | null;
}

export interface ImgbbApiResponse {
  success: boolean;
  status: number;
  data?: {
    url: string;
    display_url: string;
    delete_url?: string;
    image?: { url: string };
    thumb?: { url: string };
    medium?: { url: string };
  };
  error?: { message?: string };
}

export function parseImgbbResponse(body: ImgbbApiResponse): ImgbbUploadResult {
  if (!body.success || !body.data) {
    throw new Error(body.error?.message ?? "فشل رفع الصورة إلى ImgBB");
  }
  const data = body.data;
  return {
    url: data.url,
    displayUrl: data.display_url,
    thumbUrl: data.thumb?.url ?? data.display_url,
    mediumUrl: data.medium?.url ?? data.display_url,
    deleteUrl: data.delete_url ?? null,
  };
}
