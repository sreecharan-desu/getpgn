/**
 * Homepage showcase & video — swap assets via env without code changes.
 * Place files in /public/showcase/ or set full URLs.
 */

export type HomepageShowcaseConfig = {
  videoUrl: string | null;
  videoPosterUrl: string | null;
  pgnOutputImageUrl: string;
};

function envOrDefault(key: string, fallback: string): string {
  const v = process.env[key]?.trim();
  return v || fallback;
}

export function getHomepageShowcaseConfig(): HomepageShowcaseConfig {
  const videoUrl = process.env.NEXT_PUBLIC_HOME_VIDEO_URL?.trim() || null;
  const videoPosterUrl = process.env.NEXT_PUBLIC_HOME_VIDEO_POSTER_URL?.trim() || null;

  return {
    videoUrl,
    videoPosterUrl,
    pgnOutputImageUrl: envOrDefault(
      'NEXT_PUBLIC_SHOWCASE_PGN_URL',
      '/showcase/pgn-output.png',
    ),
  };
}
