"use client";

import type { ReactNode } from "react";

import { DOC_INK, resolveDocLogoUrl } from "@/components/documents/brand";
import type { Settings } from "@/types";

interface DocBrandHeaderProps {
  settings: Settings;
  titleEn: string;
  titleAr: string;
  refLine: string;
  statusLabel?: string;
  statusTone?: "success" | "warning" | "neutral";
  contactLine?: string;
  compact?: boolean;
  metaChips?: DocMetaChip[];
}

const STATUS_COLOR = {
  success: DOC_INK.success,
  warning: DOC_INK.goldDeep,
  neutral: DOC_INK.muted,
} as const;

/** White professional masthead — gold rules + logo on paper */
export function DocBrandHeader({
  settings,
  titleEn,
  titleAr,
  refLine,
  statusLabel,
  statusTone = "neutral",
  contactLine,
  compact = false,
  metaChips,
}: DocBrandHeaderProps) {
  const logoUrl = resolveDocLogoUrl(settings);
  const phone = contactLine ? null : settings.branchPhone?.trim() || null;
  const address = contactLine ? null : settings.branchAddress?.trim() || null;
  const customContact = contactLine?.trim() || null;

  return (
    <header
      className={`relative overflow-hidden ${compact ? "px-5 py-4" : "px-8 py-6"}`}
      style={{
        background: DOC_INK.white,
        borderBottom: `1px solid ${DOC_INK.border}`,
      }}
    >
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-[3px]"
        style={{
          background: `linear-gradient(90deg, ${DOC_INK.goldDeep} 0%, ${DOC_INK.gold} 40%, ${DOC_INK.goldBright} 50%, ${DOC_INK.gold} 60%, ${DOC_INK.goldDeep} 100%)`,
        }}
      />

      <div className={`relative flex items-start justify-between ${compact ? "gap-3" : "gap-6"}`}>
        <div className={`flex min-w-0 items-center ${compact ? "gap-3" : "gap-4"}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={logoUrl}
            alt=""
            crossOrigin="anonymous"
            className={`w-auto object-contain ${compact ? "h-11 max-w-[140px]" : "h-14 max-w-[180px]"}`}
            onError={(event) => {
              const img = event.currentTarget;
              if (img.dataset.fallback === "1") return;
              img.dataset.fallback = "1";
              img.src = "/images/valentino-logo.png";
            }}
          />
          <div
            className="min-w-0 border-s ps-4"
            style={{ borderColor: DOC_INK.goldLine }}
          >
            <p
              className={`truncate font-extrabold leading-snug ${compact ? "text-[13px]" : "text-[15px]"}`}
              style={{ color: DOC_INK.text }}
            >
              {settings.branchName}
            </p>
            {phone ? (
              <p
                className={`num-ltr mt-0.5 truncate tabular-nums ${compact ? "text-[8px]" : "text-[9px]"}`}
                dir="ltr"
                style={{ color: DOC_INK.muted }}
              >
                {phone}
              </p>
            ) : null}
            {address ? (
              <p
                className={`mt-0.5 leading-snug ${compact ? "text-[8px]" : "text-[9px]"}`}
                style={{ color: DOC_INK.muted }}
              >
                {address}
              </p>
            ) : null}
            {customContact ? (
              <p
                className={`mt-0.5 ${compact ? "text-[8px]" : "text-[9px]"}`}
                style={{ color: DOC_INK.muted }}
              >
                {customContact}
              </p>
            ) : null}
            <p
              className="mt-1 text-[11px] font-semibold tracking-wide"
              style={{ color: DOC_INK.goldDeep }}
            >
              {titleAr}
            </p>
          </div>
        </div>

        <div className="shrink-0 text-end">
          <span
            className="inline-flex rounded-sm px-2.5 py-1 text-[9px] font-extrabold tracking-[0.16em] uppercase"
            style={{
              background: DOC_INK.paleGold,
              border: `1px solid ${DOC_INK.goldLine}`,
              color: DOC_INK.goldDeep,
            }}
          >
            OFFICIAL
          </span>
          <p
            className={`mt-2 font-extrabold leading-none tracking-[0.08em] ${compact ? "text-[20px]" : "text-[24px]"}`}
            style={{ color: "#D6C9A8" }}
          >
            {titleEn}
          </p>
          <p
            className={`mt-1.5 font-extrabold tabular-nums ${compact ? "text-[12px]" : "text-[14px]"}`}
            dir="ltr"
            style={{ color: DOC_INK.text }}
          >
            {refLine}
          </p>
          {statusLabel ? (
            <p
              className="mt-1 text-[11px] font-bold"
              style={{ color: STATUS_COLOR[statusTone] }}
            >
              {statusLabel}
            </p>
          ) : null}
        </div>
      </div>

      {metaChips && metaChips.length > 0 ? (
        <DocMetaStrip chips={metaChips} className="mt-4" />
      ) : null}
    </header>
  );
}

export function DocTitleBand({
  titleEn,
  titleAr,
  meta,
  compact = false,
}: {
  titleEn: string;
  titleAr: string;
  meta?: ReactNode;
  compact?: boolean;
}) {
  return (
    <div
      className={`flex items-end justify-between gap-4 pb-3`}
      style={{ borderBottom: `2px solid ${DOC_INK.gold}` }}
    >
      <div>
        <p
          className={`font-extrabold leading-none tracking-[0.06em] ${compact ? "text-[22px]" : "text-[28px]"}`}
          style={{ color: "#D0D5DD" }}
        >
          {titleEn}
        </p>
        <p
          className={`mt-2 font-extrabold ${compact ? "text-[11px]" : "text-[13px]"}`}
          style={{ color: DOC_INK.goldDeep }}
        >
          {titleAr}
        </p>
      </div>
      {meta ? (
        <div className={`text-end ${compact ? "text-[10px]" : "text-[11px]"}`} style={{ color: DOC_INK.muted }}>
          {meta}
        </div>
      ) : null}
    </div>
  );
}

export function DocGoldRule() {
  return (
    <div
      aria-hidden
      className="h-px w-full"
      style={{
        background: `linear-gradient(90deg, ${DOC_INK.gold} 0%, ${DOC_INK.goldLine} 45%, transparent 100%)`,
      }}
    />
  );
}

export interface DocMetaChip {
  key: string;
  label: string;
  value: string;
  valueColor?: string;
  ltr?: boolean;
}

export function DocMetaStrip({
  chips,
  className = "",
}: {
  chips: DocMetaChip[];
  className?: string;
}) {
  if (chips.length === 0) return null;

  return (
    <div
      className={`flex flex-wrap items-stretch justify-start overflow-hidden rounded-sm ${className}`}
      style={{
        background: DOC_INK.mist,
        borderTop: `2px solid ${DOC_INK.gold}`,
        borderBottom: `1px solid ${DOC_INK.goldLine}`,
      }}
    >
      {chips.map((chip, index) => (
        <div
          key={chip.key}
          className="inline-flex min-w-[22%] items-center gap-2 px-3 py-2.5"
          style={
            index > 0
              ? { borderInlineStart: `1px solid ${DOC_INK.goldLine}` }
              : undefined
          }
        >
          <span
            className="text-[9px] font-extrabold tracking-wide"
            style={{ color: DOC_INK.goldDeep }}
          >
            {chip.label}
          </span>
          <span
            className={`text-[10.5px] font-bold ${chip.ltr ? "num-ltr tabular-nums" : ""}`}
            style={{ color: chip.valueColor ?? DOC_INK.text }}
            dir={chip.ltr ? "ltr" : undefined}
          >
            {chip.value}
          </span>
        </div>
      ))}
    </div>
  );
}
