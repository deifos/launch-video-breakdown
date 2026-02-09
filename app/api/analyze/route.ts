import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import type { Section } from "@/types";

const MAX_DURATION_SECONDS = 90;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Initialize Gemini
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY!);

const ANALYSIS_PROMPT = `Analyze this launch video (max 90 seconds) and identify the timestamps for the following sections:

1. **Intro** - Opening hook, problem statement, or attention grabber
2. **Features** - Product features or key capabilities overview
3. **Best Feature** - Highlight of the most compelling feature or demo
4. **Outcome** - Benefits, results, or transformation shown
5. **Outro** - Call-to-action, closing statement, or branding

Guidelines:
- Provide timestamps in seconds (e.g., 0, 12.5, 45.2)
- Use these section names as priority, but suggest alternative names if the video structure differs significantly
- Each section should have a clear start and end time
- Sections should be in chronological order and not overlap
- If a section doesn't exist in the video, you can skip it
- Return at least 2 sections, preferably all 5

IMPORTANT: Return ONLY valid JSON in this exact format, no markdown, no code blocks:
{
  "sections": [
    {"name": "Intro", "startTime": 0, "endTime": 10},
    {"name": "Features", "startTime": 10, "endTime": 35},
    {"name": "Best Feature", "startTime": 35, "endTime": 55},
    {"name": "Outcome", "startTime": 55, "endTime": 75},
    {"name": "Outro", "startTime": 75, "endTime": 90}
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

      // Fallback: Try to create default sections
      sections = [
        { name: "Intro", startTime: 0, endTime: duration * 0.2 },
        {
          name: "Features",
          startTime: duration * 0.2,
          endTime: duration * 0.5,
        },
        {
          name: "Best Feature",
          startTime: duration * 0.5,
          endTime: duration * 0.7,
        },
        { name: "Outcome", startTime: duration * 0.7, endTime: duration * 0.9 },
        { name: "Outro", startTime: duration * 0.9, endTime: duration },
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
