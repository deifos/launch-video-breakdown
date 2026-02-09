"use client";

import { useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";

const MAX_DURATION_SECONDS = 90;
const MAX_FILE_SIZE_MB = 100;
const SUPPORTED_FORMATS = ["video/mp4", "video/webm", "video/quicktime", "video/x-msvideo"];

export function VideoUploader() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);

  const validateVideoDuration = useCallback(
    (videoElement: HTMLVideoElement): Promise<number> => {
      return new Promise((resolve, reject) => {
        videoElement.onloadedmetadata = () => {
          const duration = videoElement.duration;
          if (duration > MAX_DURATION_SECONDS) {
            reject(new Error(`Video must be ${MAX_DURATION_SECONDS} seconds or less. Your video is ${Math.floor(duration)} seconds.`));
          } else {
            resolve(duration);
          }
        };
        videoElement.onerror = () => {
          reject(new Error("Failed to load video metadata"));
        };
      });
    },
    []
  );

  const handleFileUpload = useCallback(
    async (file: File) => {
      setError(null);
      setIsLoading(true);

      try {
        if (!SUPPORTED_FORMATS.includes(file.type)) {
          throw new Error(
            `Unsupported format. Please use MP4, WebM, MOV, or AVI.`
          );
        }

        const fileSizeMB = file.size / (1024 * 1024);
        if (fileSizeMB > MAX_FILE_SIZE_MB) {
          throw new Error(`File size must be less than ${MAX_FILE_SIZE_MB}MB`);
        }

        const previewUrl = URL.createObjectURL(file);
        setVideoPreviewUrl(previewUrl);

        const video = document.createElement("video");
        video.src = previewUrl;
        video.preload = "metadata";

        const duration = await validateVideoDuration(video);

        toast.loading("Analyzing video...");

        const formData = new FormData();
        formData.append("file", file);
        formData.append("duration", duration.toString());

        const response = await fetch("/api/analyze", {
          method: "POST",
          body: formData,
        });

        toast.dismiss();

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to analyze video");
        }

        const result = await response.json();
        result.videoUrl = previewUrl;

        sessionStorage.setItem("analysisResult", JSON.stringify(result));
        router.push("/preview");
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to process video";
        setError(errorMessage);
        setVideoPreviewUrl(null);
        toast.error(errorMessage);
      } finally {
        setIsLoading(false);
      }
    },
    [router, validateVideoDuration]
  );

  const handleFileInputChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files || files.length === 0) return;
      await handleFileUpload(files[0]);
    },
    [handleFileUpload]
  );

  return (
    <div className="w-full">
      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Video preview while processing */}
      {videoPreviewUrl && isLoading ? (
        <div>
          <div className="relative rounded-xl overflow-hidden bg-black aspect-video">
            <video
              src={videoPreviewUrl}
              className="w-full h-full object-contain"
              muted
              autoPlay
              loop
              playsInline
            />
            <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center gap-3">
              <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span className="text-white text-sm font-medium tracking-wide">
                Analyzing video...
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3">
          <input
            ref={fileInputRef}
            type="file"
            accept="video/mp4,video/webm,video/quicktime,video/x-msvideo"
            onChange={handleFileInputChange}
            className="hidden"
            disabled={isLoading}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading}
            className="h-11 px-6 bg-black text-white text-sm font-medium rounded-lg hover:bg-black/85 transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-2.5 shrink-0"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
              />
            </svg>
            Upload Video
          </button>
          <span className="text-[11px] text-black/30 tracking-wide">
            MP4, WebM, MOV &middot; Max 90s
          </span>
        </div>
      )}
    </div>
  );
}
