/** Libya-first defaults for Valentino POS */
export const LIBYA_LOCALE = {
  country: "LY",
  countryName: "ليبيا",
  currency: "LYD",
  currencySymbol: "د.ل",
  locale: "ar-LY",
  phonePrefix: "+218",
  timezone: "Africa/Tripoli",
} as const;

export const NUMBER_FORMAT_OPTIONS: Intl.NumberFormatOptions = {
  numberingSystem: "latn",
};

export const CURRENCY_FORMAT_OPTIONS: Intl.NumberFormatOptions = {
  numberingSystem: "latn",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
};
