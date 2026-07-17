/**
 * PdfTable — RTL-aware tables for @react-pdf/renderer.
 * Pattern from rkeaz-group: logical columns → visual reverse so
 * money lands on the physical left; Arabic text stays right-aligned.
 */

import React from "react";
import { Text, View } from "@react-pdf/renderer";

import {
  ar,
  arMixed,
  ltr,
  pdfDisplayValue,
} from "@/components/documents/pdf/arabicPDF";
import { PDF_FONT_FAMILY } from "@/components/documents/pdf/pdfFonts";
import {
  INK,
  PDF_PAGINATION,
  PdfMoneyText,
} from "@/components/documents/pdf/pdfKit";

export type PdfColKind =
  | "text"
  | "num"
  | "money"
  | "date"
  | "multiline"
  | "check";

export type PdfCellValue = string | number;

export type PdfColumn = {
  key: string;
  label: string;
  flex: number;
  kind?: PdfColKind;
  bold?: boolean;
};

const CELL_PAD = 4;

const headStyle = {
  flexDirection: "row" as const,
  backgroundColor: INK.paleGold,
  paddingVertical: 8,
  paddingHorizontal: 8,
  alignItems: "flex-start" as const,
  borderBottomWidth: 2,
  borderBottomColor: INK.gold,
  marginBottom: 2,
};

const rowStyle = {
  flexDirection: "row" as const,
  paddingVertical: 8,
  paddingHorizontal: 8,
  borderBottomWidth: 1,
  borderBottomColor: INK.border,
  alignItems: "flex-start" as const,
};

const footStyle = {
  flexDirection: "row" as const,
  paddingVertical: 8,
  paddingHorizontal: 8,
  backgroundColor: INK.paleGold,
  borderTopWidth: 1.5,
  borderTopColor: INK.gold,
  marginTop: 1,
  borderRadius: 2,
  alignItems: "flex-start" as const,
};

/** Reverse so the last logical column (usually money) sits on the physical left. */
function visualCols(columns: PdfColumn[]): PdfColumn[] {
  return [...columns].reverse();
}

const rowPresenceAhead = PDF_PAGINATION.minRowHeight;
const headPresenceAhead =
  PDF_PAGINATION.tableHead + PDF_PAGINATION.minRowHeight;

function alignFor(kind: PdfColKind): "left" | "right" | "center" {
  if (kind === "money") return "left";
  if (kind === "num" || kind === "date" || kind === "check") return "center";
  return "right";
}

export function PdfTh({
  flex,
  kind = "text",
  children,
  compact = false,
}: {
  flex: number;
  kind?: PdfColKind;
  children: string;
  compact?: boolean;
}) {
  return (
    <View style={{ flex, paddingHorizontal: CELL_PAD }}>
      <Text
        wrap
        style={{
          color: INK.goldDeep,
          fontSize: compact ? 7.5 : 8.5,
          fontWeight: 700,
          textAlign: alignFor(kind),
          lineHeight: 1.4,
          fontFamily: PDF_FONT_FAMILY,
        }}
      >
        {ar(children)}
      </Text>
    </View>
  );
}

function PdfTd({
  flex,
  kind = "text",
  bold = false,
  color,
  children,
  compact = false,
}: {
  flex: number;
  kind?: PdfColKind;
  bold?: boolean;
  color?: string;
  children: string | number;
  compact?: boolean;
}) {
  const isNumeric = kind === "num" || kind === "date" || kind === "check";
  const isMultiline = kind === "multiline";
  const raw = String(children ?? "");
  const text =
    raw === "—" || raw === ""
      ? raw
      : isNumeric
        ? ltr(raw)
        : isMultiline
          ? arMixed(raw)
          : pdfDisplayValue(raw);

  return (
    <View style={{ flex, paddingHorizontal: CELL_PAD }}>
      <Text
        wrap
        style={{
          fontSize: isMultiline ? (compact ? 7.5 : 8) : compact ? 8 : 9,
          fontWeight: bold ? 700 : 400,
          color: color || INK.text,
          textAlign: alignFor(kind),
          lineHeight: isMultiline ? 1.55 : 1.45,
          fontFamily: PDF_FONT_FAMILY,
        }}
      >
        {text}
      </Text>
    </View>
  );
}

function PdfTdMoney({
  flex,
  amount,
  currency,
  color,
}: {
  flex: number;
  amount: number;
  currency: string;
  color?: string;
}) {
  return (
    <View
      style={{
        flex,
        paddingHorizontal: CELL_PAD,
        justifyContent: "flex-start",
        alignItems: "flex-start",
      }}
    >
      <PdfMoneyText
        amount={amount}
        currency={currency}
        style={color ? { color } : undefined}
      />
    </View>
  );
}

export function PdfTableHead({
  columns,
  compact = false,
  fixed = false,
}: {
  columns: PdfColumn[];
  compact?: boolean;
  fixed?: boolean;
}) {
  const cols = visualCols(columns);
  return (
    <View style={headStyle} fixed={fixed || undefined}>
      {cols.map((c) => (
        <PdfTh key={c.key} flex={c.flex} kind={c.kind} compact={compact}>
          {c.label}
        </PdfTh>
      ))}
    </View>
  );
}

export function PdfSectionTitle({
  children,
  compact = false,
}: {
  children: string;
  compact?: boolean;
}) {
  return (
    <Text
      style={{
        fontSize: compact ? 9 : 10.5,
        fontWeight: 700,
        color: INK.goldDeep,
        marginBottom: 6,
        marginTop: compact ? 6 : 12,
        paddingBottom: 4,
        borderBottomWidth: 1.5,
        borderBottomColor: INK.goldLine,
        textAlign: "right",
        fontFamily: PDF_FONT_FAMILY,
      }}
    >
      {ar(children)}
    </Text>
  );
}

export function PdfTable({
  columns,
  rows,
  currency = "د.ل",
  emptyMessage = "لا توجد بيانات",
  footer,
  moneyColor,
  repeatHeader = false,
  compact = false,
}: {
  columns: PdfColumn[];
  rows: Record<string, PdfCellValue>[];
  currency?: string;
  emptyMessage?: string;
  footer?: {
    label: string;
    values: Record<string, number>;
    colors?: Record<string, string>;
  };
  moneyColor?: string;
  /** Repeat column headers on each page when the table spans multiple pages */
  repeatHeader?: boolean;
  compact?: boolean;
}) {
  const cols = visualCols(columns);

  return (
    <View style={{ marginBottom: 4 }}>
      {repeatHeader ? (
        <>
          <View minPresenceAhead={headPresenceAhead} />
          <PdfTableHead columns={columns} compact={compact} fixed />
        </>
      ) : (
        <View style={headStyle} minPresenceAhead={headPresenceAhead}>
          {cols.map((c) => (
            <PdfTh key={c.key} flex={c.flex} kind={c.kind} compact={compact}>
              {c.label}
            </PdfTh>
          ))}
        </View>
      )}

      {rows.length === 0 ? (
        <Text
          style={{
            fontSize: 9,
            color: INK.muted,
            textAlign: "center",
            paddingVertical: 14,
            fontFamily: PDF_FONT_FAMILY,
          }}
        >
          {ar(emptyMessage)}
        </Text>
      ) : (
        rows.map((row, i) => (
          <View
            key={i}
            style={[rowStyle, i % 2 === 1 ? { backgroundColor: INK.zebra } : {}]}
            wrap={false}
            minPresenceAhead={rowPresenceAhead}
          >
            {cols.map((c) => {
              const kind = c.kind ?? "text";
              const val = row[c.key] ?? "";
              if (kind === "money") {
                if (val === "—" || val === "-" || val === "") {
                  return (
                    <PdfTd
                      key={c.key}
                      flex={c.flex}
                      kind="text"
                      compact={compact}
                    >
                      —
                    </PdfTd>
                  );
                }
                const n =
                  typeof val === "number"
                    ? val
                    : parseFloat(String(val).replace(/,/g, ""));
                return (
                  <PdfTdMoney
                    key={c.key}
                    flex={c.flex}
                    amount={Number.isFinite(n) ? n : 0}
                    currency={currency}
                    color={moneyColor || footer?.colors?.[c.key]}
                  />
                );
              }
              return (
                <PdfTd
                  key={c.key}
                  flex={c.flex}
                  kind={kind}
                  bold={c.bold || kind === "multiline"}
                  compact={compact}
                >
                  {val}
                </PdfTd>
              );
            })}
          </View>
        ))
      )}

      {footer ? (
        <View
          style={footStyle}
          wrap={false}
          minPresenceAhead={PDF_PAGINATION.totalBar}
        >
          {visualCols(columns)
            .filter((c) => c.kind === "money" && footer.values[c.key] != null)
            .map((c) => (
              <PdfTdMoney
                key={c.key}
                flex={c.flex}
                amount={footer.values[c.key]}
                currency={currency}
                color={footer.colors?.[c.key]}
              />
            ))}
          <Text
            style={{
              flex: 1,
              fontSize: compact ? 8 : 9,
              fontWeight: 700,
              color: INK.text,
              textAlign: "right",
              fontFamily: PDF_FONT_FAMILY,
            }}
          >
            {ar(footer.label)}
          </Text>
        </View>
      ) : null}
    </View>
  );
}
