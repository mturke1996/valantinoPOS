import QRCode from "qrcode";

import { resolveDocLogoUrl } from "@/components/documents/brand";
import type { Settings } from "@/types";

/** Same-origin, data URIs, or known logo hosts (matches next.config image/CSP allowlist). */
function isAllowedLogoUrl(pathOrUrl: string): boolean {
  if (pathOrUrl.startsWith("data:")) return true;
  if (pathOrUrl.startsWith("/")) return true;

  try {
    const origin =
      typeof window !== "undefined"
        ? window.location.origin
        : "http://localhost";
    const parsed = new URL(pathOrUrl, origin);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return false;
    }
    if (typeof window !== "undefined" && parsed.origin === window.location.origin) {
      return true;
    }
    const host = parsed.hostname.toLowerCase();
    return (
      host === "i.ibb.co" ||
      host.endsWith(".ibb.co") ||
      host.endsWith(".supabase.co")
    );
  } catch {
    return false;
  }
}

async function fetchAsDataUri(pathOrUrl: string): Promise<string | null> {
  if (typeof window === "undefined") return null;
  if (!isAllowedLogoUrl(pathOrUrl)) return null;
  try {
    const url =
      pathOrUrl.startsWith("http") || pathOrUrl.startsWith("data:")
        ? pathOrUrl
        : `${window.location.origin}${pathOrUrl.startsWith("/") ? "" : "/"}${pathOrUrl}`;
    const res = await fetch(url, {
      credentials: "same-origin",
      cache: "force-cache",
    });
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise<string>((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => resolve(fr.result as string);
      fr.onerror = () => reject(fr.error);
      fr.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export async function fetchLogoDataUri(
  settings: Settings,
): Promise<string | null> {
  return fetchAsDataUri(resolveDocLogoUrl(settings));
}

export async function buildQrDataUri(
  payload: string | null | undefined,
  size = 160,
): Promise<string | null> {
  if (!payload) return null;
  try {
    return await QRCode.toDataURL(payload, {
      errorCorrectionLevel: "M",
      margin: 1,
      width: size,
      color: { dark: "#1F1F1F", light: "#FFFFFF" },
    });
  } catch {
    return null;
  }
}

/** Exported for unit tests */
export { isAllowedLogoUrl };
