-- Store phone + Telegram subscribers for order/event alerts

-- Canonical Valentino contact
UPDATE public.branches
SET phone = '+218925620266',
    updated_at = now()
WHERE phone IS NULL
   OR trim(phone) = ''
   OR phone IN ('+218', '+218911234567', '218911234567');

-- Ensure branch settings JSON carries the phone
UPDATE public.settings
SET value = jsonb_set(
  COALESCE(value, '{}'::jsonb),
  '{branchPhone}',
  '"+218925620266"'::jsonb,
  true
)
WHERE key = 'branch'
  AND (
    value->>'branchPhone' IS NULL
    OR trim(COALESCE(value->>'branchPhone', '')) = ''
    OR value->>'branchPhone' IN ('+218', '+218911234567')
    OR value->>'phone' IN ('+218', '+218911234567')
  );

-- Bootstrap new branches with the real store number
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
    COALESCE(NULLIF(trim(p_phone), ''), '+218925620266'),
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
        'loyaltyRedeemRate', 0.05,
        'walkInSalesEnabled', true,
        'whatsappCountryCode', '218',
        'autoWhatsAppOnSale', true,
        'telegramNotificationsEnabled', true,
        'defaultDeliveryFee', 15,
        'freeDeliveryThreshold', 200,
        'thermalPaperWidth', 80
      )
    ),
    (
      v_branch_id,
      'branch',
      jsonb_build_object(
        'branchName', 'فالنتينو للشوكولاتة',
        'branchAddress', 'طرابلس — ليبيا',
        'branchPhone', '+218925620266'
      )
    )
  ON CONFLICT DO NOTHING;

  RETURN v_branch_id;
END;
$$;

CREATE TABLE IF NOT EXISTS public.telegram_subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  chat_id BIGINT NOT NULL,
  label TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (branch_id, chat_id)
);

CREATE TABLE IF NOT EXISTS public.telegram_reminder_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  dedup_key TEXT NOT NULL,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (branch_id, dedup_key)
);

CREATE INDEX IF NOT EXISTS idx_telegram_subscribers_branch_active
  ON public.telegram_subscribers (branch_id)
  WHERE active;

ALTER TABLE public.telegram_subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.telegram_reminder_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS telegram_subscribers_manage ON public.telegram_subscribers;
CREATE POLICY telegram_subscribers_manage ON public.telegram_subscribers
  FOR ALL TO authenticated
  USING (
    branch_id IN (
      SELECT branch_id FROM public.user_profiles
      WHERE id = auth.uid() AND is_active AND role_key = 'manager'
    )
  )
  WITH CHECK (
    branch_id IN (
      SELECT branch_id FROM public.user_profiles
      WHERE id = auth.uid() AND is_active AND role_key = 'manager'
    )
  );

DROP POLICY IF EXISTS telegram_subscribers_read ON public.telegram_subscribers;
CREATE POLICY telegram_subscribers_read ON public.telegram_subscribers
  FOR SELECT TO authenticated
  USING (
    branch_id IN (
      SELECT branch_id FROM public.user_profiles
      WHERE id = auth.uid() AND is_active
    )
  );

DROP POLICY IF EXISTS telegram_reminder_log_manage ON public.telegram_reminder_log;
CREATE POLICY telegram_reminder_log_manage ON public.telegram_reminder_log
  FOR ALL TO authenticated
  USING (
    branch_id IN (
      SELECT branch_id FROM public.user_profiles
      WHERE id = auth.uid() AND is_active AND role_key = 'manager'
    )
  )
  WITH CHECK (
    branch_id IN (
      SELECT branch_id FROM public.user_profiles
      WHERE id = auth.uid() AND is_active AND role_key = 'manager'
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.telegram_subscribers TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.telegram_reminder_log TO authenticated;
GRANT ALL ON public.telegram_subscribers TO service_role;
GRANT ALL ON public.telegram_reminder_log TO service_role;
