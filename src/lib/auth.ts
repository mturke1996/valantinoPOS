import type { UserRole } from "@/config/navigation";
import {
  AUTH_COOKIE_NAME,
  AUTH_DEMO_COOKIE_VALUE,
  AUTH_STORAGE_KEY,
} from "@/lib/auth.constants";

export {
  AUTH_COOKIE_NAME,
  AUTH_DEMO_COOKIE_VALUE,
  AUTH_STORAGE_KEY,
} from "@/lib/auth.constants";

type AuthSource = "demo" | "supabase";

interface UserProfileRow {
  id: string;
  branch_id: string;
  role_key: string;
  full_name: string;
  is_active: boolean;
}

export interface AuthSession {
  userId: string;
  branchId: string;
  role: UserRole;
  name: string;
  source: AuthSource;
}

const USER_ROLES = new Set<UserRole>([
  "admin",
  "cashier",
  "sales",
  "warehouse",
  "accountant",
  "delivery",
]);

function mapProfileRole(roleKey: string): UserRole | null {
  if (roleKey === "manager") return "admin";
  return USER_ROLES.has(roleKey as UserRole) ? (roleKey as UserRole) : null;
}

function isAuthSession(value: unknown): value is AuthSession {
  if (!value || typeof value !== "object") return false;
  const session = value as Partial<AuthSession>;
  return (
    typeof session.userId === "string" &&
    typeof session.branchId === "string" &&
    typeof session.name === "string" &&
    USER_ROLES.has(session.role as UserRole) &&
    (session.source === "demo" || session.source === "supabase")
  );
}

export function getAuthSession(): AuthSession | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(AUTH_STORAGE_KEY);
  if (!raw) return null;
  try {
    const session: unknown = JSON.parse(raw);
    if (isAuthSession(session)) return session;
    localStorage.removeItem(AUTH_STORAGE_KEY);
    return null;
  } catch {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    return null;
  }
}

export function setAuthSession(session: AuthSession): void {
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
  if (session.source === "demo") {
    document.cookie = `${AUTH_COOKIE_NAME}=${AUTH_DEMO_COOKIE_VALUE}; path=/; max-age=${60 * 60 * 24}; SameSite=Strict`;
    return;
  }
  document.cookie = `${AUTH_COOKIE_NAME}=; path=/; max-age=0; SameSite=Strict`;
}

export function clearAuthSession(): void {
  localStorage.removeItem(AUTH_STORAGE_KEY);
  document.cookie = `${AUTH_COOKIE_NAME}=; path=/; max-age=0; SameSite=Strict`;
}

export async function getVerifiedSupabaseSession(): Promise<AuthSession | null> {
  try {
    const { createClient } = await import("@/lib/supabase/client");
    const supabase = createClient();
    if (!supabase) return null;

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) return null;

    const { data, error: profileError } = await supabase
      .from("user_profiles")
      .select("id, branch_id, role_key, full_name, is_active")
      .eq("id", user.id)
      .maybeSingle();

    let profile = data as UserProfileRow | null;
    let role = profile ? mapProfileRole(profile.role_key) : null;

    if (
      !profileError &&
      (!profile || !profile.is_active || !role)
    ) {
      const { error: provisionError } = await supabase.rpc(
        "provision_first_admin_profile",
        {
          p_full_name:
            (user.user_metadata?.full_name as string | undefined) ??
            user.email ??
            "مدير النظام",
        },
      );
      if (!provisionError) {
        const retry = await supabase
          .from("user_profiles")
          .select("id, branch_id, role_key, full_name, is_active")
          .eq("id", user.id)
          .maybeSingle();
        profile = retry.data as UserProfileRow | null;
        role = profile ? mapProfileRole(profile.role_key) : null;
      }
    }

    if (profileError || !profile?.is_active || !role) return null;

    const session: AuthSession = {
      userId: profile.id,
      branchId: profile.branch_id,
      role,
      name: profile.full_name,
      source: "supabase",
    };
    setAuthSession(session);
    return session;
  } catch {
    return null;
  }
}

export async function logout(): Promise<void> {
  try {
    const { createClient } = await import("@/lib/supabase/client");
    const supabase = createClient();
    if (supabase) {
      await supabase.auth.signOut();
    }
  } catch {
    // Supabase optional — local session cleared below
  }
  clearAuthSession();
}
