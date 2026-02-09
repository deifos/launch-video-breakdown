"use client";

import { useRef, useEffect, useState, type RefObject } from "react";
import { motion } from "framer-motion";
import type { Section } from "@/types";

// Near-solid colors with very subtle gradient shift
const PILL_COLORS = [
  { color: "#f59e0b", gradient: "linear-gradient(135deg, #f9a825, #f59e0b)", glow: "rgba(245, 158, 11, 0.3)" },
  { color: "#7c3aed", gradient: "linear-gradient(135deg, #8345f0, #7c3aed)", glow: "rgba(124, 58, 237, 0.3)" },
  { color: "#c026d3", gradient: "linear-gradient(135deg, #c930dc, #c026d3)", glow: "rgba(192, 38, 211, 0.3)" },
  { color: "#7c3aed", gradient: "linear-gradient(135deg, #8345f0, #7c3aed)", glow: "rgba(124, 58, 237, 0.3)" },
  { color: "#f59e0b", gradient: "linear-gradient(135deg, #f9a825, #f59e0b)", glow: "rgba(245, 158, 11, 0.3)" },
];

interface TimelineColoredPillsProps {
  videoRef: RefObject<HTMLVideoElement | null>;
  sections: Section[];
  duration: number;
}

export function TimelineColoredPills({
  videoRef,
  sections,
  duration,
}: TimelineColoredPillsProps) {
  const [activeSectionIndex, setActiveSectionIndex] = useState(-1);
  const lastSectionRef = useRef(-1);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let rafId: number;
    let running = true;
    const numSections = sections.length;

    const tick = () => {
      if (!running) return;

      const t = video.currentTime;
      let idx = sections.findIndex(
        (s) => t >= s.startTime && t < s.endTime
      );
      // Keep last section active at/past its end
      if (idx === -1 && numSections > 0 && t >= sections[numSections - 1].startTime) {
        idx = numSections - 1;
      }

      if (idx !== lastSectionRef.current) {
        lastSectionRef.current = idx;
        setActiveSectionIndex(idx);
      }

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => {
      running = false;
      cancelAnimationFrame(rafId);
    };
  }, [videoRef, sections, duration]);

  return (
    <div className="mx-auto" style={{ maxWidth: 620 }}>
      <div className="flex items-start gap-2.5">
        {sections.map((section, index) => {
          const sectionDuration = section.endTime - section.startTime;
          const isActive = activeSectionIndex === index;
          const isPast = activeSectionIndex > index;
          const color = PILL_COLORS[index % PILL_COLORS.length];

          return (
            <div
              key={index}
              className="flex flex-col items-center gap-2"
              style={{ flex: sectionDuration }}
            >
              <motion.div
                className="w-full flex items-center justify-center"
                animate={{
                  scale: isActive ? 1.04 : 1,
                  opacity: !isPast && !isActive && activeSectionIndex >= 0 ? 0.55 : 1,
                  boxShadow: isActive
                    ? `0 10px 28px -6px ${color.glow}, 0 6px 14px -4px ${color.glow}`
                    : "0 4px 12px -2px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
                  filter: isActive ? "brightness(1.08)" : "brightness(1)",
                }}
                transition={{
                  duration: 0.35,
                  ease: [0.25, 0.1, 0.25, 1],
                }}
                style={{
                  background: color.gradient,
                  border: "2px solid #ffffff",
                  borderRadius: 9999,
                  paddingTop: 16,
                  paddingBottom: 16,
                  paddingLeft: 24,
                  paddingRight: 24,
                  minHeight: 52,
                }}
              >
                <span
                  className="text-white font-semibold text-sm whitespace-nowrap"
                  style={{ textShadow: "0 1px 2px rgba(0,0,0,0.12)" }}
                >
                  {section.name}
                </span>
              </motion.div>
              <span className="text-xs text-zinc-400 font-medium tabular-nums">
                ({Math.round(sectionDuration)} sec)
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
