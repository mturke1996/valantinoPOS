-- Staff invites + profile linking for new accounts

CREATE TABLE IF NOT EXISTS branch_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  role_key TEXT NOT NULL CHECK (
    role_key IN ('manager', 'cashier', 'sales', 'warehouse', 'accountant', 'delivery')
  ),
  created_by UUID REFERENCES user_profiles(id),
  expires_at TIMESTAMPTZ NOT NULL,
  used_by UUID REFERENCES user_profiles(id),
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (branch_id, code)
);

CREATE INDEX IF NOT EXISTS idx_branch_invites_code
  ON branch_invites (upper(code))
  WHERE used_at IS NULL;

ALTER TABLE branch_invites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS invites_read_manager ON branch_invites;
CREATE POLICY invites_read_manager ON branch_invites
  FOR SELECT TO authenticated
  USING (
    branch_id = (SELECT public.app_current_branch_id()) AND
    (SELECT public.app_has_role(ARRAY['manager']))
  );

DROP POLICY IF EXISTS invites_write_manager ON branch_invites;
CREATE POLICY invites_write_manager ON branch_invites
  FOR INSERT TO authenticated
  WITH CHECK (
    branch_id = (SELECT public.app_current_branch_id()) AND
    (SELECT public.app_has_role(ARRAY['manager']))
  );

CREATE OR REPLACE FUNCTION public.manager_create_invite(
  p_role_key TEXT DEFAULT 'cashier',
  p_expires_hours INT DEFAULT 168
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_branch_id UUID;
  v_code TEXT;
BEGIN
  IF NOT (SELECT public.app_has_role(ARRAY['manager'])) THEN
    RAISE EXCEPTION 'صلاحية المدير مطلوبة';
  END IF;

  v_branch_id := (SELECT public.app_current_branch_id());
  IF v_branch_id IS NULL THEN
    RAISE EXCEPTION 'لا يوجد فرع مرتبط';
  END IF;

  IF p_role_key NOT IN ('manager', 'cashier', 'sales', 'warehouse', 'accountant', 'delivery') THEN
    RAISE EXCEPTION 'دور غير صالح';
  END IF;

  v_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));

  INSERT INTO public.branch_invites (
    branch_id, code, role_key, created_by, expires_at
  )
  VALUES (
    v_branch_id,
    v_code,
    p_role_key,
    auth.uid(),
    now() + make_interval(hours => greatest(p_expires_hours, 1))
  );

  RETURN v_code;
END;
$$;

CREATE OR REPLACE FUNCTION public.redeem_branch_invite(
  p_code TEXT,
  p_full_name TEXT DEFAULT NULL,
  p_phone TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_invite public.branch_invites%ROWTYPE;
  v_branch_id UUID;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'يجب تسجيل الدخول أولاً';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.user_profiles WHERE id = v_user_id AND is_active
  ) THEN
    RETURN (SELECT branch_id FROM public.user_profiles WHERE id = v_user_id LIMIT 1);
  END IF;

  SELECT *
    INTO v_invite
    FROM public.branch_invites
   WHERE upper(code) = upper(trim(p_code))
     AND used_at IS NULL
     AND expires_at > now()
   LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'رمز الدعوة غير صالح أو منتهي';
  END IF;

  INSERT INTO public.user_profiles (
    id, branch_id, role_key, full_name, phone, is_active
  )
  VALUES (
    v_user_id,
    v_invite.branch_id,
    v_invite.role_key,
    COALESCE(NULLIF(trim(p_full_name), ''), 'موظف جديد'),
    NULLIF(trim(p_phone), ''),
    true
  );

  UPDATE public.branch_invites
     SET used_by = v_user_id,
         used_at = now()
   WHERE id = v_invite.id;

  RETURN v_invite.branch_id;
END;
$$;

REVOKE ALL ON FUNCTION public.manager_create_invite(TEXT, INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.manager_create_invite(TEXT, INT) TO authenticated;

REVOKE ALL ON FUNCTION public.redeem_branch_invite(TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.redeem_branch_invite(TEXT, TEXT, TEXT) TO authenticated;

GRANT SELECT, INSERT ON branch_invites TO authenticated;
