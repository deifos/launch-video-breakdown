"use client";

interface DownloadButtonProps {
  isEncoding: boolean;
  progress: number;
  onDownload: () => void;
}

export function DownloadButton({
  isEncoding,
  progress,
  onDownload,
}: DownloadButtonProps) {
  return (
    <button
      onClick={onDownload}
      disabled={isEncoding}
      className="h-9 px-4 bg-black text-white text-sm font-medium rounded-lg hover:bg-black/85 transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2 shrink-0"
    >
      {isEncoding ? (
        <>
          <div className="w-3.5 h-3.5 border-[1.5px] border-white/30 border-t-white rounded-full animate-spin" />
          <span>Encoding {progress}%</span>
        </>
      ) : (
        <>
          <svg
            className="w-3.5 h-3.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
            />
          </svg>
          <span>Download</span>
        </>
      )}
    </button>
  );
}
