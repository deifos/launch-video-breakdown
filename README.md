# Launch Video Breakdown

AI-powered tool that analyzes launch videos and generates animated timeline overlays showing the structure of your video.

Upload a video (up to 90 seconds), and the app uses Google Gemini to detect key sections — Intro, Features, Best Feature, Outcome, and Outro — then renders an interactive timeline you can preview and download as a new video with the overlay baked in.

## Features

- **AI Video Analysis** — Gemini 2.5 Flash Lite detects section boundaries automatically
- **Two Timeline Styles** — Toggle between an animated dots timeline with gooey effects and a colored pills layout
- **Client-Side Video Encoding** — Downloads a new MP4 with the timeline overlay rendered frame-by-frame using MediaBunny
- **Real-Time Preview** — Timeline syncs with video playback at 60fps via requestAnimationFrame

## Tech Stack

- **Framework:** Next.js 16 (App Router), React 19, TypeScript
- **AI:** Google Gemini API (`@google/generative-ai`)
- **Video Encoding:** MediaBunny (client-side canvas-based encoding)
- **Animation:** Framer Motion, SVG goo filters
- **Styling:** Tailwind CSS v4, shadcn/ui
- **Notifications:** Sonner

## Getting Started

### Prerequisites

- Node.js 18+
- A Google Gemini API key ([get one here](https://aistudio.google.com/apikey))

### Setup

```bash
# Clone the repo
git clone https://github.com/your-username/launch-video-breakdown.git
cd launch-video-breakdown

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Then edit .env and add your Gemini API key

# Start the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to use the app.

### Environment Variables

| Variable | Description |
|---|---|
| `GEMINI_API_KEY` | Your Google Gemini API key |

## Project Structure

```
app/
  page.tsx              # Home page with video upload
  preview/page.tsx      # Video preview with timeline overlay
  api/analyze/route.ts  # Gemini AI analysis endpoint
  layout.tsx            # Root layout with fonts and toaster
  globals.css           # Global styles, animations, CSS variables

components/
  VideoUploader.tsx     # File upload with validation (format, size, duration)
  TimelineOverlay.tsx   # Wrapper with toggle between timeline variants
  TimelineDots.tsx      # Animated dots timeline with gooey SVG filter
  TimelineColoredPills.tsx  # Colored proportional pills timeline
  DownloadButton.tsx    # Download button with encoding progress
  Footer.tsx            # Site footer
  ui/                   # shadcn/ui primitives (button, alert, sonner)

lib/
  mediabunny-encoder.ts # Canvas-based video encoder with overlay rendering
  utils.ts              # Tailwind class merge utility

types/
  index.ts              # TypeScript interfaces (Section, AnalysisResult)
```

## How It Works

1. **Upload** — User uploads a video file (MP4, WebM, MOV, AVI; max 100MB, max 90s)
2. **Analyze** — Video is sent to the Gemini API which returns timestamped sections as JSON
3. **Preview** — The app renders an interactive timeline synced to video playback
4. **Download** — MediaBunny encodes a new MP4 frame-by-frame with the timeline overlay drawn on canvas

## Scripts

```bash
npm run dev     # Start development server
npm run build   # Production build
npm run start   # Start production server
npm run lint    # Run ESLint
```

## Deploy

Deploy to [Vercel](https://vercel.com) with one click. Set `GEMINI_API_KEY` in your project's environment variables.
