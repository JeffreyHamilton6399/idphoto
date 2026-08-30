"use client";

import * as React from "react";
import { Heart, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { FeedbackButton } from "@/components/feedback-button";
import { SiteSettingsMenu } from "@/components/site-settings-menu";
import { Logo } from "./logo";

const DONATE_URL = "https://buymeacoffee.com/jeffreyscof";

interface HeaderProps {
  /** Shown only once a file is loaded. */
  onStartOver?: () => void;
}

export function Header({ onStartOver }: HeaderProps) {
  return (
    <header className="flex h-12 shrink-0 items-center justify-between border-b px-3 sm:px-4">
      <button
        type="button"
        onClick={() => window.location.reload()}
        aria-label="Reload IDPhoto"
        className="group flex items-center gap-2 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
      >
        <span className="text-foreground transition-transform group-hover:scale-105">
          <Logo className="size-5" />
        </span>
        <span className="text-sm font-semibold tracking-tight transition-opacity group-hover:opacity-80">
          IDPhoto
        </span>
      </button>

      <div className="flex items-center gap-1.5">
        {onStartOver && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onStartOver}
            className="h-7 gap-1.5 px-2 text-xs text-muted-foreground"
          >
            <RotateCcw className="size-3.5" />
            <span className="hidden sm:inline">Start over</span>
          </Button>
        )}
        <FeedbackButton />
        <Button
          variant="outline"
          size="sm"
          asChild
          className="h-7 gap-1.5 px-2 text-xs font-normal text-muted-foreground hover:bg-transparent hover:text-foreground"
        >
          <a href={DONATE_URL} target="_blank" rel="noopener noreferrer">
            <Heart className="size-3.5" />
            <span className="hidden sm:inline">Donate</span>
          </a>
        </Button>
        <SiteSettingsMenu />
      </div>
    </header>
  );
}
