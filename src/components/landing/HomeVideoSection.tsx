"use client";

import { Play } from "lucide-react";
import { getHomepageShowcaseConfig } from "@/lib/homepageConfig";

export function HomeVideoSection() {
  const { videoUrl, videoPosterUrl } = getHomepageShowcaseConfig();

  return (
    <section id="demo" className="border-b border-line bg-surface/30">
      <div className="mx-auto w-full max-w-6xl px-5 py-16 sm:px-8 lg:py-20">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-[clamp(1.5rem,2.5vw,2.25rem)] font-extrabold tracking-[-0.03em] text-ink">
            See GetPGN in action
          </h2>
          <p className="mt-3 text-[15px] leading-relaxed text-muted">
            Watch how a handwritten scoresheet becomes a validated, shareable PGN in minutes.
          </p>
        </div>

        <div className="mx-auto mt-10 max-w-4xl overflow-hidden rounded-2xl border border-line bg-paper">
          {videoUrl ? (
            <div className="relative aspect-video w-full bg-ink">
              <video
                className="h-full w-full object-cover"
                controls
                playsInline
                poster={videoPosterUrl ?? undefined}
                preload="metadata"
              >
                <source src={videoUrl} />
                Your browser does not support embedded video.
              </video>
            </div>
          ) : (
            <div className="relative flex aspect-video w-full flex-col items-center justify-center gap-4 bg-gradient-to-br from-surface-2 to-paper px-6 text-center">
              <div className="grid h-16 w-16 place-items-center rounded-full border border-line bg-paper">
                <Play className="h-7 w-7 text-muted" />
              </div>
              <div>
                <p className="text-[15px] font-semibold text-ink">Product demo coming soon</p>
                <p className="mt-1 max-w-md text-[13px] leading-relaxed text-muted">
                  Set <code className="rounded bg-surface-2 px-1.5 py-0.5 font-mono text-[11px]">NEXT_PUBLIC_HOME_VIDEO_URL</code> to embed your final demo video.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
