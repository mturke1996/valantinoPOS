import React from "react";
import { Image, StyleSheet, Text, View } from "@react-pdf/renderer";

import { DOC_INK } from "@/components/documents/brand";
import { ar, arMixed, ltr } from "@/components/documents/pdf/arabicPDF";
import { PDF_FONT_FAMILY } from "@/components/documents/pdf/pdfFonts";
import type { Settings } from "@/types";

export const INK = DOC_INK;

/**
 * Pagination reserves — aligned with rkeaz-group so flowing content never
 * collides with the fixed footer and table heads/total bars stay atomic.
 */
export const PDF_PAGINATION = {
  tableHead: 32,
  totalBar: 36,
  minRowHeight: 28,
  section: 36,
  footerBottom: 14,
  footerHeight: 56,
  footerReserve: 70,
} as const;

export type PdfPaperSize = "A4" | "A5";

export function makePdfStyles(compact = false) {
  const padX = compact ? 22 : 28;
  const padTop = compact ? 16 : 20;
  return StyleSheet.create({
    page: {
      fontFamily: PDF_FONT_FAMILY,
      fontSize: compact ? 8 : 8.5,
      color: INK.text,
      backgroundColor: INK.white,
      paddingTop: padTop,
      paddingBottom: PDF_PAGINATION.footerReserve,
      paddingHorizontal: padX,
    },
    goldBar: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      height: 2.5,
      backgroundColor: INK.gold,
    },
    headerRow: {
      flexDirection: "row-reverse",
      justifyContent: "space-between",
      alignItems: "flex-start",
      marginBottom: compact ? 6 : 8,
      paddingBottom: compact ? 5 : 6,
      borderBottomWidth: 1,
      borderBottomColor: INK.border,
    },
    brandCol: {
      flexDirection: "row-reverse",
      alignItems: "center",
      gap: 8,
      flex: 1,
    },
    logo: {
      width: compact ? 44 : 52,
      height: compact ? 34 : 40,
      objectFit: "contain",
    },
    brandText: {
      alignItems: "flex-end",
      borderRightWidth: 1,
      borderRightColor: INK.goldLine,
      paddingRight: 8,
      maxWidth: compact ? 150 : 200,
    },
    branchName: {
      fontSize: compact ? 10 : 11.5,
      fontWeight: 700,
      fontFamily: PDF_FONT_FAMILY,
      color: INK.text,
      textAlign: "right",
      marginBottom: 1,
    },
    branchContact: {
      fontSize: 6,
      fontFamily: PDF_FONT_FAMILY,
      color: INK.muted,
      textAlign: "right",
      marginBottom: 1,
      lineHeight: 1.3,
    },
    titleAr: {
      fontSize: compact ? 8 : 9,
      fontWeight: 700,
      fontFamily: PDF_FONT_FAMILY,
      color: INK.goldDeep,
      textAlign: "right",
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
      paddingHorizontal: 6,
      paddingVertical: 2,
      marginBottom: 4,
    },
    badgeText: {
      fontSize: 7,
      fontWeight: 700,
      fontFamily: PDF_FONT_FAMILY,
      color: INK.goldDeep,
      letterSpacing: 1,
    },
    refLine: {
      fontSize: compact ? 9 : 10.5,
      fontWeight: 700,
      fontFamily: PDF_FONT_FAMILY,
      color: INK.text,
      marginBottom: 2,
    },
    contactLine: {
      fontSize: 6.5,
      fontFamily: PDF_FONT_FAMILY,
      color: INK.muted,
      textAlign: "left",
    },
    statusPill: {
      marginTop: 2,
      fontSize: 7,
      fontWeight: 700,
      fontFamily: PDF_FONT_FAMILY,
    },
    sectionTitle: {
      fontSize: compact ? 9 : 10,
      fontWeight: 700,
      fontFamily: PDF_FONT_FAMILY,
      color: INK.goldDeep,
      textAlign: "right",
      marginBottom: 6,
      marginTop: 8,
      paddingBottom: 3,
      borderBottomWidth: 1.5,
      borderBottomColor: INK.goldLine,
    },
    infoRow: {
      flexDirection: "row-reverse",
      justifyContent: "space-between",
      marginBottom: compact ? 6 : 8,
      gap: 8,
    },
    datesCol: { width: "36%" },
    dateRow: {
      flexDirection: "row-reverse",
      justifyContent: "space-between",
      marginBottom: 2,
    },
    dateLabel: {
      fontSize: 6.5,
      fontFamily: PDF_FONT_FAMILY,
      color: INK.faint,
      textAlign: "right",
    },
    dateVal: {
      fontSize: 7,
      fontWeight: 700,
      fontFamily: PDF_FONT_FAMILY,
      color: INK.text,
      textAlign: "left",
    },
    clientBox: {
      flex: 1,
      paddingVertical: 4,
      paddingHorizontal: 7,
      borderRightWidth: 2,
      borderRightColor: INK.gold,
      backgroundColor: INK.paleGold,
      alignItems: "flex-end",
    },
    clientLbl: {
      fontSize: 6.5,
      fontWeight: 700,
      fontFamily: PDF_FONT_FAMILY,
      color: INK.goldDeep,
      marginBottom: 1,
      textAlign: "right",
    },
    clientName: {
      fontSize: compact ? 9.5 : 11,
      fontWeight: 700,
      fontFamily: PDF_FONT_FAMILY,
      color: INK.text,
      textAlign: "right",
      marginBottom: 1,
    },
    clientSub: {
      fontSize: 6.5,
      fontFamily: PDF_FONT_FAMILY,
      color: INK.muted,
      textAlign: "right",
      marginTop: 1,
    },
    scheduleBox: {
      borderWidth: 1,
      borderColor: INK.goldLine,
      backgroundColor: INK.paleGold,
      borderRadius: 2,
      marginBottom: compact ? 4 : 5,
      overflow: "hidden",
    },
    scheduleHead: {
      flexDirection: "row-reverse",
      justifyContent: "space-between",
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderBottomWidth: 1,
      borderBottomColor: INK.goldLine,
      backgroundColor: "rgba(204,168,80,0.12)",
    },
    scheduleBody: {
      flexDirection: "row-reverse",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: 6,
      paddingVertical: compact ? 3 : 4,
    },
    tableHead: {
      flexDirection: "row-reverse",
      backgroundColor: INK.paleGold,
      paddingVertical: compact ? 6 : 8,
      paddingHorizontal: 8,
      borderBottomWidth: 2,
      borderBottomColor: INK.gold,
      marginBottom: 1,
    },
    th: {
      color: INK.goldDeep,
      fontSize: compact ? 8 : 9,
      fontWeight: 700,
      fontFamily: PDF_FONT_FAMILY,
      textAlign: "right",
    },
    tableRow: {
      flexDirection: "row-reverse",
      paddingVertical: compact ? 6 : 7,
      paddingHorizontal: 8,
      borderBottomWidth: 1,
      borderBottomColor: INK.border,
      alignItems: "center",
    },
    rowEven: { backgroundColor: INK.zebra },
    td: {
      fontSize: compact ? 8 : 9,
      fontFamily: PDF_FONT_FAMILY,
      color: INK.text,
      textAlign: "right",
    },
    tdBold: {
      fontSize: compact ? 8 : 9,
      fontWeight: 700,
      fontFamily: PDF_FONT_FAMILY,
      color: INK.text,
      textAlign: "right",
    },
    totalsBox: {
      width: compact ? 200 : 230,
      alignSelf: "flex-start",
      marginTop: 10,
      borderWidth: 1,
      borderColor: INK.border,
      borderRadius: 2,
      overflow: "hidden",
    },
    totalLine: {
      flexDirection: "row-reverse",
      justifyContent: "space-between",
      paddingVertical: 4,
      paddingHorizontal: 10,
    },
    totalLbl: {
      fontSize: 9,
      fontFamily: PDF_FONT_FAMILY,
      color: INK.muted,
      textAlign: "right",
    },
    totalVal: {
      fontSize: 9,
      fontWeight: 700,
      fontFamily: PDF_FONT_FAMILY,
      color: INK.text,
      textAlign: "left",
    },
    grandBar: {
      flexDirection: "row-reverse",
      justifyContent: "space-between",
      alignItems: "center",
      paddingVertical: 8,
      paddingHorizontal: 10,
      backgroundColor: INK.paleGold,
      borderTopWidth: 2,
      borderTopColor: INK.gold,
    },
    grandLbl: {
      fontSize: compact ? 10 : 11,
      fontWeight: 700,
      fontFamily: PDF_FONT_FAMILY,
      color: INK.goldDeep,
      textAlign: "right",
    },
    grandAmt: {
      fontSize: compact ? 11 : 12,
      fontWeight: 700,
      fontFamily: PDF_FONT_FAMILY,
      color: INK.text,
      textAlign: "left",
    },
    notesBox: {
      padding: 10,
      backgroundColor: INK.paleGold,
      borderRightWidth: 3,
      borderRightColor: INK.gold,
      borderRadius: 2,
      marginTop: 12,
      alignItems: "flex-end",
    },
    notesLbl: {
      fontSize: 9,
      fontWeight: 700,
      fontFamily: PDF_FONT_FAMILY,
      color: INK.text,
      marginBottom: 3,
      textAlign: "right",
    },
    notesTxt: {
      fontSize: 9,
      fontFamily: PDF_FONT_FAMILY,
      color: INK.muted,
      textAlign: "right",
      lineHeight: 1.5,
    },
    kvCard: {
      borderWidth: 1,
      borderColor: INK.border,
      backgroundColor: INK.zebra,
      borderRadius: 2,
      paddingHorizontal: compact ? 6 : 8,
      paddingVertical: compact ? 4 : 5,
      marginBottom: compact ? 6 : 8,
    },
    kvGrid: {
      flexDirection: "row-reverse",
      flexWrap: "wrap",
      columnGap: compact ? 6 : 8,
      rowGap: 2,
    },
    kvItem: {
      width: "31%",
      alignItems: "flex-end",
      marginBottom: 1,
    },
    kvLabel: {
      fontSize: 6.5,
      fontWeight: 700,
      fontFamily: PDF_FONT_FAMILY,
      color: INK.goldDeep,
      textAlign: "right",
      marginBottom: 1,
    },
    kvValue: {
      fontSize: compact ? 7.5 : 8,
      fontWeight: 700,
      fontFamily: PDF_FONT_FAMILY,
      color: INK.text,
      textAlign: "right",
    },
    kvSectionTitle: {
      fontSize: 7.5,
      fontWeight: 700,
      fontFamily: PDF_FONT_FAMILY,
      color: INK.goldDeep,
      textAlign: "right",
      marginBottom: 3,
      paddingBottom: 2,
      borderBottomWidth: 1,
      borderBottomColor: INK.border,
    },
    footer: {
      position: "absolute",
      bottom: PDF_PAGINATION.footerBottom,
      left: padX,
      right: padX,
      borderTopWidth: 1,
      borderTopColor: INK.border,
      paddingTop: 6,
      alignItems: "center",
    },
    footerText: {
      fontSize: 7.5,
      fontFamily: PDF_FONT_FAMILY,
      color: INK.faint,
      textAlign: "center",
      marginBottom: 2,
    },
    footerBrand: {
      fontSize: 8,
      fontWeight: 700,
      fontFamily: PDF_FONT_FAMILY,
      color: INK.goldDeep,
      textAlign: "center",
    },
    sigRow: {
      flexDirection: "row-reverse",
      justifyContent: "space-between",
      marginTop: 28,
      gap: 24,
    },
    sigBox: {
      flex: 1,
      alignItems: "flex-end",
    },
    sigLabel: {
      fontSize: 9,
      fontWeight: 700,
      fontFamily: PDF_FONT_FAMILY,
      color: INK.muted,
      marginBottom: 28,
      textAlign: "right",
    },
    sigLine: {
      width: "100%",
      borderTopWidth: 1,
      borderTopColor: INK.goldLine,
      paddingTop: 4,
    },
    sigHint: {
      fontSize: 7.5,
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
              fontSize: 9,
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
          fontSize: 8,
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

export function PdfDocHeader({
  s,
  settings,
  titleEn,
  titleAr,
  refLine,
  statusLabel,
  statusColor,
  logoUri,
}: {
  s: ReturnType<typeof makePdfStyles>;
  settings: Settings;
  titleEn: string;
  titleAr: string;
  refLine: string;
  statusLabel?: string;
  statusColor?: string;
  logoUri?: string | null;
}) {
  const phone = settings.branchPhone?.trim() || "";
  const address = settings.branchAddress?.trim() || "";

  return (
    <View wrap={false}>
      <View style={s.goldBar} fixed />
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
            <Text style={s.badgeText}>{ltr(titleEn)}</Text>
          </View>
          <Text style={s.refLine}>{ltr(refLine)}</Text>
          {statusLabel ? (
            <Text style={[s.statusPill, { color: statusColor ?? INK.muted }]}>
              {ar(statusLabel)}
            </Text>
          ) : null}
        </View>
      </View>
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
export function PdfContinuationBanner({
  label,
  compact = false,
}: {
  label: string;
  compact?: boolean;
}) {
  const inset = compact ? 28 : 36;
  return (
    <Text
      fixed
      style={{
        position: "absolute",
        top: compact ? 18 : 22,
        left: inset,
        right: inset,
        fontSize: 7,
        color: INK.faint,
        fontFamily: PDF_FONT_FAMILY,
        textAlign: "center",
      }}
      render={({ pageNumber }) => (pageNumber > 1 ? ar(label) : "")}
    />
  );
}
