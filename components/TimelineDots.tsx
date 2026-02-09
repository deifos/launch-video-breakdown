"use client";

import {
  useRef,
  useEffect,
  useState,
  useMemo,
  useCallback,
  type RefObject,
} from "react";
import { motion } from "framer-motion";
import type { Section } from "@/types";

interface TimelineDotsProps {
  videoRef: RefObject<HTMLVideoElement | null>;
  sections: Section[];
  duration: number;
}

export function TimelineDots({
  videoRef,
  sections,
  duration,
}: TimelineDotsProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const pillsRef = useRef<HTMLDivElement>(null);
  const badgeWrapRef = useRef<HTMLDivElement>(null);
  const badgeTextRef = useRef<HTMLSpanElement>(null);
  const playheadRef = useRef<HTMLDivElement>(null);
  const stemRef = useRef<HTMLDivElement>(null);
  const dotsRef = useRef<HTMLDivElement>(null);

  const [activeSectionIndex, setActiveSectionIndex] = useState(-1);
  const [sectionProgress, setSectionProgress] = useState(0);
  const lastSectionRef = useRef(-1);

  const pillsRangeRef = useRef({ left: 0, width: 620 });
  const dotsPaddingRef = useRef(0);

  const totalDots = useMemo(
    () => {
      // Target ~10px spacing between dot centers at 620px container width
      const maxFromSpacing = Math.floor(620 / 14);
      return Math.max(20, Math.min(maxFromSpacing, Math.round(duration * 1.15)));
    },
    [duration]
  );

  const activePillColor = useMemo(() => {
    const r = Math.round(253 + (249 - 253) * sectionProgress);
    const g = Math.round(186 + (115 - 186) * sectionProgress);
    const b = Math.round(140 + (22 - 140) * sectionProgress);
    return `rgb(${r}, ${g}, ${b})`;
  }, [sectionProgress]);

  const measurePills = useCallback(() => {
    const containerEl = containerRef.current;
    const pillsEl = pillsRef.current;
    const dotsEl = dotsRef.current;
    if (!containerEl || !pillsEl) return;

    const cRect = containerEl.getBoundingClientRect();
    const children = Array.from(pillsEl.children) as HTMLElement[];
    if (children.length === 0) return;

    const firstRect = children[0].getBoundingClientRect();
    const lastRect = children[children.length - 1].getBoundingClientRect();

    const firstCenter = firstRect.left + firstRect.width / 2 - cRect.left;
    const lastCenter = lastRect.left + lastRect.width / 2 - cRect.left;
    const width = Math.max(lastCenter - firstCenter, 1);

    pillsRangeRef.current = { left: firstCenter, width };

    const dotsPad = 28;
    const dotsLeft = Math.max(0, firstCenter - dotsPad);
    const dotsRight = Math.min(cRect.width, lastCenter + dotsPad);
    dotsPaddingRef.current = firstCenter - dotsLeft;

    if (dotsEl) {
      dotsEl.style.marginLeft = `${dotsLeft}px`;
      dotsEl.style.marginRight = `${cRect.width - dotsRight}px`;
    }
  }, []);

  useEffect(() => {
    measurePills();
    const t1 = setTimeout(measurePills, 120);
    const t2 = setTimeout(measurePills, 400);

    window.addEventListener("resize", measurePills);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      window.removeEventListener("resize", measurePills);
    };
  }, [activeSectionIndex, sections, measurePills]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let rafId: number;
    let running = true;
    let lastProgressUpdate = 0;
    const numSections = sections.length;

    const tick = () => {
      if (!running) return;

      const t = video.currentTime;

      // Section detection — keep last section active at/past its end
      let idx = sections.findIndex(
        (s) => t >= s.startTime && t < s.endTime
      );
      if (idx === -1 && numSections > 0 && t >= sections[numSections - 1].startTime) {
        idx = numSections - 1;
      }

      // Section-based position: each section gets equal width
      let pct: number;
      if (numSections === 0) {
        pct = duration > 0 ? Math.min(t / duration, 1) : 0;
      } else if (idx >= 0) {
        const s = sections[idx];
        const sectionProg = Math.min(
          (t - s.startTime) / (s.endTime - s.startTime),
          1
        );
        pct = (idx + sectionProg) / numSections;
      } else {
        pct = 0;
      }

      const { left: rangeLeft, width: rangeWidth } = pillsRangeRef.current;
      const pixelLeft = rangeLeft + pct * rangeWidth;
      const leftPx = `${pixelLeft}px`;

      if (badgeWrapRef.current) badgeWrapRef.current.style.left = leftPx;
      if (badgeTextRef.current)
        badgeTextRef.current.textContent = `${Math.floor(pct * 100)}%`;
      if (stemRef.current) stemRef.current.style.left = leftPx;

      const pad = dotsPaddingRef.current;
      const dotsWidth = rangeWidth + pad * 2;
      const playheadPct =
        dotsWidth > 0 ? ((pct * rangeWidth + pad) / dotsWidth) * 100 : 0;
      if (playheadRef.current)
        playheadRef.current.style.left = `${playheadPct}%`;

      if (idx !== lastSectionRef.current) {
        lastSectionRef.current = idx;
        setActiveSectionIndex(idx);
        if (idx >= 0) {
          const s = sections[idx];
          setSectionProgress(
            Math.min((t - s.startTime) / (s.endTime - s.startTime), 1)
          );
        }
        lastProgressUpdate = performance.now();
      }

      const now = performance.now();
      if (idx >= 0 && now - lastProgressUpdate > 125) {
        const s = sections[idx];
        setSectionProgress(
          Math.min((t - s.startTime) / (s.endTime - s.startTime), 1)
        );
        lastProgressUpdate = now;
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
    <>
      {/* Hidden SVG filter definition for gooey dots */}
      <svg
        style={{
          position: "absolute",
          width: 0,
          height: 0,
          overflow: "hidden",
        }}
      >
        <defs>
          <filter id="goo">
            <feGaussianBlur
              in="SourceGraphic"
              stdDeviation="2"
              result="blur"
            />
            <feColorMatrix
              in="blur"
              mode="matrix"
              values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 8 -3"
            />
          </filter>
        </defs>
      </svg>

      <div ref={containerRef} className="relative mx-auto" style={{ maxWidth: 620 }}>
        {/* Badge */}
        <div className="relative" style={{ height: 44, zIndex: 20 }}>
          <div
            ref={badgeWrapRef}
            className="absolute flex flex-col items-center pointer-events-none"
            style={{ left: "0px", top: 0, transform: "translateX(-50%)" }}
          >
            <div className="bg-zinc-900 text-white px-4 py-1.5 rounded-2xl font-bold text-sm whitespace-nowrap">
              <span ref={badgeTextRef}>0%</span>
            </div>
            <svg
              width="22"
              height="10"
              viewBox="0 0 22 10"
              style={{ marginTop: -1, display: "block" }}
            >
              <path
                d="M0,0 C5,0 7,9 11,9 C15,9 17,0 22,0 Z"
                fill="rgb(24, 24, 27)"
              />
            </svg>
          </div>
        </div>

        {/* Stem */}
        <div
          ref={stemRef}
          className="absolute pointer-events-none"
          style={{
            left: "0px",
            top: 38,
            height: 22,
            width: 2,
            background:
              "linear-gradient(to bottom, rgb(24, 24, 27) 0%, rgb(24, 24, 27) 40%, transparent 100%)",
            transform: "translateX(-50%)",
            zIndex: 5,
            borderRadius: 1,
          }}
        />

        {/* Pills */}
        <div
          ref={pillsRef}
          className="relative flex items-center justify-center gap-3 mb-4"
          style={{ zIndex: 10 }}
        >
          {sections.map((section, index) => {
            const isActive = activeSectionIndex === index;
            return (
              <motion.div
                key={index}
                layout
                className="rounded-full cursor-default whitespace-nowrap"
                animate={{
                  backgroundColor: isActive
                    ? activePillColor
                    : "rgb(228, 228, 231)",
                  color: isActive
                    ? "rgb(255, 255, 255)"
                    : "rgb(161, 161, 170)",
                  paddingLeft: isActive ? 28 : 16,
                  paddingRight: isActive ? 28 : 16,
                  paddingTop: isActive ? 12 : 8,
                  paddingBottom: isActive ? 12 : 8,
                  scale: isActive ? 1.08 : 1,
                  boxShadow: isActive
                    ? "0 10px 25px -5px rgba(249, 115, 22, 0.3), 0 4px 10px -3px rgba(249, 115, 22, 0.15)"
                    : "0 1px 2px 0 rgba(0, 0, 0, 0.03)",
                }}
                transition={{
                  layout: { duration: 0.3, ease: [0.25, 0.1, 0.25, 1] },
                  backgroundColor: { duration: 0.3, ease: "easeOut" },
                  color: { duration: 0.2 },
                  default: { duration: 0.3, ease: [0.25, 0.1, 0.25, 1] },
                }}
                style={{
                  fontSize: 13,
                  fontWeight: isActive ? 600 : 400,
                  border: isActive ? "none" : "1px solid rgb(212, 212, 216)",
                }}
              >
                {section.name}
              </motion.div>
            );
          })}
        </div>

        {/* Dots */}
        <div
          ref={dotsRef}
          className="relative flex items-center justify-between"
          style={{ height: 24, filter: "url(#goo)" }}
        >
          {Array.from({ length: totalDots }).map((_, i) => (
            <div
              key={i}
              className="rounded-full bg-zinc-900 flex-shrink-0"
              style={{ width: 6, height: 6 }}
            />
          ))}
          <div
            ref={playheadRef}
            className="absolute rounded-full bg-zinc-900"
            style={{
              width: 14,
              height: 14,
              left: "0%",
              top: "50%",
              transform: "translate(-50%, -50%)",
            }}
          />
        </div>
      </div>
    </>
  );
}
