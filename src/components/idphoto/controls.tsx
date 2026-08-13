"use client";

import * as React from "react";
import {
  Check,
  AlertTriangle,
  X,
  Wand2,
  Loader2,
  Download,
  Printer,
  Info,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SPECS, type PhotoSpec } from "@/lib/specs";
import { SHEETS, type SheetLayout } from "@/lib/render";
import type { CheckStatus, ComplianceCheck } from "@/lib/geometry";

interface ControlsProps {
  spec: PhotoSpec;
  onSpecChange: (id: string) => void;
  checks: ComplianceCheck[];
  headScale: number;
  onHeadScale: (v: number) => void;
  offsetX: number;
  offsetY: number;
  onOffset: (x: number, y: number) => void;
  onReset: () => void;
  bgApplied: boolean;
  bgBusy: boolean;
  bgProgress: number;
  onReplaceBackground: () => void;
  sheet: SheetLayout;
  onSheetChange: (id: string) => void;
  sheetCopies: number | null;
  onDownloadPhoto: () => void;
  onDownloadSheet: () => void;
}

const STATUS_ICON: Record<CheckStatus, React.ComponentType<{ className?: string }>> = {
  pass: Check,
  warn: AlertTriangle,
  fail: X,
};

const STATUS_STYLE: Record<CheckStatus, string> = {
  pass: "text-emerald-600 dark:text-emerald-400",
  warn: "text-amber-600 dark:text-amber-400",
  fail: "text-rose-600 dark:text-rose-400",
};

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2 border-b px-3 py-3 last:border-b-0">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h2>
      {children}
    </div>
  );
}

export function Controls(props: ControlsProps) {
  const {
    spec,
    onSpecChange,
    checks,
    headScale,
    onHeadScale,
    offsetX,
    offsetY,
    onOffset,
    onReset,
    bgApplied,
    bgBusy,
    bgProgress,
    onReplaceBackground,
    sheet,
    onSheetChange,
    sheetCopies,
    onDownloadPhoto,
    onDownloadSheet,
  } = props;

  const failing = checks.some((c) => c.status === "fail");

  return (
    <div className="flex h-full min-h-0 flex-col overflow-y-auto">
      <Section title="Document">
        <select
          value={spec.id}
          onChange={(e) => onSpecChange(e.target.value)}
          className="h-9 w-full rounded-md border bg-background px-2 text-sm outline-none transition-colors focus-visible:border-emerald-500/60 focus-visible:ring-2 focus-visible:ring-emerald-500/20"
        >
          {SPECS.map((s) => (
            <option key={s.id} value={s.id}>
              {s.country} — {s.document} ({s.widthMm}×{s.heightMm} mm)
            </option>
          ))}
        </select>
        <p className="flex items-start gap-1.5 text-[11px] leading-relaxed text-muted-foreground">
          <Info className="mt-0.5 size-3 shrink-0" />
          {spec.source}
        </p>
      </Section>

      <Section title="Checks">
        <ul className="flex flex-col gap-1.5">
          {checks.map((c) => {
            const Icon = STATUS_ICON[c.status];
            return (
              <li key={c.id} className="flex items-start gap-2 text-xs">
                <Icon className={cn("mt-0.5 size-3.5 shrink-0", STATUS_STYLE[c.status])} />
                <span className="flex min-w-0 flex-col">
                  <span className="font-medium">{c.label}</span>
                  <span className="text-muted-foreground">{c.detail}</span>
                </span>
              </li>
            );
          })}
        </ul>
      </Section>

      <Section title="Adjust">
        <label className="flex flex-col gap-1 text-xs">
          <span className="flex items-center justify-between text-muted-foreground">
            <span>Head size</span>
            <span className="tabular-nums">{Math.round(headScale * 100)}%</span>
          </span>
          <input
            type="range"
            min={0.85}
            max={1.15}
            step={0.005}
            value={headScale}
            onChange={(e) => onHeadScale(Number(e.target.value))}
            className="w-full accent-emerald-500"
          />
        </label>

        <div className="grid grid-cols-2 gap-2">
          <label className="flex flex-col gap-1 text-xs">
            <span className="text-muted-foreground">Move ←→</span>
            <input
              type="range"
              min={-200}
              max={200}
              step={1}
              value={offsetX}
              onChange={(e) => onOffset(Number(e.target.value), offsetY)}
              className="w-full accent-emerald-500"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs">
            <span className="text-muted-foreground">Move ↑↓</span>
            <input
              type="range"
              min={-200}
              max={200}
              step={1}
              value={offsetY}
              onChange={(e) => onOffset(offsetX, Number(e.target.value))}
              className="w-full accent-emerald-500"
            />
          </label>
        </div>

        <Button
          size="sm"
          variant="ghost"
          onClick={onReset}
          className="h-7 self-start px-2 text-xs text-muted-foreground"
        >
          Reset adjustments
        </Button>
      </Section>

      <Section title="Background">
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          {spec.backgroundLabel} required. Replacing it also measures the top of
          your hair exactly, instead of estimating it.
        </p>
        <Button
          size="sm"
          variant="outline"
          disabled={bgBusy || bgApplied}
          onClick={onReplaceBackground}
          className="h-8 justify-start gap-2 text-xs"
        >
          {bgBusy ? (
            <>
              <Loader2 className="size-3.5 animate-spin" />
              Removing background… {Math.round(bgProgress * 100)}%
            </>
          ) : bgApplied ? (
            <>
              <Check className="size-3.5 text-emerald-500" />
              Background replaced
            </>
          ) : (
            <>
              <Wand2 className="size-3.5" />
              Replace background
            </>
          )}
        </Button>
        {!bgApplied && !bgBusy && (
          <p className="text-[11px] text-muted-foreground/70">
            Downloads a 40 MB model the first time. Skip it if your wall is
            already plain.
          </p>
        )}
      </Section>

      <Section title="Download">
        {failing && (
          <p className="rounded-md border border-amber-500/30 bg-amber-500/5 px-2 py-1.5 text-[11px] text-amber-700 dark:text-amber-400">
            Some checks are failing. You can still download, but the photo may
            be rejected.
          </p>
        )}
        <Button
          size="sm"
          onClick={onDownloadPhoto}
          className="h-8 gap-1.5 bg-emerald-500 text-xs text-white hover:bg-emerald-600"
        >
          <Download className="size-3.5" />
          Download photo ({spec.widthMm}×{spec.heightMm} mm)
        </Button>

        <div className="flex items-center gap-1.5">
          <select
            value={sheet.id}
            onChange={(e) => onSheetChange(e.target.value)}
            className="h-8 flex-1 rounded-md border bg-background px-2 text-xs outline-none"
          >
            {SHEETS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
          <Button
            size="sm"
            variant="outline"
            onClick={onDownloadSheet}
            className="h-8 gap-1.5 text-xs"
          >
            <Printer className="size-3.5" />
            Sheet{sheetCopies ? ` ×${sheetCopies}` : ""}
          </Button>
        </div>
        <p className="text-[11px] text-muted-foreground/70">
          The sheet prints at {spec.dpi} DPI with cut guides — take it to any
          photo counter or print at home.
        </p>
      </Section>
    </div>
  );
}
