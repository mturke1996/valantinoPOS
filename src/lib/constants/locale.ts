/** Libya-first defaults for Valentino POS */
export const LIBYA_LOCALE = {
  country: "LY",
  countryName: "ليبيا",
  currency: "LYD",
  currencySymbol: "د.ل",
  locale: "ar-LY",
  phonePrefix: "+218",
  /** Canonical store contact — local 0925620266 → E.164 */
  defaultBranchPhone: "+218925620266",
  defaultBranchPhoneLocal: "0925620266",
  timezone: "Africa/Tripoli",
} as const;

/** Display local Libyan form when number matches the store default */
export function formatBranchPhoneDisplay(phone: string | null | undefined): string {
  const raw = (phone ?? "").trim();
  if (!raw) return LIBYA_LOCALE.defaultBranchPhoneLocal;
  const digits = raw.replace(/\D/g, "");
  if (
    digits === "218925620266" ||
    digits === "0925620266" ||
    digits === "925620266"
  ) {
    return LIBYA_LOCALE.defaultBranchPhoneLocal;
  }
  return raw;
}

export const NUMBER_FORMAT_OPTIONS: Intl.NumberFormatOptions = {
  numberingSystem: "latn",
};

export const CURRENCY_FORMAT_OPTIONS: Intl.NumberFormatOptions = {
  numberingSystem: "latn",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
};
