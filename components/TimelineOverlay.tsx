"use client";

import { type RefObject } from "react";
import { TimelineDots } from "./TimelineDots";
import { TimelineColoredPills } from "./TimelineColoredPills";
import type { Section } from "@/types";

export type TimelineVariant = "dots" | "pills";

interface TimelineOverlayProps {
  videoRef: RefObject<HTMLVideoElement | null>;
  sections: Section[];
  duration: number;
  variant: TimelineVariant;
  onVariantChange: (v: TimelineVariant) => void;
}

export function TimelineOverlay({
  videoRef,
  sections,
  duration,
  variant,
  onVariantChange,
}: TimelineOverlayProps) {

  return (
    <div className="bg-zinc-100 py-4 px-8">
      {/* Toggle */}
      <div className="flex justify-end mb-6 mx-auto" style={{ maxWidth: 620 }}>
        <div className="inline-flex rounded-lg bg-zinc-200 p-0.5">
          <button
            onClick={() => onVariantChange("dots")}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
              variant === "dots"
                ? "bg-white text-zinc-900 shadow-sm"
                : "text-zinc-500 hover:text-zinc-700"
            }`}
          >
            <span className="flex items-center gap-1.5">
              {/* Dots icon */}
              <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
                <circle cx="3" cy="7" r="1.5" />
                <circle cx="7" cy="7" r="2.5" />
                <circle cx="11" cy="7" r="1.5" />
              </svg>
              Animated
            </span>
          </button>
          <button
            onClick={() => onVariantChange("pills")}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
              variant === "pills"
                ? "bg-white text-zinc-900 shadow-sm"
                : "text-zinc-500 hover:text-zinc-700"
            }`}
          >
            <span className="flex items-center gap-1.5">
              {/* Pills icon */}
              <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
                <rect x="0.5" y="4" width="4" height="6" rx="2" />
                <rect x="5" y="3" width="4" height="8" rx="2" />
                <rect x="9.5" y="4" width="4" height="6" rx="2" />
              </svg>
              Sections
            </span>
          </button>
        </div>
      </div>

      {variant === "dots" ? (
        <TimelineDots
          videoRef={videoRef}
          sections={sections}
          duration={duration}
        />
      ) : (
        <TimelineColoredPills
          videoRef={videoRef}
          sections={sections}
          duration={duration}
        />
      )}
    </div>
  );
}
