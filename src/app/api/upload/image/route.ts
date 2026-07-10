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
  const base64 = buffer.toString("base64");

  const body = new FormData();
  body.append("key", apiKey);
  body.append("image", base64);
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
