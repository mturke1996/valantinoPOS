import { describe, expect, it } from "vitest";

import { parseImgbbResponse, pickBestImageUrl } from "@/lib/imgbb";

describe("imgbb response parsing", () => {
  it("prefers original image.url over display_url / medium", () => {
    const result = parseImgbbResponse({
      success: true,
      status: 200,
      data: {
        url: "https://i.ibb.co/original/full.jpg",
        display_url: "https://i.ibb.co/medium/display.jpg",
        image: { url: "https://i.ibb.co/original/full.jpg" },
        medium: { url: "https://i.ibb.co/medium/display.jpg" },
        thumb: { url: "https://i.ibb.co/thumb/small.jpg" },
        width: "3000",
        height: "2000",
        size: "2500000",
      },
    });

    expect(result.url).toBe("https://i.ibb.co/original/full.jpg");
    expect(result.displayUrl).toBe("https://i.ibb.co/medium/display.jpg");
    expect(pickBestImageUrl(result)).toBe("https://i.ibb.co/original/full.jpg");
    expect(result.width).toBe(3000);
  });
});
