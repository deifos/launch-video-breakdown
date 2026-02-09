export interface Section {
  name: string; // "Intro", "Features", "Best Feature", "Outcome", "Outro"
  startTime: number; // seconds
  endTime: number; // seconds
  confidence?: number; // optional, from Gemini
}

export interface AnalysisResult {
  success: boolean;
  sections: Section[];
  videoDuration: number;
  videoUrl: string; // Blob URL or remote URL
  videoFile?: File; // Original file if uploaded
  error?: string;
}
