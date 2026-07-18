import { DOC_INK } from "@/components/documents/brand";
import type { DocumentNoteEntry } from "@/lib/documents/order-notes";

interface DocumentNotesBlockProps {
  entries: DocumentNoteEntry[];
  title?: string;
  compact?: boolean;
}

/** Print-ready notes panel for HTML invoice / receipt templates. */
export function DocumentNotesBlock({
  entries,
  title = "ملاحظات وتعليمات",
  compact = false,
}: DocumentNotesBlockProps) {
  if (entries.length === 0) return null;

  return (
    <div
      className={`overflow-hidden rounded-sm border ${compact ? "text-[10px]" : "text-[12px]"}`}
      style={{ borderColor: DOC_INK.goldLine, background: DOC_INK.paleGold }}
    >
      <div
        className={`border-b font-extrabold ${compact ? "px-3 py-2 text-[10px]" : "px-4 py-2.5 text-[11px]"}`}
        style={{
          borderColor: DOC_INK.goldLine,
          color: DOC_INK.goldDeep,
          background: "rgba(204,168,80,0.12)",
        }}
      >
        {title}
      </div>
      <div>
        {entries.map((entry, index) => (
          <div
            key={entry.key}
            className={compact ? "px-3 py-2" : "px-4 py-3"}
            style={{
              borderColor: DOC_INK.border,
              borderBottomWidth: index < entries.length - 1 ? 1 : 0,
            }}
          >
            <p
              className={`font-extrabold ${compact ? "text-[9px]" : "text-[10px]"}`}
              style={{ color: DOC_INK.goldDeep }}
            >
              {entry.label}
            </p>
            <p
              className={`mt-1 leading-relaxed ${compact ? "text-[10px]" : "text-[12px]"}`}
              style={{ color: DOC_INK.text }}
            >
              {entry.text}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
