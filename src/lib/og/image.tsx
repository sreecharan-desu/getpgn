import type { ReactNode } from "react";
import { ImageResponse } from "next/og";
import type { OgBoardSquare } from "@/lib/ogChessBoard";
import { OG_SIZE } from "@/lib/og/constants";
import { loadInterBold } from "@/lib/og/font";

export interface OgImageContent {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  footerNote?: string;
  boardSquares?: OgBoardSquare[];
}

function OgFooter() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginTop: "auto",
        paddingTop: 36,
        borderTop: "1px solid #2a2a2a",
      }}
    >
      <div
        style={{
          fontSize: 26,
          fontWeight: 700,
          letterSpacing: "-0.02em",
          color: "#f5f5f5",
        }}
      >
        GetPGN
      </div>
      <div style={{ fontSize: 20, fontWeight: 600, color: "#737373" }}>
        getpgn.in
      </div>
    </div>
  );
}

function OgBoard({ squares, squareSize }: { squares: OgBoardSquare[]; squareSize: number }) {
  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        width: squareSize * 8,
        height: squareSize * 8,
        borderRadius: 14,
        overflow: "hidden",
        border: "2px solid #333333",
        boxShadow: "0 20px 50px rgba(0,0,0,0.35)",
        flexShrink: 0,
      }}
    >
      {squares.map((sq, i) => (
        <div
          key={i}
          style={{
            width: squareSize,
            height: squareSize,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: sq.isLight ? "#f4f4f4" : "#c9c9c9",
            fontSize: Math.round(squareSize * 0.62),
            lineHeight: 1,
            color: sq.isWhitePiece ? "#ffffff" : "#0a0a0a",
          }}
        >
          {sq.glyph}
        </div>
      ))}
    </div>
  );
}

function OgTextColumn({
  eyebrow,
  title,
  subtitle,
  footerNote,
  compact,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  footerNote?: string;
  compact?: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        flex: 1,
        minWidth: 0,
        gap: compact ? 14 : 18,
      }}
    >
      {eyebrow ? (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            fontSize: 18,
            fontWeight: 700,
            color: "#86efac",
            letterSpacing: "0.04em",
            textTransform: "uppercase",
          }}
        >
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: 999,
              background: "#22c55e",
            }}
          />
          {eyebrow}
        </div>
      ) : null}

      <div
        style={{
          fontSize: compact ? 48 : 58,
          fontWeight: 700,
          lineHeight: 1.06,
          letterSpacing: "-0.03em",
          color: "#fafafa",
          maxWidth: compact ? 620 : 760,
        }}
      >
        {title}
      </div>

      {subtitle ? (
        <div
          style={{
            fontSize: compact ? 24 : 28,
            fontWeight: 600,
            lineHeight: 1.35,
            color: "#d4d4d4",
            maxWidth: compact ? 620 : 760,
          }}
        >
          {subtitle}
        </div>
      ) : null}

      {footerNote ? (
        <div style={{ fontSize: 20, fontWeight: 600, color: "#a3a3a3" }}>
          {footerNote}
        </div>
      ) : null}
    </div>
  );
}

function OgShell({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: "linear-gradient(145deg, #090909 0%, #141414 55%, #0a0a0a 100%)",
        color: "#f5f5f5",
        fontFamily: "Inter",
        padding: "52px 56px",
        position: "relative",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 4,
          background: "linear-gradient(90deg, #22c55e 0%, #86efac 100%)",
        }}
      />
      <div
        style={{
          position: "absolute",
          right: 56,
          top: "50%",
          transform: "translateY(-50%)",
          width: 200,
          height: 200,
          borderRadius: 28,
          border: "3px solid #ffffff",
          opacity: 0.05,
        }}
      />
      <div
        style={{
          position: "absolute",
          right: 108,
          top: "50%",
          transform: "translateY(-50%)",
          fontSize: 120,
          fontWeight: 700,
          lineHeight: 1,
          color: "#ffffff",
          opacity: 0.06,
          letterSpacing: "-0.06em",
        }}
      >
        GP
      </div>
      {children}
    </div>
  );
}

export async function createOgImageResponse(
  content: OgImageContent,
): Promise<ImageResponse> {
  const interBold = await loadInterBold();
  const hasBoard = Boolean(content.boardSquares?.length);
  const squareSize = hasBoard ? 46 : 0;

  return new ImageResponse(
    (
      <OgShell>
        {hasBoard ? (
          <div
            style={{
              display: "flex",
              width: "100%",
              height: "100%",
              alignItems: "center",
              gap: 48,
            }}
          >
            <OgBoard squares={content.boardSquares!} squareSize={squareSize} />
            <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
              <OgTextColumn
                eyebrow={content.eyebrow}
                title={content.title}
                subtitle={content.subtitle}
                footerNote={content.footerNote}
                compact
              />
              <OgFooter />
            </div>
          </div>
        ) : (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              width: "100%",
              height: "100%",
              justifyContent: "center",
            }}
          >
            <OgTextColumn
              eyebrow={content.eyebrow}
              title={content.title}
              subtitle={content.subtitle}
              footerNote={content.footerNote}
            />
            <OgFooter />
          </div>
        )}
      </OgShell>
    ),
    {
      ...OG_SIZE,
      fonts: [{ name: "Inter", data: interBold, weight: 700, style: "normal" }],
    },
  );
}
