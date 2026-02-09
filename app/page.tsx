"use client";

import Image from "next/image";
import { VideoUploader } from "@/components/VideoUploader";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col noise-overlay">
      {/* Accent bars */}
      <div className="accent-bar-left" />
      <div className="accent-bar-right" />

      {/* Navigation */}
      <nav className="relative z-10 w-full py-6 px-6">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
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
          </div>
          <a
            href="https://x.com/deifosv"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-medium text-black/40 hover:text-black/70 transition-colors tracking-wide uppercase"
          >
            @deifosv
          </a>
        </div>
      </nav>

      {/* Hero */}
      <main className="relative z-10 flex-1">
        <section className="pt-12 sm:pt-20 pb-16 sm:pb-24 px-6">
          <div className="max-w-5xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
              {/* Left side - copy + uploader */}
              <div>
                {/* Overline */}
                <div className="animate-fade-up">
                  <span className="inline-block text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--accent)] mb-6">
                    AI-Powered Video Analysis
                  </span>
                </div>

                {/* Headline */}
                <h1 className="animate-fade-up delay-100 text-[clamp(2rem,4vw,3rem)] font-bold leading-[1.08] tracking-tight text-black mb-5">
                  Premium Launch Video
                  <br />
                  <span className="text-[var(--accent)]">Breakdowns</span>
                </h1>

                {/* Subheadline */}
                <p className="animate-fade-up delay-200 text-base text-black/50 max-w-md leading-relaxed mb-8">
                  Upload a launch video and get an instant AI-generated timeline
                  with animated sections.
                </p>

                {/* Feature pills */}
                <div className="animate-fade-up delay-300 flex flex-wrap gap-2 mb-8">
                  {["90s max", "5 sections", "Downloadable"].map((feature) => (
                    <span
                      key={feature}
                      className="px-3.5 py-1.5 text-[11px] font-medium uppercase tracking-wider text-black/45 bg-white border border-black/[0.06] rounded-full"
                    >
                      {feature}
                    </span>
                  ))}
                </div>

                {/* Uploader */}
                <div className="animate-fade-up delay-400">
                  <VideoUploader />
                </div>

                <p className="animate-fade-in delay-500 mt-4 text-[11px] text-black/30 tracking-wide">
                  Videos are analyzed using AI and not stored permanently.
                </p>
              </div>

              {/* Right side - tilted showcase images */}
              <div className="animate-scale-in delay-300 relative hidden lg:block h-[520px]">
                {/* First image - tilted left */}
                <div
                  className="absolute top-0 -left-4 w-[85%] z-10 transition-transform duration-500 hover:z-20 hover:scale-[1.03]"
                  style={{ transform: "rotate(-4deg)" }}
                >
                  <div className="glass-frame">
                    <div className="glass-frame-inner">
                      <Image
                        src="/images/take1-compressed.webp"
                        alt="Launch video breakdown example - animated dots timeline"
                        width={700}
                        height={440}
                        className="w-full h-auto block"
                        priority
                      />
                    </div>
                  </div>
                </div>
                {/* Second image - tilted right, overlapping */}
                <div
                  className="absolute bottom-0 -right-4 w-[85%] z-[5] transition-transform duration-500 hover:z-20 hover:scale-[1.03]"
                  style={{ transform: "rotate(3deg)" }}
                >
                  <div className="glass-frame">
                    <div className="glass-frame-inner">
                      <Image
                        src="/images/take2-compressed.webp"
                        alt="Launch video breakdown example - colored pills timeline"
                        width={700}
                        height={440}
                        className="w-full h-auto block"
                        priority
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Showcase - mobile only */}
        <section className="px-6 pb-16 lg:hidden overflow-hidden">
          <div className="max-w-sm mx-auto relative h-[340px]">
            <div
              className="animate-scale-in delay-500 absolute top-0 left-0 w-[85%] z-10"
              style={{ transform: "rotate(-3deg)" }}
            >
              <div className="glass-frame">
                <div className="glass-frame-inner">
                  <Image
                    src="/images/take1-compressed.webp"
                    alt="Launch video breakdown example - animated dots timeline"
                    width={700}
                    height={440}
                    className="w-full h-auto block"
                  />
                </div>
              </div>
            </div>
            <div
              className="animate-scale-in delay-600 absolute bottom-0 right-0 w-[85%] z-[5]"
              style={{ transform: "rotate(2deg)" }}
            >
              <div className="glass-frame">
                <div className="glass-frame-inner">
                  <Image
                    src="/images/take2-compressed.webp"
                    alt="Launch video breakdown example - colored pills timeline"
                    width={700}
                    height={440}
                    className="w-full h-auto block"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Inspired by */}
        <section className="px-6 pb-20 sm:pb-28">
          <div className="max-w-2xl mx-auto">
            <div className="animate-fade-up text-center mb-8">
              <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-black/30">
                Inspired by{" "}
                <a
                  href="https://x.com/MarkKnd"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-black/50 hover:text-black/70 transition-colors"
                >
                  @MarkKnd
                </a>
                {" "}on X
              </span>
            </div>
            <div className="animate-scale-in delay-100 relative mx-auto">
              <div className="glass-frame">
                <div className="glass-frame-inner">
                  <Image
                    src="/images/x-post.webp"
                    alt="Original inspiration - Launch video breakdown by @MarkKnd for Contra"
                    width={800}
                    height={600}
                    className="w-full h-auto block"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="px-6 pb-20 sm:pb-28">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12 sm:mb-16">
              <span className="inline-block text-[11px] font-semibold uppercase tracking-[0.2em] text-black/30 mb-3">
                How it works
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-black">
                Three steps. That&apos;s it.
              </h2>
            </div>

            <div className="grid sm:grid-cols-3 gap-6 sm:gap-8">
              {[
                {
                  step: "01",
                  title: "Upload",
                  description:
                    "Drop your launch video or paste a URL. We accept MP4, WebM, MOV up to 90 seconds.",
                },
                {
                  step: "02",
                  title: "Analyze",
                  description:
                    "AI detects key sections: Intro, Features, Best Feature, Outcome, and Outro.",
                },
                {
                  step: "03",
                  title: "Download",
                  description:
                    "Preview with animated timeline overlay and download the final video with one click.",
                },
              ].map((item, i) => (
                <div
                  key={item.step}
                  className={`animate-fade-up ${
                    i === 0
                      ? "delay-100"
                      : i === 1
                        ? "delay-200"
                        : "delay-300"
                  } group relative bg-white rounded-2xl border border-black/[0.06] p-6 sm:p-8 hover:border-black/10 transition-colors`}
                >
                  <span className="text-[11px] font-bold uppercase tracking-widest text-[var(--accent)] mb-4 block font-mono">
                    {item.step}
                  </span>
                  <h3 className="text-lg font-semibold tracking-tight text-black mb-2">
                    {item.title}
                  </h3>
                  <p className="text-sm text-black/45 leading-relaxed">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Powered by */}
        <section className="px-6 pb-16 sm:pb-20">
          <div className="max-w-xl mx-auto text-center">
            <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-black/25 block mb-5">
              Powered by
            </span>
            <div className="flex items-center justify-center gap-8 text-black/25">
              <span className="text-sm font-medium tracking-wide">
                Gemini AI
              </span>
              <span className="text-black/10">|</span>
              <span className="text-sm font-medium tracking-wide">
                MediaBunny
              </span>
              <span className="text-black/10">|</span>
              <span className="text-sm font-medium tracking-wide">
                Next.js
              </span>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}
