import { describe, expect, it } from "vitest";

import { parseTelegramChatIds } from "@/lib/telegram/chat-ids";

describe("parseTelegramChatIds", () => {
  it("parses a single id", () => {
    expect(parseTelegramChatIds("123456789")).toEqual(["123456789"]);
  });

  it("parses multiple ids from mixed separators", () => {
    expect(parseTelegramChatIds("11111, 22222;33333\n-100444")).toEqual([
      "11111",
      "22222",
      "33333",
      "-100444",
    ]);
  });

  it("deduplicates and ignores invalid tokens", () => {
    expect(parseTelegramChatIds(["11111", "11111", "abc", "12"])).toEqual([
      "11111",
    ]);
  });

  it("accepts number arrays", () => {
    expect(parseTelegramChatIds([123456789, -100987])).toEqual([
      "123456789",
      "-100987",
    ]);
  });
});
