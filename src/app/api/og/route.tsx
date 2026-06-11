import {
  buildShareOgTitle,
  displaySharePlayer,
  formatSharePublicDate,
  getPublicShareBySlug,
} from "@/lib/shareGamePublic";
import { getPublicLibraryBySlug } from "@/lib/libraryPublic";
import { getOgBoardSquares } from "@/lib/ogChessBoard";
import { createOgImageResponse } from "@/lib/og/image";

export const runtime = "nodejs";

function clip(value: string | null, max: number, fallback: string): string {
  const text = (value ?? fallback).trim();
  return text.length <= max ? text : `${text.slice(0, max - 1)}…`;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const variant = searchParams.get("variant") ?? "default";

  if (variant === "share") {
    const slug = searchParams.get("slug");
    if (!slug) {
      return createOgImageResponse({
        eyebrow: "Shared replay",
        title: "Game not found",
        subtitle: "This chess replay is no longer available.",
      });
    }

    const game = await getPublicShareBySlug(slug);
    if (!game) {
      return createOgImageResponse({
        eyebrow: "Shared replay",
        title: "Game not found",
        subtitle: "This link is unavailable or has been turned off.",
      });
    }

    const title = buildShareOgTitle(game);
    const white = displaySharePlayer(game.whitePlayer, "White");
    const black = displaySharePlayer(game.blackPlayer, "Black");
    const moveLabel =
      game.moveCount === 1 ? "1 move" : `${game.moveCount} moves`;
    const date = formatSharePublicDate(game.createdAt);

    return createOgImageResponse({
      eyebrow: "Validated chess replay",
      title,
      subtitle: `${white} vs ${black}`,
      footerNote: [moveLabel, date].filter(Boolean).join(" · "),
      boardSquares: getOgBoardSquares(game.movesJson),
    });
  }

  if (variant === "library") {
    const slug = searchParams.get("slug");
    if (!slug) {
      return createOgImageResponse({
        eyebrow: "Organizer library",
        title: "Library not found",
        subtitle: "This shared library is no longer available.",
      });
    }

    const library = await getPublicLibraryBySlug(slug);
    if (!library) {
      return createOgImageResponse({
        eyebrow: "Organizer library",
        title: "Library not found",
        subtitle: "This library is unavailable or has been turned off.",
      });
    }

    const gamesLabel =
      library.gameCount === 1
        ? "1 shared game"
        : `${library.gameCount} shared games`;

    return createOgImageResponse({
      eyebrow: "Organizer library",
      title: library.title,
      subtitle: `@${library.organizerUsername}`,
      footerNote: gamesLabel,
    });
  }

  const eyebrow = searchParams.get("eyebrow");
  const subtitle = searchParams.get("subtitle");

  return createOgImageResponse({
    eyebrow: eyebrow ? clip(eyebrow, 60, "") : undefined,
    title: clip(searchParams.get("title"), 120, "GetPGN"),
    subtitle: subtitle ? clip(subtitle, 180, "") : undefined,
  });
}
