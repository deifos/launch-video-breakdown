import {
  Output,
  BufferTarget,
  Mp4OutputFormat,
  CanvasSource,
  AudioBufferSource,
} from "mediabunny";
import type { Section } from "@/types";

export interface EncodingProgressCallback {
  (progress: number): void;
}

export type TimelineVariant = "dots" | "pills";

export async function encodeVideoWithOverlay(
  videoUrl: string,
  sections: Section[],
  duration: number,
  variant: TimelineVariant = "dots",
  onProgress?: EncodingProgressCallback
): Promise<Blob> {
  // Load video
  const video = document.createElement("video");
  video.src = videoUrl;
  video.crossOrigin = "anonymous";
  video.muted = true;
  video.playsInline = true;
  video.preload = "auto";

  await new Promise<void>((resolve, reject) => {
    video.onloadedmetadata = () => resolve();
    video.onerror = () => reject(new Error("Failed to load video"));
    video.load();
  });

  await new Promise<void>((resolve) => {
    if (video.readyState >= 3) resolve();
    else video.oncanplay = () => resolve();
  });

  const videoWidth = video.videoWidth;
  const videoHeight = video.videoHeight;

  // Create canvas for compositing
  const canvas = document.createElement("canvas");
  canvas.width = videoWidth;
  canvas.height = videoHeight;
  const ctx = canvas.getContext("2d")!;

  // Initialize MediaBunny
  const output = new Output({
    format: new Mp4OutputFormat({ fastStart: "in-memory" }),
    target: new BufferTarget(),
  });

  const fps = 30;
  const videoSource = new CanvasSource(canvas, {
    codec: "avc",
    bitrate: 15_000_000,
  });
  output.addVideoTrack(videoSource, { frameRate: fps });

  // Add audio track
  try {
    const arrayBuffer = await (await fetch(videoUrl)).arrayBuffer();
    const audioContext = new AudioContext();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    const audioSource = new AudioBufferSource({ codec: "aac", bitrate: 192_000 });
    output.addAudioTrack(audioSource);
    await output.start();
    await audioSource.add(audioBuffer);
    audioSource.close();
    await audioContext.close();
  } catch (err) {
    console.warn("Audio processing failed, continuing without audio:", err);
    await output.start();
  }

  // Transition state for pill animations
  const TRANSITION_DURATION = 0.3; // seconds
  let prevActiveIdx = -1;
  let leavingIdx = -1;
  let transitionStartTime = -1;

  // Process each frame
  const totalFrames = Math.ceil(duration * fps);
  const frameDuration = 1 / fps;

  for (let frameIndex = 0; frameIndex < totalFrames; frameIndex++) {
    const currentTime = frameIndex / fps;

    // Seek video
    video.currentTime = currentTime;
    await new Promise<void>((resolve) => {
      const onSeeked = () => {
        video.removeEventListener("seeked", onSeeked);
        resolve();
      };
      video.addEventListener("seeked", onSeeked);
      setTimeout(() => {
        video.removeEventListener("seeked", onSeeked);
        resolve();
      }, 100);
    });

    // Find active section
    let activeIdx = sections.findIndex(
      (s) => currentTime >= s.startTime && currentTime < s.endTime
    );
    if (activeIdx === -1 && sections.length > 0 && currentTime >= sections[sections.length - 1].startTime) {
      activeIdx = sections.length - 1;
    }

    // Track transitions
    if (activeIdx !== prevActiveIdx) {
      leavingIdx = prevActiveIdx;
      transitionStartTime = currentTime;
      prevActiveIdx = activeIdx;
    }

    const transitionT = transitionStartTime >= 0
      ? Math.min((currentTime - transitionStartTime) / TRANSITION_DURATION, 1)
      : 1;

    // Clear canvas
    ctx.clearRect(0, 0, videoWidth, videoHeight);

    // Draw video frame
    ctx.drawImage(video, 0, 0, videoWidth, videoHeight);

    // Draw timeline overlay based on variant
    if (variant === "pills") {
      drawColoredPillsOverlay(ctx, sections, currentTime, duration, videoWidth, videoHeight, {
        activeIdx,
        leavingIdx: transitionT < 1 ? leavingIdx : -1,
        transitionT,
      });
    } else {
      drawTimelineOverlay(ctx, sections, currentTime, duration, videoWidth, videoHeight, {
        activeIdx,
        leavingIdx: transitionT < 1 ? leavingIdx : -1,
        transitionT,
      });
    }

    // Add frame to MediaBunny
    await videoSource.add(currentTime, frameDuration);

    // Update progress
    if (onProgress) {
      onProgress((frameIndex + 1) / totalFrames);
    }
  }

  // Finalize
  videoSource.close();
  await output.finalize();

  const outputBuffer = (output.target as BufferTarget).buffer;
  if (!outputBuffer) throw new Error("No output buffer");

  return new Blob([outputBuffer], { type: "video/mp4" });
}

// Ease function for smooth transitions
function easeOut(t: number): number {
  return 1 - (1 - t) * (1 - t);
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerpColor(
  r1: number, g1: number, b1: number,
  r2: number, g2: number, b2: number,
  t: number
): string {
  return `rgb(${Math.round(lerp(r1, r2, t))}, ${Math.round(lerp(g1, g2, t))}, ${Math.round(lerp(b1, b2, t))})`;
}

interface TransitionState {
  activeIdx: number;
  leavingIdx: number;
  transitionT: number; // 0 = just started, 1 = done
}

function drawTimelineOverlay(
  ctx: CanvasRenderingContext2D,
  sections: Section[],
  currentTime: number,
  duration: number,
  canvasWidth: number,
  canvasHeight: number,
  transition: TransitionState
) {
  const numSections = sections.length;
  if (numSections === 0) return;

  const { activeIdx, leavingIdx, transitionT } = transition;
  const easedT = easeOut(transitionT);

  // Scale factor relative to a 1280px reference width
  const S = canvasWidth / 1280;

  const overlayHeight = Math.round(130 * S);
  const overlayTop = canvasHeight - overlayHeight;

  // --- Section-based progress ---
  let pct = 0;
  if (activeIdx >= 0) {
    const s = sections[activeIdx];
    const sectionProg = Math.min(
      (currentTime - s.startTime) / (s.endTime - s.startTime),
      1
    );
    pct = (activeIdx + sectionProg) / numSections;
  } else if (currentTime >= sections[numSections - 1].endTime) {
    pct = 1;
  }

  // Section progress for peach → orange color
  let sectionProgress = 0;
  if (activeIdx >= 0) {
    const s = sections[activeIdx];
    sectionProgress = Math.min(
      (currentTime - s.startTime) / (s.endTime - s.startTime),
      1
    );
  }

  // --- Draw light gray background ---
  ctx.fillStyle = "rgb(244, 244, 245)";
  ctx.fillRect(0, overlayTop, canvasWidth, overlayHeight);

  // --- Pill dimensions ---
  const pillGap = Math.round(10 * S);
  const activeFontSize = Math.round(15 * S);
  const inactiveFontSize = Math.round(13 * S);
  const activePadX = Math.round(28 * S);
  const inactivePadX = Math.round(16 * S);
  const activePH = Math.round(38 * S);
  const inactivePH = Math.round(30 * S);
  const pillY = overlayTop + Math.round(55 * S);

  // --- Measure & position pills with animated sizes ---
  interface PillInfo {
    width: number;
    height: number;
    fontSize: number;
    fontWeight: number;
    centerX: number;
    bgColor: string;
    textColor: string;
    hasShadow: boolean;
    hasBorder: boolean;
    shadowAlpha: number;
  }

  const pills: PillInfo[] = [];
  let totalWidth = 0;

  sections.forEach((section, index) => {
    // Determine animated state for this pill
    let t = 0; // 0 = fully inactive, 1 = fully active
    if (index === activeIdx) {
      t = leavingIdx >= 0 ? easedT : 1;
    } else if (index === leavingIdx) {
      t = 1 - easedT;
    }

    const fontSize = lerp(inactiveFontSize, activeFontSize, t);
    const fontWeight = t > 0.5 ? 600 : 400;
    ctx.font = `${fontWeight} ${fontSize}px -apple-system, system-ui, sans-serif`;
    const textWidth = ctx.measureText(section.name).width;
    const padX = lerp(inactivePadX, activePadX, t);
    const ph = lerp(inactivePH, activePH, t);
    const pw = textWidth + padX * 2;

    // Peach → orange for active pill based on section progress
    const r = Math.round(lerp(253, 249, sectionProgress));
    const g = Math.round(lerp(186, 115, sectionProgress));
    const b = Math.round(lerp(140, 22, sectionProgress));
    const bgColor = t > 0.01
      ? lerpColor(228, 228, 231, r, g, b, t)
      : "rgb(228, 228, 231)";
    const textColor = t > 0.01
      ? lerpColor(161, 161, 170, 255, 255, 255, t)
      : "rgb(161, 161, 170)";

    pills.push({
      width: pw,
      height: ph,
      fontSize,
      fontWeight,
      centerX: 0,
      bgColor,
      textColor,
      hasShadow: t > 0.3,
      hasBorder: t < 0.5,
      shadowAlpha: t * 0.25,
    });

    totalWidth += pw;
  });
  totalWidth += pillGap * (numSections - 1);

  // Compute positions
  let posX = (canvasWidth - totalWidth) / 2;
  for (let i = 0; i < numSections; i++) {
    pills[i].centerX = posX + pills[i].width / 2;
    posX += pills[i].width + pillGap;
  }

  const firstPillCenter = pills[0].centerX;
  const lastPillCenter = pills[numSections - 1].centerX;
  const pillsRange = Math.max(lastPillCenter - firstPillCenter, 1);

  const badgeX = firstPillCenter + pct * pillsRange;

  // --- 1. Badge ---
  const badgeFontSize = Math.round(13 * S);
  const percentText = `${Math.floor(pct * 100)}%`;
  ctx.font = `700 ${badgeFontSize}px -apple-system, system-ui, sans-serif`;
  const percentWidth = ctx.measureText(percentText).width;
  const bubbleW = percentWidth + Math.round(20 * S);
  const bubbleH = Math.round(26 * S);
  const bubbleR = bubbleH / 2;
  const bubbleY = overlayTop + Math.round(6 * S);

  ctx.fillStyle = "rgb(24, 24, 27)";
  ctx.beginPath();
  ctx.roundRect(badgeX - bubbleW / 2, bubbleY, bubbleW, bubbleH, bubbleR);
  ctx.fill();

  // Curved pointer
  const pointerW = Math.round(16 * S);
  const pointerH = Math.round(8 * S);
  const pointerTop = bubbleY + bubbleH - 1;
  ctx.beginPath();
  ctx.moveTo(badgeX - pointerW / 2, pointerTop);
  ctx.bezierCurveTo(
    badgeX - pointerW * 0.2, pointerTop,
    badgeX - pointerW * 0.15, pointerTop + pointerH,
    badgeX, pointerTop + pointerH
  );
  ctx.bezierCurveTo(
    badgeX + pointerW * 0.15, pointerTop + pointerH,
    badgeX + pointerW * 0.2, pointerTop,
    badgeX + pointerW / 2, pointerTop
  );
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "white";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `700 ${badgeFontSize}px -apple-system, system-ui, sans-serif`;
  ctx.fillText(percentText, badgeX, bubbleY + bubbleH / 2);

  // --- 2. Stem ---
  const stemTop = pointerTop + pointerH;
  const stemHeight = Math.round(16 * S);
  const stemWidth = Math.round(2 * S);
  const stemGrad = ctx.createLinearGradient(0, stemTop, 0, stemTop + stemHeight);
  stemGrad.addColorStop(0, "rgb(24, 24, 27)");
  stemGrad.addColorStop(0.4, "rgb(24, 24, 27)");
  stemGrad.addColorStop(1, "rgba(24, 24, 27, 0)");
  ctx.fillStyle = stemGrad;
  ctx.fillRect(badgeX - stemWidth / 2, stemTop, stemWidth, stemHeight);

  // --- 3. Pills (animated) ---
  let drawX = (canvasWidth - totalWidth) / 2;
  sections.forEach((section, index) => {
    const pill = pills[index];
    const py = pillY - pill.height / 2;

    // Shadow
    if (pill.hasShadow) {
      ctx.shadowColor = `rgba(249, 115, 22, ${pill.shadowAlpha})`;
      ctx.shadowBlur = Math.round(12 * S);
      ctx.shadowOffsetY = Math.round(3 * S);
    }

    // Pill background
    ctx.fillStyle = pill.bgColor;
    ctx.beginPath();
    ctx.roundRect(drawX, py, pill.width, pill.height, pill.height / 2);
    ctx.fill();

    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;

    // Border for inactive/transitioning pills
    if (pill.hasBorder) {
      ctx.strokeStyle = "rgb(212, 212, 216)";
      ctx.lineWidth = 1 * S;
      ctx.beginPath();
      ctx.roundRect(drawX, py, pill.width, pill.height, pill.height / 2);
      ctx.stroke();
    }

    // Pill text
    ctx.fillStyle = pill.textColor;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `${pill.fontWeight} ${pill.fontSize}px -apple-system, system-ui, sans-serif`;
    ctx.fillText(section.name, pill.centerX, pillY);

    drawX += pill.width + pillGap;
  });

  // --- 4. Dots with gooey metaball effect ---
  // Cap dots so minimum spacing is ~14px (scaled) between centers
  const maxDotsFromSpacing = Math.floor((620 * S) / (14 * S));
  const totalDots = Math.max(20, Math.min(maxDotsFromSpacing, Math.round(duration * 1.15)));
  const dotY = pillY + activePH / 2 + Math.round(22 * S);
  const dotR = Math.round(3 * S);
  const playheadR = Math.round(7 * S);
  const dotsPad = Math.round(28 * S);

  const dotsLeft = firstPillCenter - dotsPad;
  const dotsRight = lastPillCenter + dotsPad;
  const dotsWidth = dotsRight - dotsLeft;
  const dotSpacing = dotsWidth / (totalDots - 1);

  const playheadX = firstPillCenter + pct * pillsRange;

  ctx.fillStyle = "rgb(24, 24, 27)";

  // Draw dots with gooey merge — dots near the playhead get pulled toward it
  for (let i = 0; i < totalDots; i++) {
    const staticX = dotsLeft + i * dotSpacing;
    const dist = Math.abs(staticX - playheadX);
    const mergeRange = dotSpacing * 3;

    let dx = staticX;
    let r = dotR;

    if (dist < mergeRange) {
      const influence = 1 - dist / mergeRange;
      const pullStrength = influence * influence; // quadratic falloff

      // Pull dot position toward playhead
      dx = lerp(staticX, playheadX, pullStrength * 0.3);

      // Grow dot as it merges
      r = lerp(dotR, playheadR * 0.6, pullStrength);
    }

    ctx.beginPath();
    ctx.arc(dx, dotY, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Draw connecting bridges between playhead and nearest dots
  const bridgeRange = dotSpacing * 2;
  for (let i = 0; i < totalDots; i++) {
    const staticX = dotsLeft + i * dotSpacing;
    const dist = Math.abs(staticX - playheadX);

    if (dist < bridgeRange && dist > playheadR * 0.5) {
      const strength = 1 - dist / bridgeRange;
      const bridgeWidth = lerp(dotR * 0.3, playheadR * 0.5, strength);

      // Draw a smooth capsule bridge between the dot and playhead
      const x1 = Math.min(staticX, playheadX);
      const x2 = Math.max(staticX, playheadX);

      ctx.beginPath();
      ctx.moveTo(x1, dotY - bridgeWidth);
      ctx.lineTo(x2, dotY - bridgeWidth);
      ctx.lineTo(x2, dotY + bridgeWidth);
      ctx.lineTo(x1, dotY + bridgeWidth);
      ctx.closePath();
      ctx.fill();
    }
  }

  // Playhead dot (drawn last, on top)
  ctx.beginPath();
  ctx.arc(playheadX, dotY, playheadR, 0, Math.PI * 2);
  ctx.fill();
}

// --- Colored Pills Overlay (matches TimelineColoredPills component) ---

const PILL_COLORS_CANVAS = [
  { r: 245, g: 158, b: 11, glowR: 245, glowG: 158, glowB: 11 },   // orange
  { r: 124, g: 58, b: 237, glowR: 124, glowG: 58, glowB: 237 },    // purple
  { r: 192, g: 38, b: 211, glowR: 192, glowG: 38, glowB: 211 },    // magenta
  { r: 124, g: 58, b: 237, glowR: 124, glowG: 58, glowB: 237 },    // purple
  { r: 245, g: 158, b: 11, glowR: 245, glowG: 158, glowB: 11 },    // orange
];

function drawColoredPillsOverlay(
  ctx: CanvasRenderingContext2D,
  sections: Section[],
  currentTime: number,
  duration: number,
  canvasWidth: number,
  canvasHeight: number,
  transition: TransitionState
) {
  const numSections = sections.length;
  if (numSections === 0) return;

  const { activeIdx, leavingIdx, transitionT } = transition;
  const easedT = easeOut(transitionT);

  const S = canvasWidth / 1280;

  const overlayHeight = Math.round(110 * S);
  const overlayTop = canvasHeight - overlayHeight;

  // --- Draw light gray background ---
  ctx.fillStyle = "rgb(244, 244, 245)";
  ctx.fillRect(0, overlayTop, canvasWidth, overlayHeight);

  // --- Calculate total duration for proportional sizing ---
  const totalDuration = sections.reduce((sum, s) => sum + (s.endTime - s.startTime), 0);

  const pillGap = Math.round(10 * S);
  const maxPillsWidth = Math.round(620 * S);
  const availableWidth = maxPillsWidth - pillGap * (numSections - 1);
  const pillHeight = Math.round(52 * S);
  const pillY = overlayTop + Math.round(24 * S);
  const fontSize = Math.round(14 * S);
  const borderWidth = Math.round(2 * S);

  // --- Compute pill widths: min width from text, then distribute extra proportionally ---
  interface ColoredPillInfo {
    width: number;
    x: number;
    centerX: number;
    sectionDuration: number;
    color: typeof PILL_COLORS_CANVAS[0];
  }

  const padX = Math.round(24 * S);
  ctx.font = `600 ${fontSize}px -apple-system, system-ui, sans-serif`;

  // First pass: compute minimum widths from text
  const minWidths: number[] = [];
  let totalMinWidth = 0;
  sections.forEach((section) => {
    const textW = ctx.measureText(section.name).width;
    const minW = textW + padX * 2;
    minWidths.push(minW);
    totalMinWidth += minW;
  });

  // Distribute remaining space proportionally by duration
  const extraSpace = Math.max(0, availableWidth - totalMinWidth);
  const pillWidths: number[] = sections.map((section, index) => {
    const secDur = section.endTime - section.startTime;
    const extraShare = totalDuration > 0 ? (secDur / totalDuration) * extraSpace : 0;
    return Math.round(minWidths[index] + extraShare);
  });

  // Compute actual total and center
  const actualTotalWidth = pillWidths.reduce((a, b) => a + b, 0) + pillGap * (numSections - 1);

  const pills: ColoredPillInfo[] = [];
  let startX = (canvasWidth - actualTotalWidth) / 2;

  sections.forEach((section, index) => {
    const secDur = section.endTime - section.startTime;
    const pw = pillWidths[index];
    const color = PILL_COLORS_CANVAS[index % PILL_COLORS_CANVAS.length];

    pills.push({
      width: pw,
      x: startX,
      centerX: startX + pw / 2,
      sectionDuration: secDur,
      color,
    });

    startX += pw + pillGap;
  });

  // --- Draw pills ---
  sections.forEach((section, index) => {
    const pill = pills[index];
    const color = pill.color;

    // Determine animation state
    let t = 0;
    if (index === activeIdx) {
      t = leavingIdx >= 0 ? easedT : 1;
    } else if (index === leavingIdx) {
      t = 1 - easedT;
    }

    const isActive = t > 0.5;
    const isPast = activeIdx > index && activeIdx >= 0;
    const isFuture = activeIdx >= 0 && !isActive && !isPast;

    // Scale animation
    const scale = lerp(1, 1.04, t);
    const pillW = pill.width * scale;
    const pillH = pillHeight * scale;
    const px = pill.centerX - pillW / 2;
    const py = pillY + (pillHeight - pillH) / 2;
    const radius = pillH / 2;

    // Opacity for future sections
    const alpha = isFuture ? 0.55 : 1;

    ctx.save();
    ctx.globalAlpha = alpha;

    // Shadow for active pills
    if (t > 0.3) {
      ctx.shadowColor = `rgba(${color.glowR}, ${color.glowG}, ${color.glowB}, ${t * 0.3})`;
      ctx.shadowBlur = Math.round(28 * S);
      ctx.shadowOffsetY = Math.round(10 * S);
    }

    // Brightness boost for active
    // (We'll approximate by making the color slightly lighter)
    const brightnessBoost = lerp(0, 20, t);

    // Pill fill
    const r = Math.min(255, color.r + brightnessBoost);
    const g = Math.min(255, color.g + brightnessBoost);
    const b = Math.min(255, color.b + brightnessBoost);
    ctx.fillStyle = `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;
    ctx.beginPath();
    ctx.roundRect(px, py, pillW, pillH, radius);
    ctx.fill();

    // Reset shadow
    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;

    // White border
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = borderWidth;
    ctx.beginPath();
    ctx.roundRect(px, py, pillW, pillH, radius);
    ctx.stroke();

    // Pill text
    ctx.fillStyle = "white";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `600 ${fontSize}px -apple-system, system-ui, sans-serif`;
    ctx.fillText(section.name, pill.centerX, pillY + pillHeight / 2);

    ctx.restore();

    // Duration label below pill
    const labelY = pillY + pillHeight + Math.round(14 * S);
    const labelFontSize = Math.round(11 * S);
    ctx.fillStyle = "rgb(161, 161, 170)";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `500 ${labelFontSize}px -apple-system, system-ui, sans-serif`;
    ctx.fillText(`(${Math.round(pill.sectionDuration)} sec)`, pill.centerX, labelY);
  });
}
