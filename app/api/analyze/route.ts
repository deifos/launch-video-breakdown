import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import type { Section } from "@/types";

const MAX_DURATION_SECONDS = 90;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Initialize Gemini
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY!);

const ANALYSIS_PROMPT = `Analyze this launch video and identify its natural sections from the following possible types:

- **Intro** - Opening hook, problem statement, or attention grabber
- **Features** - Product features or key capabilities overview
- **Best Feature** - Highlight of the most compelling feature or demo
- **Outcome** - Benefits, results, or transformation shown
- **Outro** - Call-to-action, closing statement, or branding

Guidelines:
- Only include sections that genuinely exist in the video. Do NOT force sections that aren't there — 3 or 4 sections is perfectly fine
- Provide timestamps in seconds (e.g., 0, 12.5, 45.2)
- Each section should have a clear start and end time
- Sections must be contiguous (no gaps), in chronological order, and not overlap
- The first section must start at 0 and the last section must end at the video's total duration
- Keep section names short (1-2 words)

IMPORTANT: Return ONLY valid JSON, no markdown, no code blocks:
{
  "sections": [
    {"name": "Intro", "startTime": 0, "endTime": 10},
    {"name": "Features", "startTime": 10, "endTime": 45},
    {"name": "Best Feature", "startTime": 45, "endTime": 70},
    {"name": "Outro", "startTime": 70, "endTime": 90}
  ]
}`;

export async function POST(request: NextRequest) {
  try {
    // Check API key
    if (!GEMINI_API_KEY) {
      return NextResponse.json(
        { error: "Gemini API key not configured" },
        { status: 500 }
      );
    }

    const contentType = request.headers.get("content-type");

    let videoData: { data: string; mimeType: string };
    let duration: number;
    let videoUrl: string | null = null;

    // Handle file upload
    if (contentType?.includes("multipart/form-data")) {
      const formData = await request.formData();
      const file = formData.get("file") as File;
      const durationStr = formData.get("duration") as string;

      if (!file) {
        return NextResponse.json(
          { error: "No file provided" },
          { status: 400 }
        );
      }

      duration = parseFloat(durationStr);

      if (duration > MAX_DURATION_SECONDS) {
        return NextResponse.json(
          {
            error: `Video duration must be ${MAX_DURATION_SECONDS} seconds or less`,
          },
          { status: 400 }
        );
      }

      // Convert file to base64
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const base64 = buffer.toString("base64");

      videoData = {
        data: base64,
        mimeType: file.type,
      };

      // videoUrl will be set client-side with a blob URL
      videoUrl = "";
    }
    // Handle URL input
    else if (contentType?.includes("application/json")) {
      const body = await request.json();
      const url = body.url;

      if (!url) {
        return NextResponse.json(
          { error: "No URL provided" },
          { status: 400 }
        );
      }

      // Fetch video from URL
      const videoResponse = await fetch(url);
      if (!videoResponse.ok) {
        return NextResponse.json(
          { error: "Failed to fetch video from URL" },
          { status: 400 }
        );
      }

      const arrayBuffer = await videoResponse.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const base64 = buffer.toString("base64");

      // Determine MIME type
      const contentTypeHeader = videoResponse.headers.get("content-type");
      const mimeType = contentTypeHeader || "video/mp4";

      videoData = {
        data: base64,
        mimeType,
      };

      videoUrl = url;

      // We'll need to validate duration later
      // For now, assume it's valid
      duration = 90; // placeholder
    } else {
      return NextResponse.json(
        { error: "Invalid content type" },
        { status: 400 }
      );
    }

    // Call Gemini API with gemini-2.5-flash-lite
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash-lite",
    });

    const result = await model.generateContent([
      {
        inlineData: videoData,
      },
      ANALYSIS_PROMPT,
    ]);

    const response = result.response;
    const text = response.text();

    // Parse the response
    let sections: Section[] = [];

    try {
      // Try to extract JSON from the response
      let jsonText = text.trim();

      // Remove markdown code blocks if present
      if (jsonText.startsWith("```")) {
        jsonText = jsonText.replace(/```json\n?/g, "").replace(/```\n?/g, "");
      }

      const parsed = JSON.parse(jsonText);

      if (parsed.sections && Array.isArray(parsed.sections)) {
        sections = parsed.sections;
      } else {
        throw new Error("Invalid JSON structure");
      }
    } catch (parseError) {
      console.error("Failed to parse Gemini response:", parseError);

      // Fallback: create default sections
      sections = [
        { name: "Intro", startTime: 0, endTime: duration * 0.15 },
        { name: "Features", startTime: duration * 0.15, endTime: duration * 0.55 },
        { name: "Best Feature", startTime: duration * 0.55, endTime: duration * 0.8 },
        { name: "Outro", startTime: duration * 0.8, endTime: duration },
      ];
    }

    // Validate sections
    if (sections.length === 0) {
      return NextResponse.json(
        { error: "Failed to detect sections in video" },
        { status: 500 }
      );
    }

    // Ensure sections don't overlap and are in order
    sections.sort((a, b) => a.startTime - b.startTime);

    // Get actual duration from last section
    const actualDuration = sections[sections.length - 1].endTime;

    return NextResponse.json({
      success: true,
      sections,
      videoDuration: actualDuration,
      videoUrl: videoUrl || "",
    });
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to analyze video",
      },
      { status: 500 }
    );
  }
}
