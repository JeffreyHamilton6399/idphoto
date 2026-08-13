"use client";

import * as React from "react";
import { ImagePlus, Plus, Trash2, X, Download, Printer } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  ACCENTS,
  maxFieldsFor,
  type CardData,
  type CardField,
  type CardLayout,
} from "@/lib/card";
import { TEMPLATES, applyTemplate, getTemplate } from "@/lib/card-templates";
import { SHEETS, type SheetLayout } from "@/lib/render";

interface CardEditorProps {
  data: CardData;
  onChange: (next: CardData) => void;
  onLogoFile: (file: File) => void;
  onArtworkFile: (file: File) => void;
  hasPhoto: boolean;
  sheet: SheetLayout;
  onSheetChange: (id: string) => void;
  sheetCopies: number | null;
  onDownloadCard: () => void;
  onDownloadSheet: () => void;
}

const inputClass =
  "h-8 w-full rounded-md border bg-background px-2 text-xs outline-none transition-colors focus-visible:border-emerald-500/60 focus-visible:ring-2 focus-visible:ring-emerald-500/20";

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

export function CardEditor(props: CardEditorProps) {
  const {
    data,
    onChange,
    onLogoFile,
    onArtworkFile,
    hasPhoto,
    sheet,
    onSheetChange,
    sheetCopies,
    onDownloadCard,
    onDownloadSheet,
  } = props;

  const logoRef = React.useRef<HTMLInputElement>(null);
  const artworkRef = React.useRef<HTMLInputElement>(null);
  const maxFields = maxFieldsFor(data.orientation);
  const template = getTemplate(data.templateId);

  const setField = (index: number, patch: Partial<CardField>) => {
    const fields = data.fields.map((f, i) => (i === index ? { ...f, ...patch } : f));
    onChange({ ...data, fields });
  };

  const addField = () => {
    onChange({
      ...data,
      fields: [
        ...data.fields,
        { id: `f${Date.now().toString(36)}`, label: "", value: "" },
      ],
    });
  };

  return (
    <div className="flex h-full min-h-0 flex-col overflow-y-auto">
      <Section title="Template">
        <select
          value={data.templateId}
          onChange={(e) =>
            onChange(applyTemplate(data, getTemplate(e.target.value)))
          }
          className="h-9 w-full rounded-md border bg-background px-2 text-sm outline-none transition-colors focus-visible:border-emerald-500/60 focus-visible:ring-2 focus-visible:ring-emerald-500/20"
        >
          {TEMPLATES.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        <p className="text-[11px] text-muted-foreground">{template.description}</p>

        <div className="flex items-center gap-1.5">
          <Button
            size="sm"
            variant="outline"
            onClick={() => artworkRef.current?.click()}
            className="h-8 flex-1 justify-start gap-2 text-xs"
          >
            <ImagePlus className="size-3.5" />
            {data.artwork ? "Change artwork" : "Use your own artwork"}
          </Button>
          {data.artwork && (
            <Button
              size="icon"
              variant="ghost"
              aria-label="Remove artwork"
              onClick={() => onChange({ ...data, artwork: null })}
              className="size-8 text-muted-foreground"
            >
              <X className="size-3.5" />
            </Button>
          )}
        </div>
        <p className="text-[11px] leading-relaxed text-muted-foreground/70">
          A blank card design from your own organisation — it&apos;s drawn
          full-bleed underneath, with the photo and text on top. Pair it with
          the Plain style so nothing covers your design.
        </p>
        <input
          ref={artworkRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="sr-only"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onArtworkFile(f);
            e.currentTarget.value = "";
          }}
        />
      </Section>

      <Section title="Organisation">
        <input
          value={data.orgName}
          onChange={(e) => onChange({ ...data, orgName: e.target.value })}
          placeholder="Organisation name"
          className={inputClass}
        />
        <input
          value={data.orgTagline}
          onChange={(e) => onChange({ ...data, orgTagline: e.target.value })}
          placeholder="Department or tagline (optional)"
          className={inputClass}
        />
        <div className="flex items-center gap-1.5">
          <Button
            size="sm"
            variant="outline"
            onClick={() => logoRef.current?.click()}
            className="h-8 flex-1 justify-start gap-2 text-xs"
          >
            <ImagePlus className="size-3.5" />
            {data.logo ? "Change logo" : "Add logo"}
          </Button>
          {data.logo && (
            <Button
              size="icon"
              variant="ghost"
              aria-label="Remove logo"
              onClick={() => onChange({ ...data, logo: null })}
              className="size-8 text-muted-foreground"
            >
              <X className="size-3.5" />
            </Button>
          )}
        </div>
        <input
          ref={logoRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/svg+xml"
          className="sr-only"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onLogoFile(f);
            e.currentTarget.value = "";
          }}
        />
      </Section>

      <Section title="Holder">
        <input
          value={data.holderName}
          onChange={(e) => onChange({ ...data, holderName: e.target.value })}
          placeholder="Full name"
          className={inputClass}
        />
        <input
          value={data.role}
          onChange={(e) => onChange({ ...data, role: e.target.value })}
          placeholder={template.rolePlaceholder}
          className={inputClass}
        />
        {!hasPhoto && (
          <p className="text-[11px] text-muted-foreground/70">
            No photo yet — switch to Passport photo, drop a picture, and it will
            appear here automatically.
          </p>
        )}
      </Section>

      <Section title="Details">
        <div className="flex flex-col gap-1.5">
          {data.fields.map((field, i) => (
            <div key={field.id} className="flex items-center gap-1.5">
              <input
                value={field.label}
                onChange={(e) => setField(i, { label: e.target.value })}
                placeholder="Label"
                className={cn(inputClass, "w-24 shrink-0")}
              />
              <input
                value={field.value}
                onChange={(e) => setField(i, { value: e.target.value })}
                placeholder="Value"
                className={inputClass}
              />
              <Button
                size="icon"
                variant="ghost"
                aria-label="Remove field"
                onClick={() =>
                  onChange({
                    ...data,
                    fields: data.fields.filter((_, idx) => idx !== i),
                  })
                }
                className="size-8 shrink-0 text-muted-foreground"
              >
                <Trash2 className="size-3.5" />
              </Button>
            </div>
          ))}
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={addField}
          disabled={data.fields.length >= maxFields}
          className="h-8 justify-start gap-2 text-xs"
        >
          <Plus className="size-3.5" />
          Add field
        </Button>
        <p className="text-[11px] text-muted-foreground/70">
          {data.fields.length >= maxFields
            ? `A ${data.orientation} card fits ${maxFields} fields.`
            : `Up to ${maxFields} fields fit on a ${data.orientation} card.`}
        </p>
      </Section>

      <Section title="Style">
        <div className="flex items-center gap-1.5">
          {ACCENTS.map((a) => (
            <button
              key={a.id}
              type="button"
              aria-label={a.label}
              title={a.label}
              onClick={() => onChange({ ...data, accent: a.value })}
              style={{ backgroundColor: a.value }}
              className={cn(
                "size-6 rounded-full ring-offset-2 ring-offset-background transition-all",
                data.accent === a.value && "ring-2 ring-foreground/40",
              )}
            />
          ))}
        </div>
        <div className="flex items-center gap-1.5">
          {(["landscape", "portrait"] as const).map((o) => (
            <button
              key={o}
              type="button"
              onClick={() => onChange({ ...data, orientation: o })}
              className={cn(
                "flex-1 rounded-md border px-2 py-1.5 text-xs capitalize transition-colors",
                data.orientation === o
                  ? "border-emerald-500/60 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                  : "text-muted-foreground hover:bg-muted",
              )}
            >
              {o}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1.5">
          {(
            [
              ["band", "Band"],
              ["sidebar", "Stripe"],
              ["plain", "Plain"],
            ] as [CardLayout, string][]
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => onChange({ ...data, layout: id })}
              className={cn(
                "flex-1 rounded-md border px-2 py-1.5 text-xs transition-colors",
                data.layout === id
                  ? "border-emerald-500/60 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                  : "text-muted-foreground hover:bg-muted",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </Section>

      <Section title="Download">
        <Button
          size="sm"
          onClick={onDownloadCard}
          className="h-8 gap-1.5 bg-emerald-500 text-xs text-white hover:bg-emerald-600"
        >
          <Download className="size-3.5" />
          Download card (85.6×54 mm)
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
        <p className="text-[11px] leading-relaxed text-muted-foreground/70">
          Prints at 600 DPI, credit-card sized, with cut guides. Badges for your
          own organisation — this doesn&apos;t imitate government documents.
        </p>
      </Section>
    </div>
  );
}
