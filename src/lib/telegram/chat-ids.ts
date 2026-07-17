/** Parse one or many Telegram chat ids from string / array / number. */
export function parseTelegramChatIds(input: unknown): string[] {
  const raw: string[] = [];

  if (Array.isArray(input)) {
    for (const item of input) {
      if (typeof item === "string" || typeof item === "number") {
        raw.push(String(item));
      }
    }
  } else if (typeof input === "string" || typeof input === "number") {
    raw.push(String(input));
  }

  const ids = new Set<string>();
  for (const chunk of raw) {
    for (const part of chunk.split(/[\s,;|/]+/)) {
      const trimmed = part.trim();
      if (!trimmed) continue;
      // Telegram chat ids: digits, optional leading minus for groups
      if (!/^-?\d{5,20}$/.test(trimmed)) continue;
      ids.add(trimmed);
    }
  }
  return [...ids];
}
