import { createClient as createAdminClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

const VALID_ROLES = [
  "manager",
  "cashier",
  "sales",
  "warehouse",
  "accountant",
  "delivery",
] as const;

export async function POST(request: Request) {
  const supabase = await createClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase غير مُعد" }, { status: 503 });
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  const { data: managerProfile, error: profileError } = await supabase
    .from("user_profiles")
    .select("branch_id, role_key, is_active")
    .eq("id", user.id)
    .maybeSingle();

  if (
    profileError ||
    !managerProfile?.is_active ||
    managerProfile.role_key !== "manager"
  ) {
    return NextResponse.json({ error: "صلاحية المدير مطلوبة" }, { status: 403 });
  }

  const body = (await request.json()) as {
    email?: string;
    password?: string;
    fullName?: string;
    roleKey?: string;
    phone?: string;
  };

  const email = body.email?.trim().toLowerCase();
  const password = body.password ?? "";
  const fullName = body.fullName?.trim();
  const roleKey = body.roleKey ?? "cashier";
  const phone = body.phone?.trim() || null;

  if (!email || !password || password.length < 10 || !fullName) {
    return NextResponse.json(
      { error: "أدخل البريد والاسم وكلمة مرور (10 أحرف على الأقل)" },
      { status: 400 },
    );
  }

  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    return NextResponse.json(
      { error: "كلمة المرور يجب أن تحتوي حروفاً وأرقاماً" },
      { status: 400 },
    );
  }

  if (!VALID_ROLES.includes(roleKey as (typeof VALID_ROLES)[number])) {
    return NextResponse.json({ error: "دور غير صالح" }, { status: 400 });
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!serviceKey || !url) {
    return NextResponse.json(
      {
        error:
          "أضف SUPABASE_SERVICE_ROLE_KEY في .env.local لإنشاء حسابات من لوحة المدير",
      },
      { status: 503 },
    );
  }

  const admin = createAdminClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: created, error: createError } =
    await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    });

  if (createError || !created.user) {
    return NextResponse.json(
      { error: createError?.message ?? "فشل إنشاء المستخدم" },
      { status: 400 },
    );
  }

  const { error: insertError } = await admin.from("user_profiles").insert({
    id: created.user.id,
    branch_id: managerProfile.branch_id,
    role_key: roleKey,
    full_name: fullName,
    phone,
    is_active: true,
  });

  if (insertError) {
    await admin.auth.admin.deleteUser(created.user.id);
    return NextResponse.json(
      { error: insertError.message },
      { status: 400 },
    );
  }

  return NextResponse.json({
    ok: true,
    userId: created.user.id,
    email,
    fullName,
    roleKey,
  });
}
