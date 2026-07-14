import { NextResponse } from "next/server";

import { parseImgbbResponse, type ImgbbApiResponse } from "@/lib/imgbb";
import { createClient } from "@/lib/supabase/server";

const MAX_BYTES = 8 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);
const UPLOAD_ROLES = new Set([
  "manager",
  "warehouse",
  "sales",
  "cashier",
]);

const MAGIC: Array<{ mime: string; bytes: number[] }> = [
  { mime: "image/jpeg", bytes: [0xff, 0xd8, 0xff] },
  { mime: "image/png", bytes: [0x89, 0x50, 0x4e, 0x47] },
  { mime: "image/gif", bytes: [0x47, 0x49, 0x46, 0x38] },
  { mime: "image/webp", bytes: [0x52, 0x49, 0x46, 0x46] },
];

function sniffImageMime(buffer: Buffer): string | null {
  for (const candidate of MAGIC) {
    if (
      candidate.bytes.every((byte, index) => buffer[index] === byte) &&
      (candidate.mime !== "image/webp" ||
        buffer.slice(8, 12).toString("ascii") === "WEBP")
    ) {
      return candidate.mime;
    }
  }
  return null;
}

export async function POST(request: Request) {
  const supabase = await createClient();
  if (!supabase) {
    return NextResponse.json(
      { error: "لم يتم إعداد Supabase" },
      { status: 503 },
    );
  }
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("role_key, is_active")
    .eq("id", user.id)
    .maybeSingle();

  if (
    !profile ||
    profile.is_active === false ||
    !UPLOAD_ROLES.has(String(profile.role_key))
  ) {
    return NextResponse.json({ error: "لا تملك صلاحية رفع الصور" }, { status: 403 });
  }

  const apiKey = process.env.IMGBB_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "مفتاح ImgBB غير مُعد في البيئة (IMGBB_API_KEY)" },
      { status: 503 },
    );
  }

  const form = await request.formData();
  const file = form.get("image");
  const name = String(form.get("name") ?? "valentino-upload").slice(0, 80);

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "لم يُرسل ملف صورة" }, { status: 400 });
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json(
      { error: "نوع الملف غير مدعوم — استخدم JPG أو PNG أو WebP" },
      { status: 400 },
    );
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "حجم الصورة يجب ألا يتجاوز 8 ميجابايت" },
      { status: 400 },
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const sniffed = sniffImageMime(buffer);
  if (!sniffed || !ALLOWED_TYPES.has(sniffed)) {
    return NextResponse.json(
      { error: "محتوى الملف ليس صورة صالحة" },
      { status: 400 },
    );
  }

  const body = new FormData();
  body.append("key", apiKey);
  body.append("image", buffer.toString("base64"));
  body.append("name", name);

  const imgbbRes = await fetch("https://api.imgbb.com/1/upload", {
    method: "POST",
    body,
  });

  const json = (await imgbbRes.json()) as ImgbbApiResponse;
  if (!imgbbRes.ok) {
    return NextResponse.json(
      { error: json.error?.message ?? "فشل الاتصال بـ ImgBB" },
      { status: imgbbRes.status },
    );
  }

  try {
    const uploaded = parseImgbbResponse(json);
    return NextResponse.json(uploaded);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "استجابة غير متوقعة من ImgBB",
      },
      { status: 502 },
    );
  }
}
