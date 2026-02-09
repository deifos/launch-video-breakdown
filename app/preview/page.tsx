"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { TimelineOverlay, type TimelineVariant } from "@/components/TimelineOverlay";
import { DownloadButton } from "@/components/DownloadButton";
import { encodeVideoWithOverlay } from "@/lib/mediabunny-encoder";
import { toast } from "sonner";
import type { AnalysisResult } from "@/types";

export default function PreviewPage() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(
    null
  );
  const [timelineVariant, setTimelineVariant] = useState<TimelineVariant>("dots");
  const [isEncoding, setIsEncoding] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const stored = sessionStorage.getItem("analysisResult");
    if (!stored) {
      router.push("/");
      return;
    }
    try {
      const result = JSON.parse(stored) as AnalysisResult;
      setAnalysisResult(result);
    } catch {
      router.push("/");
    }
  }, [router]);

  const handleDownload = useCallback(async () => {
    if (!analysisResult) return;

    setIsEncoding(true);
    setProgress(0);

    try {
      const blob = await encodeVideoWithOverlay(
        analysisResult.videoUrl,
        analysisResult.sections,
        analysisResult.videoDuration,
        timelineVariant,
        (p) => setProgress(Math.floor(p * 100))
      );

      toast.success("Video encoded successfully!");

      const downloadUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = `launch-video-breakdown-${Date.now()}.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(downloadUrl);

      toast.success("Download started! Check your downloads folder.", {
        duration: 5000,
      });
    } catch (error) {
      console.error("Encoding error:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to encode video"
      );
    } finally {
      setIsEncoding(false);
      setProgress(0);
    }
  }, [analysisResult, timelineVariant]);

  if (!analysisResult) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-black/10 border-t-black/60 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--background)] noise-overlay">
      {/* Accent bars */}
      <div className="accent-bar-left" />
      <div className="accent-bar-right" />

      <header className="relative z-10 border-b border-black/[0.06] bg-white">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/")}
              className="flex items-center gap-2.5 hover:opacity-70 transition-opacity"
            >
              <div className="w-7 h-7 rounded-md bg-[var(--accent)] flex items-center justify-center">
                <svg
                  className="w-3.5 h-3.5 text-white"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
              <span className="text-[15px] font-semibold tracking-tight text-black/90">
                Launch Breakdown
              </span>
            </button>
            <span className="text-black/15">|</span>
            <span className="text-xs text-black/40 font-medium">
              {analysisResult.sections.length} sections detected
            </span>
          </div>

          <div className="flex items-center gap-2">
            <DownloadButton
              isEncoding={isEncoding}
              progress={progress}
              onDownload={handleDownload}
            />
            <button
              onClick={() => router.push("/")}
              className="h-9 px-4 text-sm font-medium text-black/50 hover:text-black/80 rounded-lg border border-black/[0.08] hover:border-black/15 transition-colors"
            >
              New Video
            </button>
          </div>
        </div>
      </header>

      <main className="relative z-10 px-6 py-6">
        <div className="mx-auto max-w-4xl">
          <div className="bg-white rounded-2xl border border-black/[0.06] shadow-[0_2px_20px_rgba(0,0,0,0.04)] overflow-hidden">
            <div className="relative aspect-video max-h-[55vh] mx-auto">
              <video
                ref={videoRef}
                src={analysisResult.videoUrl}
                className="h-full w-full object-contain"
                controls
                playsInline
              />

              {isEncoding && (
                <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center gap-4 z-30">
                  <div className="relative w-24 h-24">
                    <svg className="w-24 h-24 -rotate-90" viewBox="0 0 96 96">
                      <circle
                        cx="48"
                        cy="48"
                        r="40"
                        fill="none"
                        stroke="rgba(255,255,255,0.15)"
                        strokeWidth="6"
                      />
                      <circle
                        cx="48"
                        cy="48"
                        r="40"
                        fill="none"
                        stroke="var(--accent)"
                        strokeWidth="6"
                        strokeLinecap="round"
                        strokeDasharray={`${2 * Math.PI * 40}`}
                        strokeDashoffset={`${2 * Math.PI * 40 * (1 - progress / 100)}`}
                        style={{ transition: "stroke-dashoffset 0.3s ease" }}
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-white text-xl font-bold">
                        {progress}%
                      </span>
                    </div>
                  </div>

                  <div className="text-center">
                    <p className="text-white font-medium text-sm">
                      Encoding video...
                    </p>
                    <p className="text-white/50 text-xs mt-1">
                      This may take a moment
                    </p>
                  </div>
                </div>
              )}
            </div>

            <TimelineOverlay
              videoRef={videoRef}
              sections={analysisResult.sections}
              duration={analysisResult.videoDuration}
              variant={timelineVariant}
              onVariantChange={setTimelineVariant}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
