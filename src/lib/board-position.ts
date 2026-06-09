export const START_FEN =
  "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

export interface BoardPly {
  fen: string | null;
  status: "valid" | "ambiguous" | "illegal" | "missing";
  uci: string | null;
  san: string | null;
}

export interface BoardTurn {
  white: BoardPly;
  black: BoardPly;
}

function getPlyAt(turns: BoardTurn[], index: number): BoardPly | null {
  const turnIdx = Math.floor(index / 2);
  const turn = turns[turnIdx];
  if (!turn) return null;
  return index % 2 === 0 ? turn.white : turn.black;
}

/** Board FEN for the selected ply. Illegal plies show the position before the faulty move. */
export function getBoardFenForPly(
  turns: BoardTurn[],
  currentPlyIndex: number,
  startFen = START_FEN,
): string {
  if (currentPlyIndex === 0) return startFen;

  const selectedPly = getPlyAt(turns, currentPlyIndex - 1);

  if (selectedPly?.status === "illegal") {
    for (let i = currentPlyIndex - 2; i >= 0; i--) {
      const fen = getPlyAt(turns, i)?.fen;
      if (fen) return fen;
    }
    return startFen;
  }

  if (selectedPly?.fen) return selectedPly.fen;

  for (let i = currentPlyIndex - 2; i >= 0; i--) {
    const fen = getPlyAt(turns, i)?.fen;
    if (fen) return fen;
  }

  return startFen;
}

export function getLastMoveForPly(
  turns: BoardTurn[],
  currentPlyIndex: number,
): [string, string] | null {
  if (currentPlyIndex === 0 || turns.length === 0) return null;

  const selected = getPlyAt(turns, currentPlyIndex - 1);

  if (selected?.status === "illegal") {
    for (let i = currentPlyIndex - 2; i >= 0; i--) {
      const ply = getPlyAt(turns, i);
      if (ply?.uci && ply.status !== "illegal" && ply.uci.length >= 4) {
        return [ply.uci.slice(0, 2), ply.uci.slice(2, 4)];
      }
    }
    return null;
  }

  if (!selected?.uci || selected.uci.length < 4) return null;
  return [selected.uci.slice(0, 2), selected.uci.slice(2, 4)];
}

/** 1-based ply index to update when the user drags a piece on the board. */
export function getBoardEditPlyIndex(
  turns: BoardTurn[],
  currentPlyIndex: number,
): number {
  if (currentPlyIndex === 0) return 1;

  const selected = getPlyAt(turns, currentPlyIndex - 1);
  if (
    selected &&
    (selected.status === "illegal" ||
      selected.status === "ambiguous" ||
      selected.status === "missing")
  ) {
    return currentPlyIndex;
  }

  return currentPlyIndex + 1;
}

/** Ply whose SAN drives check/checkmate highlight for the displayed position. */
export function getCheckPlyForDisplay(
  turns: BoardTurn[],
  currentPlyIndex: number,
): { ply: BoardPly; player: "white" | "black" } | null {
  if (currentPlyIndex === 0 || turns.length === 0) return null;

  let plyIndex = currentPlyIndex - 1;
  const selected = getPlyAt(turns, plyIndex);

  if (selected?.status === "illegal") {
    if (currentPlyIndex <= 1) return null;
    plyIndex = currentPlyIndex - 2;
  }

  const ply = getPlyAt(turns, plyIndex);
  if (!ply?.san) return null;

  return {
    ply,
    player: plyIndex % 2 === 0 ? "white" : "black",
  };
}
