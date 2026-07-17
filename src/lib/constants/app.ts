/** Production app URL — Valentino POS on Vercel */
export const PRODUCTION_APP_URL = "https://valantino-pos.vercel.app";

/** Resolve the public app base URL (no trailing slash) */
export function resolveAppBaseUrl(override?: string | null): string {
  const raw =
    override?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    PRODUCTION_APP_URL;
  const withProtocol = raw.startsWith("http")
    ? raw
    : `https://${raw.replace(/^\/+/, "")}`;
  return withProtocol.replace(/\/+$/, "");
}
