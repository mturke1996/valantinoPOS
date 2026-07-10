import { createClient as createAdminClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

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
    return NextResponse.json({ error: "صلاحية المدير مطلوبة" }, { status: 403 });
  }

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("role_key, is_active")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.is_active || profile.role_key !== "manager") {
    return NextResponse.json({ error: "صلاحية المدير مطلوبة" }, { status: 403 });
  }

  const body = (await request.json()) as {
    roleKey?: string;
    expiresHours?: number;
  };

  const { data, error } = await supabase.rpc("manager_create_invite", {
    p_role_key: body.roleKey ?? "cashier",
    p_expires_hours: body.expiresHours ?? 168,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ code: data as string });
}
