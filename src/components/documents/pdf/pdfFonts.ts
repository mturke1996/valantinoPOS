import { Font } from "@react-pdf/renderer";

/** Tajawal — same proven Arabic PDF stack as rkeaz-group */
export const PDF_FONT_FAMILY = "ValentinoPdf";

let registered = false;
let loadPromise: Promise<void> | null = null;

export function registerPdfFonts(): void {
  if (registered || typeof window === "undefined") return;
  try {
    const origin = window.location.origin;
    Font.register({
      family: PDF_FONT_FAMILY,
      fonts: [
        {
          src: `${origin}/fonts/Tajawal-Regular.ttf`,
          fontWeight: 400,
          fontStyle: "normal",
        },
        {
          src: `${origin}/fonts/Tajawal-Bold.ttf`,
          fontWeight: 700,
          fontStyle: "normal",
        },
      ],
    });
    Font.registerHyphenationCallback((word) => [word]);
    registered = true;
  } catch {
    /* duplicate registration is fine */
  }
}

export async function ensurePdfFontsLoaded(): Promise<void> {
  if (typeof window === "undefined") return;
  if (!loadPromise) {
    loadPromise = (async () => {
      registerPdfFonts();
      try {
        await Promise.all([
          Font.load({
            fontFamily: PDF_FONT_FAMILY,
            fontWeight: 400,
            fontStyle: "normal",
          }),
          Font.load({
            fontFamily: PDF_FONT_FAMILY,
            fontWeight: 700,
            fontStyle: "normal",
          }),
        ]);
      } catch (error) {
        const detail =
          error instanceof Error ? error.message : "unknown font error";
        throw new Error(
          `تعذر تحميل خط PDF (Tajawal). تأكد من وجود الملفات في /fonts. ${detail}`,
        );
      }
    })().catch((err) => {
      loadPromise = null;
      throw err;
    });
  }
  return loadPromise;
}

if (typeof window !== "undefined") {
  registerPdfFonts();
}
