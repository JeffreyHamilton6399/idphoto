"use client";

import * as React from "react";
import { UserSquare, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

const ACCEPT = "image/jpeg,image/png,image/webp,image/heic,image/heif,.jpg,.jpeg,.png,.webp,.heic,.heif";

interface DropzoneProps {
  onFile: (file: File) => void;
  busy?: boolean;
}

export function Dropzone({ onFile, busy }: DropzoneProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const cameraRef = React.useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = React.useState(false);

  const handleFiles = React.useCallback(
    (files: FileList | null) => {
      if (!files || files.length === 0) return;
      onFile(files[0]);
    },
    [onFile],
  );

  React.useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const files = e.clipboardData?.files;
      if (files && files.length > 0) handleFiles(files);
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [handleFiles]);

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={(e) => {
        e.preventDefault();
        setDragging(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        if (busy) return;
        handleFiles(e.dataTransfer.files);
      }}
      className="flex h-full w-full overflow-y-auto p-4"
    >
      <div className="m-auto flex w-full max-w-md shrink-0 flex-col items-center gap-3">
        <button
          type="button"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
          className={cn(
            "group relative flex min-h-[300px] w-full cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors",
            "border-border hover:border-border hover:bg-muted/40",
            dragging && "border-border bg-muted",
            busy && "pointer-events-none opacity-60",
          )}
        >
          <span className="flex size-12 items-center justify-center rounded-full border border-border bg-muted text-muted-foreground transition-colors group-hover:text-foreground dark:group-hover:text-foreground">
            <UserSquare className="size-6" />
          </span>
          <span className="text-base font-semibold tracking-tight">
            Drop a photo
          </span>
          <span className="max-w-[34ch] text-sm text-muted-foreground">
            Cropped to the head-size and eye-line rules for your country.
          </span>
          <span className="text-xs text-muted-foreground/70">
            or paste from clipboard
          </span>
          <span className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
            <ShieldCheck className="size-3.5 text-foreground" />
            Cropped here. Nothing is sent anywhere.
          </span>
        </button>

        {/* Phones get a direct route to the camera; desktops just see the box. */}
        <button
          type="button"
          disabled={busy}
          onClick={() => cameraRef.current?.click()}
          className="text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline sm:hidden"
        >
          Take a photo instead
        </button>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        className="sr-only"
        onChange={(e) => {
          handleFiles(e.target.files);
          e.currentTarget.value = "";
        }}
      />
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="user"
        className="sr-only"
        onChange={(e) => {
          handleFiles(e.target.files);
          e.currentTarget.value = "";
        }}
      />
    </div>
  );
}
