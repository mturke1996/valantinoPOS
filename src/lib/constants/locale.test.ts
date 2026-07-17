import { describe, expect, it } from "vitest";

import {
  formatBranchPhoneDisplay,
  LIBYA_LOCALE,
} from "@/lib/constants/locale";

describe("store phone locale", () => {
  it("uses the canonical Valentino number", () => {
    expect(LIBYA_LOCALE.defaultBranchPhone).toBe("+218925620266");
    expect(LIBYA_LOCALE.defaultBranchPhoneLocal).toBe("0925620266");
  });

  it("displays the local form for matching numbers", () => {
    expect(formatBranchPhoneDisplay("+218925620266")).toBe("0925620266");
    expect(formatBranchPhoneDisplay("0925620266")).toBe("0925620266");
    expect(formatBranchPhoneDisplay("925620266")).toBe("0925620266");
  });

  it("keeps unrelated numbers as-is", () => {
    expect(formatBranchPhoneDisplay("+218911000000")).toBe("+218911000000");
  });
});
