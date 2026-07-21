import React from "react";
import { Image, StyleSheet, Text, View } from "@react-pdf/renderer";

import { DOC_INK } from "@/components/documents/brand";
import { ar, arMixed, ltr } from "@/components/documents/pdf/arabicPDF";
import { PDF_FONT_FAMILY } from "@/components/documents/pdf/pdfFonts";
import type { Settings } from "@/types";

export const INK = DOC_INK;

/**
 * Pagination reserves — keep flowing content clear of the fixed footer
 * and keep table heads / total bars atomic across page breaks.
 */
export const PDF_PAGINATION = {
  tableHead: 36,
  totalBar: 40,
  minRowHeight: 30,
  section: 40,
  footerBottom: 16,
  footerHeight: 58,
  footerReserve: 74,
} as const;

/** Formal documents — true ISO A4 only */
export type PdfPaperSize = "A4";

/**
 * Premium A4 print styles (Etlala / debtflow-pro geometry + Valentino gold).
 * ~12.7mm side margins, 9pt body, reserved footer zone.
 */
export function makePdfStyles() {
  const padX = 36;
  return StyleSheet.create({
    page: {
      fontFamily: PDF_FONT_FAMILY,
      fontSize: 9,
      color: INK.text,
      backgroundColor: INK.white,
      paddingTop: 20,
      paddingBottom: PDF_PAGINATION.footerReserve,
      paddingHorizontal: padX,
    },
    /**
     * In-flow full-bleed accent (not absolute/fixed).
     * Absolute gold bars were painting over the branch name in the PDF viewer.
     */
    goldBarWrap: {
      marginHorizontal: -padX,
      marginTop: -20,
      marginBottom: 14,
    },
    goldBar: {
      height: 3,
      backgroundColor: INK.gold,
    },
    goldBarAccent: {
      height: 0.75,
      backgroundColor: INK.goldDeep,
      marginTop: 1,
      opacity: 0.85,
    },
    headerRow: {
      flexDirection: "row-reverse",
      justifyContent: "space-between",
      alignItems: "flex-start",
      marginBottom: 0,
      paddingBottom: 12,
    },
    brandCol: {
      flexDirection: "row-reverse",
      alignItems: "center",
      gap: 12,
      flex: 1,
    },
    logo: {
      width: 72,
      height: 56,
      objectFit: "contain",
    },
    brandText: {
      alignItems: "flex-end",
      borderRightWidth: 1.5,
      borderRightColor: INK.goldLine,
      paddingRight: 10,
      maxWidth: 260,
    },
    branchName: {
      fontSize: 14,
      fontWeight: 700,
      fontFamily: PDF_FONT_FAMILY,
      color: INK.text,
      textAlign: "right",
      marginBottom: 2,
      lineHeight: 1.3,
    },
    branchContact: {
      fontSize: 8,
      fontFamily: PDF_FONT_FAMILY,
      color: INK.muted,
      textAlign: "right",
      marginBottom: 1,
      lineHeight: 1.35,
    },
    titleAr: {
      fontSize: 10,
      fontWeight: 700,
      fontFamily: PDF_FONT_FAMILY,
      color: INK.goldDeep,
      textAlign: "right",
      marginTop: 3,
    },
    metaCol: {
      alignItems: "flex-start",
      maxWidth: "38%",
    },
    badge: {
      backgroundColor: INK.paleGold,
      borderWidth: 1,
      borderColor: INK.goldLine,
      borderRadius: 2,
      paddingHorizontal: 8,
      paddingVertical: 3,
      marginBottom: 5,
    },
    badgeText: {
      fontSize: 8,
      fontWeight: 700,
      fontFamily: PDF_FONT_FAMILY,
      color: INK.goldDeep,
      letterSpacing: 1.2,
    },
    titleEnWatermark: {
      fontSize: 22,
      fontWeight: 700,
      fontFamily: PDF_FONT_FAMILY,
      color: "#D6C9A8",
      letterSpacing: 1.4,
      marginBottom: 2,
    },
    refLine: {
      fontSize: 12,
      fontWeight: 700,
      fontFamily: PDF_FONT_FAMILY,
      color: INK.text,
      marginBottom: 3,
    },
    contactLine: {
      fontSize: 8,
      fontFamily: PDF_FONT_FAMILY,
      color: INK.muted,
      textAlign: "left",
    },
    statusPill: {
      marginTop: 3,
      fontSize: 8.5,
      fontWeight: 700,
      fontFamily: PDF_FONT_FAMILY,
    },
    sectionTitle: {
      fontSize: 11,
      fontWeight: 700,
      fontFamily: PDF_FONT_FAMILY,
      color: INK.goldDeep,
      textAlign: "right",
      marginBottom: 8,
      marginTop: 12,
      paddingBottom: 4,
      borderBottomWidth: 1.5,
      borderBottomColor: INK.goldLine,
    },
    infoRow: {
      flexDirection: "row-reverse",
      justifyContent: "space-between",
      marginBottom: 14,
      gap: 12,
    },
    datesCol: { width: "36%" },
    dateRow: {
      flexDirection: "row-reverse",
      justifyContent: "space-between",
      marginBottom: 5,
    },
    dateLabel: {
      fontSize: 8,
      fontFamily: PDF_FONT_FAMILY,
      color: INK.faint,
      textAlign: "right",
    },
    dateVal: {
      fontSize: 9,
      fontWeight: 700,
      fontFamily: PDF_FONT_FAMILY,
      color: INK.text,
      textAlign: "left",
    },
    clientBox: {
      flex: 1,
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRightWidth: 3,
      borderRightColor: INK.gold,
      backgroundColor: INK.paleGold,
      alignItems: "flex-end",
    },
    clientLbl: {
      fontSize: 8,
      fontWeight: 700,
      fontFamily: PDF_FONT_FAMILY,
      color: INK.goldDeep,
      marginBottom: 3,
      textAlign: "right",
      letterSpacing: 0.4,
    },
    clientName: {
      fontSize: 13,
      fontWeight: 700,
      fontFamily: PDF_FONT_FAMILY,
      color: INK.text,
      textAlign: "right",
      marginBottom: 2,
    },
    clientSub: {
      fontSize: 8.5,
      fontFamily: PDF_FONT_FAMILY,
      color: INK.muted,
      textAlign: "right",
      marginTop: 2,
    },
    scheduleBox: {
      borderWidth: 1,
      borderColor: INK.goldLine,
      backgroundColor: INK.paleGold,
      borderRadius: 2,
      marginBottom: 10,
      overflow: "hidden",
    },
    scheduleHead: {
      flexDirection: "row-reverse",
      justifyContent: "space-between",
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderBottomWidth: 1,
      borderBottomColor: INK.goldLine,
      backgroundColor: "rgba(204,168,80,0.14)",
    },
    scheduleBody: {
      flexDirection: "row-reverse",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: 10,
      paddingVertical: 8,
    },
    tableHead: {
      flexDirection: "row-reverse",
      backgroundColor: INK.paleGold,
      paddingVertical: 9,
      paddingHorizontal: 10,
      borderBottomWidth: 2,
      borderBottomColor: INK.gold,
      marginBottom: 1,
    },
    th: {
      color: INK.goldDeep,
      fontSize: 9,
      fontWeight: 700,
      fontFamily: PDF_FONT_FAMILY,
      textAlign: "right",
    },
    tableRow: {
      flexDirection: "row-reverse",
      paddingVertical: 8,
      paddingHorizontal: 10,
      borderBottomWidth: 1,
      borderBottomColor: INK.border,
      alignItems: "center",
    },
    rowEven: { backgroundColor: INK.zebra },
    td: {
      fontSize: 9,
      fontFamily: PDF_FONT_FAMILY,
      color: INK.text,
      textAlign: "right",
    },
    tdBold: {
      fontSize: 9,
      fontWeight: 700,
      fontFamily: PDF_FONT_FAMILY,
      color: INK.text,
      textAlign: "right",
    },
    totalsBox: {
      width: 248,
      alignSelf: "flex-start",
      marginTop: 14,
      borderWidth: 1,
      borderColor: INK.border,
      borderRadius: 2,
      overflow: "hidden",
    },
    totalLine: {
      flexDirection: "row-reverse",
      justifyContent: "space-between",
      paddingVertical: 5,
      paddingHorizontal: 12,
    },
    totalLbl: {
      fontSize: 9.5,
      fontFamily: PDF_FONT_FAMILY,
      color: INK.muted,
      textAlign: "right",
    },
    totalVal: {
      fontSize: 9.5,
      fontWeight: 700,
      fontFamily: PDF_FONT_FAMILY,
      color: INK.text,
      textAlign: "left",
    },
    grandBar: {
      flexDirection: "row-reverse",
      justifyContent: "space-between",
      alignItems: "center",
      paddingVertical: 10,
      paddingHorizontal: 12,
      backgroundColor: INK.paleGold,
      borderTopWidth: 2,
      borderTopColor: INK.gold,
    },
    grandLbl: {
      fontSize: 12,
      fontWeight: 700,
      fontFamily: PDF_FONT_FAMILY,
      color: INK.goldDeep,
      textAlign: "right",
    },
    grandAmt: {
      fontSize: 13,
      fontWeight: 700,
      fontFamily: PDF_FONT_FAMILY,
      color: INK.text,
      textAlign: "left",
    },
    notesBox: {
      padding: 12,
      backgroundColor: INK.paleGold,
      borderRightWidth: 3,
      borderRightColor: INK.gold,
      borderRadius: 2,
      marginTop: 14,
      alignItems: "flex-end",
    },
    notesLbl: {
      fontSize: 9.5,
      fontWeight: 700,
      fontFamily: PDF_FONT_FAMILY,
      color: INK.text,
      marginBottom: 4,
      textAlign: "right",
    },
    notesTxt: {
      fontSize: 9,
      fontFamily: PDF_FONT_FAMILY,
      color: INK.muted,
      textAlign: "right",
      lineHeight: 1.55,
    },
    notesSection: {
      marginTop: 14,
      borderWidth: 1,
      borderColor: INK.goldLine,
      borderRadius: 2,
      overflow: "hidden",
      backgroundColor: INK.paleGold,
    },
    notesSectionHead: {
      paddingVertical: 7,
      paddingHorizontal: 12,
      borderBottomWidth: 1,
      borderBottomColor: INK.goldLine,
      backgroundColor: "rgba(204,168,80,0.14)",
      alignItems: "flex-end",
    },
    notesSectionTitle: {
      fontSize: 9.5,
      fontWeight: 700,
      fontFamily: PDF_FONT_FAMILY,
      color: INK.goldDeep,
      textAlign: "right",
      letterSpacing: 0.3,
    },
    notesEntry: {
      paddingVertical: 7,
      paddingHorizontal: 12,
      borderBottomWidth: 1,
      borderBottomColor: INK.border,
      alignItems: "flex-end",
    },
    notesEntryLast: {
      borderBottomWidth: 0,
    },
    notesEntryLabel: {
      fontSize: 8,
      fontWeight: 700,
      fontFamily: PDF_FONT_FAMILY,
      color: INK.goldDeep,
      textAlign: "right",
      marginBottom: 3,
    },
    notesEntryText: {
      fontSize: 9,
      fontFamily: PDF_FONT_FAMILY,
      color: INK.text,
      textAlign: "right",
      lineHeight: 1.55,
    },
    kvCard: {
      borderWidth: 1,
      borderColor: INK.border,
      backgroundColor: INK.zebra,
      borderRadius: 2,
      paddingHorizontal: 10,
      paddingVertical: 8,
      marginBottom: 10,
    },
    kvGrid: {
      flexDirection: "row-reverse",
      flexWrap: "wrap",
      columnGap: 10,
      rowGap: 4,
    },
    kvItem: {
      width: "31%",
      alignItems: "flex-end",
      marginBottom: 2,
    },
    kvLabel: {
      fontSize: 7.5,
      fontWeight: 700,
      fontFamily: PDF_FONT_FAMILY,
      color: INK.goldDeep,
      textAlign: "right",
      marginBottom: 2,
    },
    kvValue: {
      fontSize: 9,
      fontWeight: 700,
      fontFamily: PDF_FONT_FAMILY,
      color: INK.text,
      textAlign: "right",
    },
    metaBand: {
      flexDirection: "row-reverse",
      flexWrap: "wrap",
      alignItems: "stretch",
      justifyContent: "flex-start",
      marginTop: 0,
      marginBottom: 14,
      borderTopWidth: 2,
      borderTopColor: INK.gold,
      borderBottomWidth: 1,
      borderBottomColor: INK.goldLine,
      backgroundColor: INK.mist,
    },
    metaBandItem: {
      flexDirection: "row-reverse",
      alignItems: "center",
      gap: 6,
      paddingVertical: 8,
      paddingHorizontal: 12,
      minWidth: "22%",
    },
    metaBandItemSep: {
      borderLeftWidth: 1,
      borderLeftColor: INK.goldLine,
    },
    metaBandLabel: {
      fontSize: 7,
      fontWeight: 700,
      fontFamily: PDF_FONT_FAMILY,
      color: INK.goldDeep,
      textAlign: "right",
      letterSpacing: 0.35,
    },
    metaBandValue: {
      fontSize: 8.5,
      fontWeight: 700,
      fontFamily: PDF_FONT_FAMILY,
      color: INK.text,
      textAlign: "right",
    },
    kvSectionTitle: {
      fontSize: 9,
      fontWeight: 700,
      fontFamily: PDF_FONT_FAMILY,
      color: INK.goldDeep,
      textAlign: "right",
      marginBottom: 4,
      paddingBottom: 3,
      borderBottomWidth: 1,
      borderBottomColor: INK.border,
    },
    footer: {
      position: "absolute",
      bottom: PDF_PAGINATION.footerBottom,
      left: padX,
      right: padX,
      borderTopWidth: 1.5,
      borderTopColor: INK.goldLine,
      paddingTop: 8,
      alignItems: "center",
    },
    footerText: {
      fontSize: 8,
      fontFamily: PDF_FONT_FAMILY,
      color: INK.faint,
      textAlign: "center",
      marginBottom: 2,
    },
    footerBrand: {
      fontSize: 9,
      fontWeight: 700,
      fontFamily: PDF_FONT_FAMILY,
      color: INK.goldDeep,
      textAlign: "center",
      marginBottom: 2,
    },
    sigRow: {
      flexDirection: "row-reverse",
      justifyContent: "space-between",
      marginTop: 32,
      gap: 28,
    },
    sigBox: {
      flex: 1,
      alignItems: "flex-end",
    },
    sigLabel: {
      fontSize: 9.5,
      fontWeight: 700,
      fontFamily: PDF_FONT_FAMILY,
      color: INK.muted,
      marginBottom: 32,
      textAlign: "right",
    },
    sigLine: {
      width: "100%",
      borderTopWidth: 1,
      borderTopColor: INK.goldLine,
      paddingTop: 4,
    },
    sigHint: {
      fontSize: 8,
      fontFamily: PDF_FONT_FAMILY,
      color: INK.faint,
      textAlign: "right",
    },
  });
}

/**
 * Arabic body text — right-aligned, wraps without hyphenation
 * (hyphenation is disabled globally in pdfFonts for Tajawal).
 */
export function PdfArabicText({
  children,
  style,
  bold = false,
  size = 9,
  color = INK.text,
}: {
  children: string | number | null | undefined;
  style?: object;
  bold?: boolean;
  size?: number;
  color?: string;
}) {
  return (
    <Text
      wrap
      style={
        [
          {
            fontSize: size,
            fontWeight: bold ? 700 : 400,
            color,
            fontFamily: PDF_FONT_FAMILY,
            textAlign: "right",
            lineHeight: 1.45,
          },
          style,
        ] as never
      }
    >
      {arMixed(children)}
    </Text>
  );
}

/** LTR-isolated text for phones, SKUs, order numbers. */
export function PdfLtrText({
  children,
  style,
  size = 9,
  color = INK.text,
  bold = false,
}: {
  children: string | number | null | undefined;
  style?: object;
  size?: number;
  color?: string;
  bold?: boolean;
}) {
  return (
    <Text
      wrap={false}
      style={
        [
          {
            fontSize: size,
            fontWeight: bold ? 700 : 400,
            color,
            fontFamily: PDF_FONT_FAMILY,
            textAlign: "left",
          },
          style,
        ] as never
      }
    >
      {ltr(children)}
    </Text>
  );
}

/**
 * Money as separate number + currency Text nodes (row-reverse)
 * so Arabic currency never flips digits — rkeaz-group pattern.
 */
export function PdfMoneyText({
  amount,
  currency,
  style,
  containerStyle,
}: {
  amount: number;
  currency: string;
  style?: object;
  containerStyle?: object;
}) {
  const sign = amount < 0 ? "-" : "";
  const formatted = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(Number.isFinite(amount) ? amount : 0));

  return (
    <View
      wrap={false}
      style={
        [
          {
            flexDirection: "row-reverse",
            alignItems: "baseline",
            justifyContent: "flex-start",
          },
          containerStyle,
        ] as never
      }
    >
      <Text
        style={
          [
            {
              fontSize: 9.5,
              fontWeight: 700,
              color: INK.text,
              fontFamily: PDF_FONT_FAMILY,
            },
            style,
          ] as never
        }
      >
        {ltr(`${sign}${formatted}`)}
      </Text>
      <Text
        style={{
          fontSize: 8.5,
          color: INK.muted,
          fontWeight: 700,
          marginRight: 3,
          fontFamily: PDF_FONT_FAMILY,
        }}
      >
        {ar(currency)}
      </Text>
    </View>
  );
}

export interface PdfMetaChip {
  key: string;
  label: string;
  value: string;
  color?: string;
  ltr?: boolean;
}

/** Document metadata band — sits below brand masthead, never above logo/name. */
export function PdfMetaStrip({
  s,
  chips,
}: {
  s: ReturnType<typeof makePdfStyles>;
  chips: PdfMetaChip[];
}) {
  if (chips.length === 0) return null;

  return (
    <View style={s.metaBand} wrap={false}>
      {chips.map((chip, index) => (
        <View
          key={chip.key}
          style={[
            s.metaBandItem,
            index > 0 ? s.metaBandItemSep : {},
          ]}
        >
          <Text style={s.metaBandLabel}>{ar(chip.label)}</Text>
          <Text style={[s.metaBandValue, chip.color ? { color: chip.color } : {}]}>
            {chip.ltr ? ltr(chip.value) : arMixed(chip.value)}
          </Text>
        </View>
      ))}
    </View>
  );
}

export function PdfDocHeader({
  s,
  settings,
  titleEn,
  titleAr,
  refLine,
  statusLabel,
  statusColor,
  logoUri,
  metaChips,
}: {
  s: ReturnType<typeof makePdfStyles>;
  settings: Settings;
  titleEn: string;
  titleAr: string;
  refLine: string;
  statusLabel?: string;
  statusColor?: string;
  logoUri?: string | null;
  metaChips?: PdfMetaChip[];
}) {
  const phone = settings.branchPhone?.trim() || "";
  const address = settings.branchAddress?.trim() || "";

  return (
    <View wrap={false}>
      <View style={s.goldBarWrap}>
        <View style={s.goldBar} />
        <View style={s.goldBarAccent} />
      </View>
      <View style={s.headerRow}>
        <View style={s.brandCol}>
          {logoUri ? (
            // eslint-disable-next-line jsx-a11y/alt-text -- react-pdf Image
            <Image src={logoUri} style={s.logo} />
          ) : null}
          <View style={s.brandText}>
            <Text style={s.branchName}>{arMixed(settings.branchName)}</Text>
            {phone ? (
              <Text style={s.branchContact}>{ltr(phone)}</Text>
            ) : null}
            {address ? (
              <Text style={s.branchContact}>{arMixed(address)}</Text>
            ) : null}
            <Text style={s.titleAr}>{ar(titleAr)}</Text>
          </View>
        </View>
        <View style={s.metaCol}>
          <View style={s.badge}>
            <Text style={s.badgeText}>{ltr("OFFICIAL")}</Text>
          </View>
          <Text style={s.titleEnWatermark}>{ltr(titleEn)}</Text>
          <Text style={s.refLine}>{ltr(refLine)}</Text>
          {statusLabel ? (
            <Text style={[s.statusPill, { color: statusColor ?? INK.muted }]}>
              {ar(statusLabel)}
            </Text>
          ) : null}
        </View>
      </View>
      {metaChips && metaChips.length > 0 ? (
        <PdfMetaStrip s={s} chips={metaChips} />
      ) : null}
    </View>
  );
}

export function PdfDocFooter({
  s,
  note,
}: {
  s: ReturnType<typeof makePdfStyles>;
  note?: string;
}) {
  return (
    <View style={s.footer} fixed>
      <Text style={s.footerBrand}>{ar("Valentino · شوكولاتة فاخرة")}</Text>
      {note ? <Text style={s.footerText}>{ar(note)}</Text> : null}
      <Text
        style={s.footerText}
        render={({ pageNumber, totalPages }) =>
          arMixed(`صفحة ${pageNumber} من ${totalPages}`)
        }
      />
    </View>
  );
}

export function PdfNotesBox({
  s,
  label = "ملاحظات",
  children,
}: {
  s: ReturnType<typeof makePdfStyles>;
  label?: string;
  children: React.ReactNode;
}) {
  return (
    <View style={s.notesBox}>
      <Text style={s.notesLbl}>{ar(label)}</Text>
      {children}
    </View>
  );
}

export function PdfNotesSection({
  s,
  entries,
  title = "ملاحظات وتعليمات",
}: {
  s: ReturnType<typeof makePdfStyles>;
  entries: Array<{ key: string; label: string; text: string }>;
  title?: string;
}) {
  if (entries.length === 0) return null;

  return (
    <View style={s.notesSection} wrap={false}>
      <View style={s.notesSectionHead}>
        <Text style={s.notesSectionTitle}>{ar(title)}</Text>
      </View>
      {entries.map((entry, index) => (
        <View
          key={entry.key}
          style={[
            s.notesEntry,
            index === entries.length - 1 ? s.notesEntryLast : {},
          ]}
        >
          <Text style={s.notesEntryLabel}>{ar(entry.label)}</Text>
          <Text style={s.notesEntryText}>{arMixed(entry.text)}</Text>
        </View>
      ))}
    </View>
  );
}

export function PdfSignatureRow({
  s,
  left,
  right,
}: {
  s: ReturnType<typeof makePdfStyles>;
  left: string;
  right: string;
}) {
  return (
    <View style={s.sigRow} wrap={false}>
      <View style={s.sigBox}>
        <Text style={s.sigLabel}>{ar(right)}</Text>
        <View style={s.sigLine}>
          <Text style={s.sigHint}>{ar("الاسم والتوقيع")}</Text>
        </View>
      </View>
      <View style={s.sigBox}>
        <Text style={s.sigLabel}>{ar(left)}</Text>
        <View style={s.sigLine}>
          <Text style={s.sigHint}>{ar("الاسم والتوقيع")}</Text>
        </View>
      </View>
    </View>
  );
}

/** Subtle banner on page 2+ so long tables stay readable after wrap. */
export function PdfContinuationBanner({ label }: { label: string }) {
  return (
    <Text
      fixed
      style={{
        position: "absolute",
        top: 10,
        left: 36,
        right: 36,
        fontSize: 7.5,
        color: INK.faint,
        fontFamily: PDF_FONT_FAMILY,
        textAlign: "center",
      }}
      render={({ pageNumber }) => (pageNumber > 1 ? ar(label) : "")}
    />
  );
}
