# Launch Video Breakdown Tool - Implementation Plan

## Project Overview
A web tool that analyzes launch videos using Gemini AI to detect section timestamps (Intro, Features, Best Feature, Outcome, Outro) and renders an animated preview with section labels that move along a timeline. Users can download the final video with the breakdown overlay encoded using MediaBunny.

---

## Requirements Summary

### Functional Requirements
1. **Video Input**: Support both URL input (YouTube/direct links) and file upload (max 90 seconds)
2. **AI Analysis**: Use Gemini API to detect section timestamps
3. **Section Detection**: Prioritize 5 sections (Intro, Features, Best Feature, Outcome, Outro), but allow AI to suggest names when appropriate
4. **Preview**: Client-side video player with animated timeline overlay showing section progression
5. **Download**: Encode the video with the breakdown overlay using MediaBunny
6. **Authentication**: Anonymous access (no login required)
7. **Editing**: One-shot analysis only (no manual timestamp adjustments)

### Technical Requirements
- Next.js 16 (already scaffolded)
- Gemini API (`@google/generative-ai`) - env variables ready
- MediaBunny for video encoding
- Client-side video rendering
- Max video duration: 90 seconds
- Anonymous usage (no auth system)

---

## System Architecture

```
┌─────────────────┐
│  Landing Page   │
│  /              │
│ - Upload form   │
│ - URL input     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  API Route      │
│ /api/analyze    │
│ - Validate      │
│ - Call Gemini   │
│ - Return JSON   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Preview Page   │
│ /preview        │
│ - Video player  │
│ - Timeline UI   │
│ - Download btn  │
└─────────────────┘
```

---

## Data Flow

### 1. Video Upload/URL Flow
```
User Input (File/URL)
  ↓
Validate (duration ≤ 90s)
  ↓
Send to /api/analyze
  ↓
Convert to blob/buffer
  ↓
Send to Gemini API
  ↓
Parse section timestamps
  ↓
Return JSON to client
  ↓
Navigate to /preview?id=<session>
```

### 2. Analysis API Response Structure
```typescript
{
  success: boolean;
  sections: Array<{
    name: string;        // "Intro", "Features", etc.
    startTime: number;   // seconds
    endTime: number;     // seconds
    confidence?: number; // optional
  }>;
  videoDuration: number;
  videoUrl: string;      // Blob URL or uploaded file
  error?: string;
}
```

### 3. Download Flow (MediaBunny)
```
Click Download
  ↓
Create canvas element
  ↓
Load video element
  ↓
Initialize MediaBunny Output
  ↓
For each frame (30fps):
  - Draw video frame
  - Draw timeline overlay (sections + progress)
  - Add frame to CanvasSource
  ↓
Finalize MediaBunny output
  ↓
Get Blob from BufferTarget
  ↓
Trigger browser download
```

---

## Component Structure

### Page Components

#### 1. `/app/page.tsx` - Landing Page
- Hero section explaining the tool
- Video input methods:
  - File upload (drag-drop + button)
  - URL input field
- Validation before submission
- Loading state during analysis

#### 2. `/app/preview/page.tsx` - Preview Page
- Video player (HTML5 video element)
- Timeline overlay component (absolute positioned)
- Download button
- Back button to analyze another video

### UI Components

#### 3. `/components/VideoUploader.tsx`
- File drag-drop zone
- File picker button
- URL input field
- Validation:
  - Max file size check
  - Duration validation (≤90s)
  - Supported formats (mp4, webm, mov)

#### 4. `/components/TimelineOverlay.tsx`
- Fixed bottom position
- Section markers (pills)
- Progress indicator (moving pill)
- Animated transition as video plays
- Visual design matching mockup:
  ```
  [5%] [●—————————●—————●—————●—————●] [Intro]
       Intro  Features  Best  Outcome Outro
  ```

#### 5. `/components/DownloadButton.tsx`
- Trigger MediaBunny encoding
- Show progress during encoding
- Download final video

---

## API Routes

### `/app/api/analyze/route.ts`

**Purpose**: Analyze video with Gemini to detect section timestamps

**Input**:
```typescript
// FormData with:
{
  file?: File;           // or
  url?: string;
  duration: number;      // pre-validated on client
}
```

**Process**:
1. Validate input (duration ≤ 90s)
2. Convert video to format Gemini accepts:
   - For file: Convert to base64
   - For URL: Fetch and convert to base64
3. Construct Gemini prompt
4. Call Gemini API
5. Parse response for timestamps
6. Return structured JSON

**Gemini Prompt Template**:
```
Analyze this launch video (max 90 seconds) and identify the timestamps for the following sections:

1. **Intro** - Opening hook, problem statement, or attention grabber
2. **Features** - Product features or key capabilities overview
3. **Best Feature** - Highlight of the most compelling feature or demo
4. **Outcome** - Benefits, results, or transformation shown
5. **Outro** - Call-to-action, closing statement, or branding

Guidelines:
- Provide timestamps in seconds (e.g., 0, 12.5, 45.2)
- Use these section names as priority, but suggest alternative names if the video structure differs significantly
- Each section should have a clear start time
- Sections should be in chronological order
- If a section doesn't exist, you can skip it
- Ensure timestamps don't overlap

Return the response in this JSON format:
{
  "sections": [
    {"name": "Intro", "startTime": 0, "endTime": 10},
    {"name": "Features", "startTime": 10, "endTime": 35},
    ...
  ],
  "totalDuration": 90
}
```

**Output**:
```typescript
{
  success: boolean;
  sections: Array<{
    name: string;
    startTime: number;
    endTime: number;
  }>;
  videoDuration: number;
  videoUrl: string;
  error?: string;
}
```

---

## Timeline Overlay Animation

### Visual Design
Based on the mockup image:
- Bottom-aligned overlay (similar to YouTube progress bar)
- Section markers as dots/pills
- Labels for each section
- Active section highlighted with:
  - Larger pill
  - Bright color (orange in mockup)
  - Percentage indicator above
- Inactive sections in gray/muted

### Animation Behavior
- As video plays, active pill moves left-to-right
- Smooth transition using CSS transforms
- Progress percentage updates in real-time
- Pill position calculated based on: `(currentTime / totalDuration) * timelineWidth`

### Implementation Approach
```tsx
// Simplified pseudo-code
const TimelineOverlay = ({ sections, currentTime, duration }) => {
  const progress = (currentTime / duration) * 100;
  const activeSection = sections.find(s =>
    currentTime >= s.startTime && currentTime < s.endTime
  );

  return (
    <div className="timeline-container">
      {/* Progress bar background */}
      <div className="timeline-track">
        {sections.map(section => (
          <div
            key={section.name}
            className="section-marker"
            style={{ left: `${(section.startTime / duration) * 100}%` }}
          />
        ))}
      </div>

      {/* Moving active pill */}
      <div
        className="active-pill"
        style={{ left: `${progress}%` }}
      >
        <div className="percentage">{Math.floor(progress)}%</div>
        <div className="section-label">{activeSection?.name}</div>
      </div>

      {/* Static section labels */}
      <div className="section-labels">
        {sections.map(section => (
          <span
            key={section.name}
            style={{ left: `${(section.startTime / duration) * 100}%` }}
          >
            {section.name}
          </span>
        ))}
      </div>
    </div>
  );
};
```

---

## MediaBunny Video Encoding

### Download Process

Based on the sample project's `useMediaRecorder.ts`, here's how we'll encode the video:

```typescript
// Simplified implementation
async function downloadVideoWithOverlay(
  videoUrl: string,
  sections: Section[],
  duration: number
) {
  // 1. Load video
  const video = document.createElement('video');
  video.src = videoUrl;
  await video.load();

  // 2. Create canvas for compositing
  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext('2d')!;

  // 3. Initialize MediaBunny
  const output = new Output({
    format: new Mp4OutputFormat({ fastStart: "in-memory" }),
    target: new BufferTarget(),
  });

  const fps = 30;
  const videoSource = new CanvasSource(canvas, {
    codec: 'avc',
    bitrate: 15_000_000,
  });
  output.addVideoTrack(videoSource, { frameRate: fps });

  // 4. Add audio track
  const arrayBuffer = await (await fetch(videoUrl)).arrayBuffer();
  const audioContext = new AudioContext();
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
  const audioSource = new AudioBufferSource({ codec: 'aac', bitrate: 192_000 });
  output.addAudioTrack(audioSource);
  await output.start();
  await audioSource.add(audioBuffer);
  audioSource.close();

  // 5. Process each frame
  const totalFrames = Math.ceil(duration * fps);
  for (let i = 0; i < totalFrames; i++) {
    const currentTime = i / fps;
    video.currentTime = currentTime;
    await new Promise(resolve => video.onseeked = resolve);

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw video frame
    ctx.drawImage(video, 0, 0);

    // Draw timeline overlay
    drawTimelineOverlay(ctx, sections, currentTime, duration);

    // Add frame to MediaBunny
    await videoSource.add(currentTime, 1 / fps);
  }

  // 6. Finalize
  videoSource.close();
  await output.finalize();

  // 7. Download
  const buffer = (output.target as BufferTarget).buffer;
  const blob = new Blob([buffer], { type: 'video/mp4' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'launch-video-breakdown.mp4';
  a.click();
}

function drawTimelineOverlay(
  ctx: CanvasRenderingContext2D,
  sections: Section[],
  currentTime: number,
  duration: number
) {
  const canvasWidth = ctx.canvas.width;
  const canvasHeight = ctx.canvas.height;
  const overlayHeight = 100; // pixels from bottom
  const progress = (currentTime / duration);

  // Find active section
  const activeSection = sections.find(s =>
    currentTime >= s.startTime && currentTime < s.endTime
  );

  // Draw timeline background (translucent)
  ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
  ctx.fillRect(0, canvasHeight - overlayHeight, canvasWidth, overlayHeight);

  // Draw section markers
  sections.forEach(section => {
    const x = (section.startTime / duration) * canvasWidth;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.beginPath();
    ctx.arc(x, canvasHeight - 50, 6, 0, Math.PI * 2);
    ctx.fill();
  });

  // Draw progress line
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, canvasHeight - 50);
  ctx.lineTo(canvasWidth, canvasHeight - 50);
  ctx.stroke();

  // Draw active pill
  const pillX = progress * canvasWidth;
  const pillY = canvasHeight - 50;

  // Orange glow/pill
  ctx.fillStyle = '#FF6B35';
  ctx.shadowColor = '#FF6B35';
  ctx.shadowBlur = 20;
  ctx.beginPath();
  ctx.arc(pillX, pillY, 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  // Draw percentage above pill
  ctx.fillStyle = 'white';
  ctx.font = 'bold 16px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`${Math.floor(progress * 100)}%`, pillX, pillY - 30);

  // Draw active section label
  if (activeSection) {
    ctx.fillStyle = 'white';
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(activeSection.name, pillX, pillY + 30);
  }

  // Draw static section labels (smaller, gray)
  ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
  ctx.font = '14px sans-serif';
  sections.forEach(section => {
    const x = (section.startTime / duration) * canvasWidth;
    ctx.fillText(section.name, x, canvasHeight - 15);
  });
}
```

---

## File Structure

```
launch-video-breakdown/
├── app/
│   ├── page.tsx                          # Landing page (upload/URL input)
│   ├── preview/
│   │   └── page.tsx                      # Preview page with timeline overlay
│   ├── api/
│   │   └── analyze/
│   │       └── route.ts                  # Gemini API integration
│   ├── layout.tsx                        # Root layout
│   └── globals.css                       # Global styles
├── components/
│   ├── VideoUploader.tsx                 # File upload + URL input component
│   ├── TimelineOverlay.tsx               # Animated timeline overlay
│   ├── DownloadButton.tsx                # MediaBunny download trigger
│   └── ui/                               # shadcn/ui components
│       ├── button.tsx
│       ├── card.tsx
│       ├── input.tsx
│       ├── progress.tsx
│       ├── toast.tsx
│       └── alert.tsx
├── lib/
│   ├── gemini.ts                         # Gemini API utilities
│   ├── video-utils.ts                    # Video validation, duration check
│   └── mediabunny-encoder.ts             # MediaBunny encoding logic
├── types/
│   └── index.ts                          # TypeScript types
├── public/
│   └── sample-project-using-gemini/      # Reference (keep)
│   └── media-bunny-sample-project/       # Reference (keep)
├── .env                                  # Already configured with Gemini keys
├── package.json
└── notes/
    └── implementation-plan.md            # This file
```

---

## Dependencies to Add

Add to `package.json`:

```json
{
  "dependencies": {
    "@google/generative-ai": "^0.2.0",
    "mediabunny": "^1.24.1"
  }
}
```

### shadcn/ui Setup

Install shadcn/ui and add commonly used components:

```bash
npx shadcn@latest init
npx shadcn@latest add button
npx shadcn@latest add card
npx shadcn@latest add input
npx shadcn@latest add progress
npx shadcn@latest add toast
npx shadcn@latest add alert
```

Components we'll use:
- **Button**: Upload, download, retry actions
- **Card**: Video preview container, upload zone
- **Input**: URL input field
- **Progress**: Encoding progress bar
- **Toast**: Error/success notifications
- **Alert**: Validation messages

---

## Implementation Steps

### Phase 1: Basic Setup ✓ (Already Done)
- [x] Next.js project initialized
- [x] Gemini API keys configured
- [x] Sample projects in public folder

### Phase 2: Landing Page & Video Input
1. Create landing page UI (`/app/page.tsx`)
2. Build `VideoUploader` component
   - File upload with drag-drop
   - URL input field
   - Client-side validation (90s max, format check)
3. Add basic styling with Tailwind

### Phase 3: Gemini API Integration
1. Create `/app/api/analyze/route.ts`
2. Implement video-to-base64 conversion
3. Write Gemini prompt for section detection
4. Parse Gemini response to structured JSON
5. Handle errors (invalid video, API failures)

### Phase 4: Preview Page
1. Create `/app/preview/page.tsx`
2. Implement HTML5 video player
3. Build `TimelineOverlay` component
   - Section markers
   - Moving active pill
   - Progress percentage
   - Animation logic
4. Wire up video playback to timeline sync

### Phase 5: MediaBunny Download
1. Create `lib/mediabunny-encoder.ts`
2. Implement frame-by-frame processing
3. Draw timeline overlay on each frame
4. Add audio track handling
5. Build `DownloadButton` component with progress
6. Test encoding and download

### Phase 6: Polish & Testing
1. Add loading states
2. Error handling and user feedback
3. Responsive design
4. Test with various video lengths
5. Test with different video formats
6. Performance optimization

---

## TypeScript Types

```typescript
// types/index.ts

export interface Section {
  name: string;        // "Intro", "Features", "Best Feature", "Outcome", "Outro"
  startTime: number;   // seconds
  endTime: number;     // seconds
  confidence?: number; // optional, from Gemini
}

export interface AnalysisResult {
  success: boolean;
  sections: Section[];
  videoDuration: number;
  videoUrl: string;     // Blob URL or remote URL
  error?: string;
}

export interface VideoInputData {
  file?: File;
  url?: string;
  duration: number;
}

export interface EncodingProgress {
  currentFrame: number;
  totalFrames: number;
  percentage: number;
}
```

---

## Validation Rules

### Client-Side Validation
1. **File Upload**:
   - Max file size: 100MB (reasonable for 90s video)
   - Accepted formats: mp4, webm, mov, quicktime
   - Duration check using video element

2. **URL Input**:
   - Valid URL format
   - YouTube URLs: extract video ID, check duration via API (optional)
   - Direct video URLs: fetch HEAD, check Content-Length

### Server-Side Validation
1. Duration must be ≤ 90 seconds
2. Video must be valid format
3. File size must be reasonable (prevent DoS)

---

## Error Handling

### Common Error Scenarios
1. **Video too long**: "Video must be 90 seconds or less"
2. **Invalid format**: "Please upload a valid video file (MP4, WebM, MOV)"
3. **Gemini API error**: "Failed to analyze video. Please try again."
4. **URL fetch error**: "Could not load video from URL"
5. **Encoding error**: "Failed to encode video. Please try again."

### Error Display
- Toast notifications for transient errors
- Inline error messages for validation
- Retry buttons for API failures

---

## Performance Considerations

1. **Video Processing**:
   - Use 30fps for encoding (balance quality/speed)
   - Show progress bar during MediaBunny encoding
   - Process in chunks to avoid blocking UI

2. **Gemini API**:
   - Show loading state during analysis
   - Consider rate limiting for anonymous usage
   - Cache results (optional, using session storage)

3. **Client-Side Memory**:
   - Revoke object URLs after use
   - Clean up video elements
   - Limit concurrent processing

---

## Styling Guidelines

### Design System
- Use Tailwind CSS utility classes
- Color scheme:
  - Primary: Orange/Red (`#FF6B35` from mockup)
  - Background: Dark gradient or solid
  - Text: White/light gray
- Typography:
  - Sans-serif font (Inter, system-ui)
  - Clear hierarchy (headings, body, labels)

### Timeline Overlay Styling
```css
.timeline-container {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 100px;
  background: linear-gradient(transparent, rgba(0,0,0,0.8));
  padding: 20px;
}

.active-pill {
  position: absolute;
  transform: translateX(-50%);
  transition: left 0.1s linear;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.percentage {
  background: rgba(0, 0, 0, 0.8);
  color: white;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: bold;
  margin-bottom: 8px;
}

.section-label {
  background: #FF6B35;
  color: white;
  padding: 8px 24px;
  border-radius: 20px;
  font-weight: bold;
  box-shadow: 0 4px 12px rgba(255, 107, 53, 0.4);
}
```

---

## Future Enhancements (Out of Scope for MVP)

1. Manual timestamp editing
2. Export to multiple formats (WebM, etc.)
3. Custom section names
4. Shareable links
5. Video trimming before analysis
6. Multi-language support
7. Analytics/usage tracking
8. Social media sharing integrations

---

## Testing Checklist

### Functional Testing
- [ ] Upload video file (< 90s)
- [ ] Upload video file (> 90s) - should show error
- [ ] Input YouTube URL
- [ ] Input direct video URL
- [ ] Analyze video successfully
- [ ] Preview video with timeline overlay
- [ ] Timeline animation syncs with video
- [ ] Download video with overlay
- [ ] Downloaded video plays correctly
- [ ] Audio is preserved in downloaded video

### Edge Cases
- [ ] Very short video (< 10s)
- [ ] Video with no clear sections
- [ ] Video with unusual aspect ratio
- [ ] Large file upload
- [ ] Slow network conditions
- [ ] Gemini API timeout
- [ ] Invalid video format

### Browser Compatibility
- [ ] Chrome/Edge (Chromium)
- [ ] Firefox
- [ ] Safari
- [ ] Mobile browsers (iOS Safari, Chrome Mobile)

---

## Deployment Considerations

1. **Environment Variables**:
   - `GEMINI_API_KEY` already set
   - `GOOGLE_GENERATIVE_AI_API_KEY` already set

2. **Next.js Deployment**:
   - Vercel (recommended, zero-config)
   - Or any Node.js hosting

3. **Anonymous Usage**:
   - No database required
   - No authentication needed
   - Sessions stored in memory/localStorage

4. **Rate Limiting** (Optional):
   - Consider adding rate limiting for anonymous API calls
   - Use Vercel Edge Config or similar

---

## Success Metrics

For MVP launch:
1. Successfully analyze 90% of uploaded videos
2. Timeline overlay renders smoothly (no jank)
3. Download completes in reasonable time (< 2x video duration)
4. No crashes or major errors

---

## Notes

- Keep sample projects in `public/` folder as reference
- MediaBunny encoding happens client-side (no server processing)
- Anonymous usage means no persistent storage
- Focus on single-video workflow (no batch processing)
- Gemini prompt can be refined based on testing results

---

## Questions to Resolve During Implementation

1. Should we add a loading animation during Gemini analysis?
   - **Answer**: Yes, show spinner with "Analyzing video..." message

2. How to handle videos with unclear sections?
   - **Answer**: Gemini will do its best; show warning if low confidence

3. Should we allow retry if analysis fails?
   - **Answer**: Yes, add retry button

4. What video codec/settings for MediaBunny?
   - **Answer**: AVC (H.264), 15Mbps bitrate, 30fps

---

## Implementation Priority

**High Priority (MVP)**:
1. Video upload/URL input
2. Gemini analysis
3. Timeline overlay preview
4. MediaBunny download

**Medium Priority**:
- Error handling
- Loading states
- Responsive design

**Low Priority** (polish):
- Animations
- Advanced styling
- Tooltips/help text

---

End of Implementation Plan
