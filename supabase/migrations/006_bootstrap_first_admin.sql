-- Bootstrap Libya branch + first admin profile for new Supabase Auth users
-- Fixes login when auth.users exists but user_profiles is empty.

CREATE OR REPLACE FUNCTION public.provision_first_admin_profile(
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
  v_branch_id UUID;
  v_existing_branch UUID;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'يجب تسجيل الدخول أولاً';
  END IF;

  SELECT branch_id
    INTO v_existing_branch
    FROM public.user_profiles
   WHERE id = v_user_id
     AND is_active
   LIMIT 1;

  IF v_existing_branch IS NOT NULL THEN
    RETURN v_existing_branch;
  END IF;

  IF EXISTS (SELECT 1 FROM public.user_profiles) THEN
    RAISE EXCEPTION 'المؤسسة مُهيّأة مسبقاً. اطلب من المدير ربط حسابك بفرع.';
  END IF;

  INSERT INTO public.branches (name, address, phone, is_active)
  VALUES (
    'فالنتينو للشوكولاتة',
    'طرابلس — ليبيا',
    COALESCE(NULLIF(trim(p_phone), ''), '+218'),
    true
  )
  RETURNING id INTO v_branch_id;

  INSERT INTO public.user_profiles (
    id,
    branch_id,
    role_key,
    full_name,
    phone,
    is_active
  )
  VALUES (
    v_user_id,
    v_branch_id,
    'manager',
    COALESCE(
      NULLIF(trim(p_full_name), ''),
      NULLIF(trim((SELECT raw_user_meta_data->>'full_name' FROM auth.users WHERE id = v_user_id)), ''),
      NULLIF(trim((SELECT email FROM auth.users WHERE id = v_user_id)), ''),
      'مدير النظام'
    ),
    NULLIF(trim(p_phone), ''),
    true
  );

  INSERT INTO public.settings (branch_id, key, value)
  VALUES
    (
      v_branch_id,
      'app',
      jsonb_build_object(
        'country', 'LY',
        'currency', 'LYD',
        'currencySymbol', 'د.ل',
        'locale', 'ar-LY',
        'taxRate', 0,
        'orderNumberPrefix', 'VAL',
        'invoiceNumberPrefix', 'INV',
        'loyaltyPointsPerSar', 1,
        'loyaltyRedeemRate', 0.05
      )
    )
  ON CONFLICT DO NOTHING;

  RETURN v_branch_id;
END;
$$;

REVOKE ALL ON FUNCTION public.provision_first_admin_profile(TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.provision_first_admin_profile(TEXT, TEXT) TO authenticated;
