"use client";

import React, { useState, useEffect, useLayoutEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Chess } from "chess.js";
import { toast } from "sonner";
import { ImageUpload } from "@/components/ImageUpload";
import {
  ChessBoard,
  BoardThemePicker,
  useBoardTheme,
} from "@/components/ChessBoard";
import { MoveList, Turn } from "@/components/MoveList";
import { ExportPanel } from "@/components/ExportPanel";
import { MobileShareBar } from "@/components/MobileShareBar";
import {
  START_FEN,
  getBoardFenForPly,
  getLastMoveForPly,
  getCheckPlyForDisplay,
  getBoardEditPlyIndex,
} from "@/lib/board-position";
import { Logo } from "@/components/ui/Logo";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { FeedbackModal } from "@/components/ui/FeedbackModal";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { UserMenu } from "@/components/ui/UserMenu";
import { LegalLink, LegalTrustLinks } from "@/components/legal/PolicyFooter";
import { LEGAL } from "@/lib/legal";
import BoardThumbnail from "@/components/ui/BoardThumbnail";
import {
  friendlyError,
  readApiErrorOrLogout,
  forceLogoutIfUserNotFound,
} from "@/lib/friendlyError";
import { getTimeGreeting } from "@/lib/greeting";
import { forceLogout } from "@/lib/clientStorage";
import { Spinner } from "@/components/ui/Spinner";
import { IconInput } from "@/components/ui/IconInput";
import { BillingRowSkeleton } from "@/components/ui/Skeleton";
import {
  SidebarRestoreSkeleton,
  WorkspaceRestoreSkeleton,
} from "@/components/dashboard/WorkspaceSkeletons";
import {
  ScanUsageMeter,
  FreeVsProTable,
  FREE_SCAN_LIMIT,
} from "@/components/dashboard/FreePlanUI";
import { PricingModal } from "@/components/dashboard/PricingModal";
import { ExtractingOverlay } from "@/components/dashboard/ExtractingOverlay";
import { SoundToggle } from "@/components/ui/SoundToggle";
import { useChessPlySounds } from "@/hooks/useChessPlySounds";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { SiLichess, SiChessdotcom } from "react-icons/si";
import {
  Sparkles,
  AlertCircle,
  HelpCircle,
  BookOpen,
  Image as ImageIcon,
  History,
  Lock,
  LogOut,
  Plus,
  Check,
  Copy,
  Trash2,
  X,
  Share2,
  Infinity as InfinityIcon,
  ShieldCheck,
  CreditCard,
  Receipt,
  CalendarDays,
  ArrowUpRight,
  Star,
  Upload,
  ArrowLeft,
  ArrowRight,
  User,
  KeyRound,
  RotateCw,
  MessageSquare,
  LayoutGrid,
  Download,
  Search,
} from "lucide-react";

import { RazorpayLogo } from "@/components/ui/RazorpayLogo";
import {
  consumePendingUpgrade,
  openRazorpayCheckout,
} from "@/lib/razorpayCheckout";
import {
  formatProScanAllowance,
  getScanPeriodKey,
  getScanUsage,
} from "@/lib/scanLimits";
import { filterSavedGames } from "@/lib/savedGameSearch";

/** Convert pasted PGN or movetext into the raw {moveNumber, white, black} shape the validator expects. */
function pgnToRawMoves(
  text: string,
): { moveNumber: number; white: string; black: string }[] {
  if (!text) return [];
  let s = text;
  s = s.replace(/\[[^\]]*\]/g, " "); // tag pairs / headers
  s = s.replace(/\{[^}]*\}/g, " "); // brace comments
  s = s.replace(/;[^\n]*/g, " "); // line comments
  s = s.replace(/\$\d+/g, " "); // NAG annotations
  let prev: string; // recursively strip variations
  do {
    prev = s;
    s = s.replace(/\([^()]*\)/g, " ");
  } while (s !== prev);
  s = s.replace(/\b(?:1-0|0-1|1\/2-1\/2)\b|\*/g, " "); // game results
  s = s.replace(/\d+\.(\.\.)?/g, " "); // move numbers "12." / "12..."
  const tokens = s
    .split(/\s+/)
    .map((t) => t.trim())
    .filter(Boolean);
  return originalsToRaw(tokens);
}

/** Flatten turns into an ordered list of raw move strings (white, black, white, …). */
function turnsToOriginals(
  ts: { white: { original: string }; black: { original: string } }[],
): string[] {
  const a: string[] = [];
  ts.forEach((t) => {
    a.push(t.white?.original ?? "");
    a.push(t.black?.original ?? "");
  });
  return a;
}

/** Re-pair an ordered list of move strings back into {moveNumber, white, black} turns. */
function originalsToRaw(
  orig: string[],
): { moveNumber: number; white: string; black: string }[] {
  const raw: { moveNumber: number; white: string; black: string }[] = [];
  for (let i = 0; i < orig.length; i += 2) {
    raw.push({
      moveNumber: raw.length + 1,
      white: orig[i] ?? "",
      black: orig[i + 1] ?? "",
    });
  }
  return raw;
}

interface SavedGame {
  id: string;
  title: string;
  pgn?: string;
  movesJson?: string;
  createdAt: string;
  publicLink?: {
    slug: string;
    enabled: boolean;
  } | null;
}

interface User {
  id: string;
  username: string;
  plan: "FREE" | "PAID";
  scanCount: number;
  monthlyScanCount: number;
  monthlyScanMonth: string | null;
  subscriptionId?: string | null;
  subscriptionPlan?: string | null;
  subscriptionStatus?: string | null;
  subscriptionStart?: string | null;
  subscriptionEnd?: string | null;
  paymentProvider?: string | null;
}

interface DashboardClientProps {
  initialUser: User;
  initialGames: SavedGame[];
  isDevMode: boolean;
}

/** True only for verified Razorpay subscriptions — hides dev/simulated IDs. */
function isRealRazorpaySubscription(user: User): boolean {
  return !!(
    user.paymentProvider === "razorpay" &&
    user.subscriptionId &&
    !/simulated|_dev_/i.test(user.subscriptionId)
  );
}

const GAME_DATE_MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];
function formatGameDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${GAME_DATE_MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`;
}

function computeMoveStats(turns: Turn[]) {
  let valid = 0;
  let flagged = 0;
  let totalPlies = 0;
  for (const turn of turns) {
    for (const ply of [turn.white, turn.black]) {
      totalPlies++;
      if (ply.status === "valid") valid++;
      else if (ply.status === "ambiguous" || ply.status === "illegal")
        flagged++;
    }
  }
  return { turnCount: turns.length, totalPlies, valid, flagged };
}

/** Shared horizontal rhythm — keeps dashboard readable on wide screens. */
const DASHBOARD_SHELL = "mx-auto w-full max-w-6xl";
/** Abort extraction if the API does not respond (prevents infinite overlay). */
const EXTRACT_TIMEOUT_MS = 180_000;
/** Narrow centered column for upload focus. */
const UPLOAD_FOCUS = "mx-auto w-full max-w-[440px]";
const uploadShell = (wide?: boolean) => (wide ? "w-full" : UPLOAD_FOCUS);

export default function DashboardClient({
  initialUser,
  initialGames,
  isDevMode,
}: DashboardClientProps) {
  const router = useRouter();
  const [user, setUser] = useState<User>(initialUser);
  const [games, setGames] = useState<SavedGame[]>(initialGames);
  const [activeTab, setActiveTab] = useState<"dashboard" | "account">(
    "dashboard",
  );
  const [showPricingModal, setShowPricingModal] = useState<boolean>(false);
  const [pricingInitialInterval, setPricingInitialInterval] = useState<
    "monthly" | "yearly"
  >("yearly");
  const [showCancelConfirm, setShowCancelConfirm] = useState<boolean>(false);
  const [pendingDelete, setPendingDelete] = useState<SavedGame | null>(null);
  const [deleting, setDeleting] = useState<boolean>(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState<boolean>(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState<boolean>(false);
  const [gameSearchQuery, setGameSearchQuery] = useState("");
  const reduceMotion = useReducedMotion();

  const isPro =
    user.plan === "PAID" ||
    user.subscriptionStatus === "active" ||
    (user.subscriptionStatus === "cancelled" &&
      user.subscriptionEnd &&
      new Date(user.subscriptionEnd) > new Date());

  const scanUsage = getScanUsage(user);
  const scansExhausted = scanUsage.exhausted;
  const filteredGames = useMemo(
    () => filterSavedGames(games, gameSearchQuery),
    [games, gameSearchQuery],
  );

  // App view state
  const [appState, setAppState] = useState<"upload" | "extracting" | "review">(
    "upload",
  );
  const [pgnText, setPgnText] = useState("");
  const [validationSessionToken, setValidationSessionToken] = useState<
    string | null
  >(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  // Data states for current active game
  const [turns, setTurns] = useState<Turn[]>([]);
  const [pgn, setPgn] = useState<string>("");
  const [gameIsValid, setGameIsValid] = useState<boolean>(false);
  const [currentPlyIndex, setCurrentPlyIndex] = useState<number>(0);
  const [boardMoveLoading, setBoardMoveLoading] = useState(false);
  useChessPlySounds(
    turns,
    currentPlyIndex,
    appState === "review" && turns.length > 0,
  );
  const [activeGameId, setActiveGameId] = useState<string | null>(null);
  const [activeGameSharedSlug, setActiveGameSharedSlug] = useState<
    string | null
  >(null);
  const [pendingEditPly, setPendingEditPly] = useState<number | null>(null);

  // Account settings (username / password) forms
  const [usernameInput, setUsernameInput] = useState<string>(
    initialUser.username,
  );
  const [savingUsername, setSavingUsername] = useState<boolean>(false);
  const [currentPassword, setCurrentPassword] = useState<string>("");
  const [newPassword, setNewPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  const [savingPassword, setSavingPassword] = useState<boolean>(false);

  // Loading & error states
  const [error, setError] = useState<string | null>(null);
  const [billingLoading, setBillingLoading] = useState(false);
  const [downloadingInvoice, setDownloadingInvoice] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [chessPieceIndex, setChessPieceIndex] = useState(0);

  // Custom board states
  const [boardOrientation, setBoardOrientation] = useState<"white" | "black">(
    "white",
  );
  const [boardTheme, setBoardTheme] = useBoardTheme(!!isPro);

  useEffect(() => {
    void fetch("/api/auth/user").then(async (res) => {
      await forceLogoutIfUserNotFound(res);
    });
  }, []);

  // ─── Workspace session persistence (survive a page refresh) ──────────────
  // Snapshot the in-progress review workspace to localStorage so a refresh
  // resumes exactly where the user left off, including unsaved move edits.
  // Blob/object image URLs are intentionally skipped (they don't survive a
  // reload); only normal http(s) scoresheet URLs are persisted.

  // Guards the SAVE effect: it must NOT run until the RESTORE effect has executed.
  // Otherwise the save effect (which fires on every mount) can overwrite the saved
  // snapshot with the empty initial state before restore reads it — which would drop
  // the in-progress game on refresh and bounce the user back to the upload screen.
  const hasRestoredRef = useRef(false);
  const boardCardRef = useRef<HTMLDivElement>(null);
  const [boardCardHeight, setBoardCardHeight] = useState<number | null>(null);
  // While false, show a workspace skeleton instead of the upload screen so a
  // refresh on a saved game never flashes "Digitize your chess games" first.
  const [workspaceReady, setWorkspaceReady] = useState(false);

  // Restore on mount — useLayoutEffect runs before paint so the user never
  // sees upload flash when a valid review snapshot exists in localStorage.
  useLayoutEffect(() => {
    try {
      const raw = localStorage.getItem(`getpgn:workspace:${user.id}`);
      if (!raw) return;
      const snap = JSON.parse(raw);
      if (!snap) return;
      // Stale mid-extraction snapshots cannot be resumed after reload.
      if (snap.appState === "extracting") {
        localStorage.removeItem(`getpgn:workspace:${user.id}`);
        return;
      }
      if (
        snap.appState !== "review" ||
        !Array.isArray(snap.turns) ||
        snap.turns.length === 0
      )
        return;
      setTurns(snap.turns);
      setPgn(typeof snap.pgn === "string" ? snap.pgn : "");
      setGameIsValid(!!snap.gameIsValid);
      setCurrentPlyIndex(0);
      setActiveGameId(
        typeof snap.activeGameId === "string" ? snap.activeGameId : null,
      );
      setActiveGameSharedSlug(
        typeof snap.activeGameSharedSlug === "string"
          ? snap.activeGameSharedSlug
          : null,
      );
      if (typeof snap.pgnText === "string") setPgnText(snap.pgnText);
      if (typeof snap.validationSessionToken === "string") {
        setValidationSessionToken(snap.validationSessionToken);
      }
      if (
        typeof snap.imageUrl === "string" &&
        /^https?:\/\//i.test(snap.imageUrl)
      )
        setImageUrl(snap.imageUrl);
      setAppState("review");
    } catch {
      // ignore corrupt/unreadable snapshots
    } finally {
      // Restore has now had its chance; the save effect may persist from here on.
      hasRestoredRef.current = true;
      setWorkspaceReady(true);
    }
  }, [user.id]);

  // Safety net: never block the dashboard behind restore skeletons indefinitely.
  useEffect(() => {
    if (workspaceReady) return;
    const id = window.setTimeout(() => {
      hasRestoredRef.current = true;
      setWorkspaceReady(true);
    }, 300);
    return () => window.clearTimeout(id);
  }, [workspaceReady, user.id]);

  // Match move sheet height to the board card on lg+; move list scrolls when longer.
  useLayoutEffect(() => {
    if (appState !== "review" || activeTab !== "dashboard") {
      setBoardCardHeight(null);
      return;
    }
    const el = boardCardRef.current;
    if (!el) return;
    const mq = window.matchMedia("(min-width: 1024px)");

    const update = () => {
      if (!boardCardRef.current) return;
      if (mq.matches) {
        const next = boardCardRef.current.offsetHeight;
        if (next > 0) setBoardCardHeight(next);
      } else {
        setBoardCardHeight(null);
      }
    };

    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    mq.addEventListener("change", update);
    return () => {
      ro.disconnect();
      mq.removeEventListener("change", update);
    };
  }, [
    appState,
    activeTab,
    activeGameId,
    boardOrientation,
    turns.length,
    gameIsValid,
  ]);

  // Save whenever the working state changes (only when there's meaningful content).
  useEffect(() => {
    // Never persist before restore has run — guarantees the saved-game snapshot
    // is read/applied first and can't be clobbered by the empty mount state.
    if (!hasRestoredRef.current) return;
    try {
      if (appState === "review" && turns.length > 0) {
        const snap = {
          v: 1,
          appState,
          turns,
          currentPlyIndex,
          pgn,
          gameIsValid,
          activeGameId,
          activeGameSharedSlug,
          pgnText,
          validationSessionToken,
          imageUrl:
            imageUrl && /^https?:\/\//i.test(imageUrl) ? imageUrl : null,
        };
        localStorage.setItem(
          `getpgn:workspace:${user.id}`,
          JSON.stringify(snap),
        );
      }
    } catch {
      // ignore storage failures (quota, privacy mode, etc.)
    }
  }, [
    user.id,
    appState,
    turns,
    currentPlyIndex,
    pgn,
    gameIsValid,
    activeGameId,
    activeGameSharedSlug,
    pgnText,
    validationSessionToken,
    imageUrl,
  ]);

  // Cycling loading step and chess piece animation
  useEffect(() => {
    if (appState !== "extracting") {
      setLoadingStep(0);
      setChessPieceIndex(0);
      return;
    }

    const pieceInterval = setInterval(() => {
      setChessPieceIndex((prev) => (prev + 1) % 6);
    }, 600);

    const stepInterval = setInterval(() => {
      setLoadingStep((prev) => Math.min(prev + 1, 3));
    }, 2500);

    return () => {
      clearInterval(pieceInterval);
      clearInterval(stepInterval);
    };
  }, [appState]);

  // Sync initial props if they change
  useEffect(() => {
    setUser(initialUser);
    setGames(initialGames);
  }, [initialUser, initialGames]);

  // Resume Pro checkout after landing → signup → dashboard
  useEffect(() => {
    const pending = consumePendingUpgrade();
    if (pending && !isPro) {
      setPricingInitialInterval(pending);
      setShowPricingModal(true);
    }
  }, [isPro]);

  // Close pricing modal on Escape (scroll lock lives in PricingModal via bodyScrollLock).
  useEffect(() => {
    if (!showPricingModal) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !billingLoading) setShowPricingModal(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showPricingModal, billingLoading]);

  const handleImageSelected = (file: File) => {
    if (scansExhausted) return;
    setSelectedFile(file);
    setImageUrl(URL.createObjectURL(file));
    setError(null);
  };

  const handleClearImage = () => {
    setSelectedFile(null);
    if (imageUrl) {
      URL.revokeObjectURL(imageUrl);
    }
    setImageUrl(null);
    setError(null);
  };

  const compressImage = (file: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const MAX_WIDTH = 1200;
          const MAX_HEIGHT = 1600;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            resolve(file);
            return;
          }
          ctx.drawImage(img, 0, 0, width, height);
          canvas.toBlob(
            (blob) => {
              if (blob) {
                resolve(blob);
              } else {
                resolve(file);
              }
            },
            "image/jpeg",
            0.85,
          );
        };
        img.onerror = (err) => reject(err);
      };
      reader.onerror = (err) => reject(err);
    });
  };

  const handleExtractMoves = async () => {
    if (!selectedFile) return;

    setAppState("extracting");
    setError(null);
    setActiveGameId(null);
    setActiveGameSharedSlug(null);

    const controller = new AbortController();
    const timeoutId = window.setTimeout(
      () => controller.abort(),
      EXTRACT_TIMEOUT_MS,
    );

    try {
      let uploadFile: Blob = selectedFile;
      try {
        uploadFile = await compressImage(selectedFile);
      } catch (compressErr) {
        console.warn(
          "Image compression failed, using original file",
          compressErr,
        );
      }

      const formData = new FormData();
      formData.append("file", uploadFile, selectedFile.name);

      const extractRes = await fetch("/api/extract", {
        method: "POST",
        body: formData,
        signal: controller.signal,
      });

      if (!extractRes.ok) {
        const apiErr = await readApiErrorOrLogout(
          extractRes,
          "We couldn't read this scoresheet. Try a clearer, well-lit photo.",
        );
        if (apiErr === null) {
          setAppState("upload");
          return;
        }
        throw new Error(apiErr);
      }

      const extractedData = await extractRes.json();

      if (extractedData.error) {
        throw new Error(extractedData.error);
      }

      if (!extractedData.moves || !Array.isArray(extractedData.moves)) {
        throw new Error("Invalid format returned by extraction engine");
      }

      if (!isPro) {
        setUser((prev) => ({
          ...prev,
          scanCount: Math.min(FREE_SCAN_LIMIT, prev.scanCount + 1),
        }));
      } else {
        const periodKey = getScanPeriodKey(user.subscriptionPlan);
        setUser((prev) => ({
          ...prev,
          monthlyScanMonth: periodKey,
          monthlyScanCount:
            prev.monthlyScanMonth === periodKey ? prev.monthlyScanCount + 1 : 1,
        }));
      }

      if (typeof extractedData.validationToken === "string") {
        setValidationSessionToken(extractedData.validationToken);
      }
      applyValidationResult(extractedData);
      setAppState("review");
    } catch (err: unknown) {
      console.error(err);
      const fallback =
        "We couldn't read this scoresheet. Try a clearer, well-lit photo.";
      setError(
        friendlyError(
          err instanceof DOMException && err.name === "AbortError"
            ? "Extraction took too long. Check your connection and try again."
            : err,
          fallback,
        ),
      );
      setAppState("upload");
    } finally {
      window.clearTimeout(timeoutId);
    }
  };

  const applyValidationResult = (valData: {
    moves?: Turn[];
    pgn?: string;
    valid?: boolean;
  }) => {
    setTurns(valData.moves || []);
    setPgn(valData.pgn || "");
    setGameIsValid(!!valData.valid);
    setCurrentPlyIndex(0);
  };

  const bumpScanCountAfterConsume = () => {
    if (!isPro) {
      setUser((prev) => ({
        ...prev,
        scanCount: Math.min(FREE_SCAN_LIMIT, prev.scanCount + 1),
      }));
    } else {
      const periodKey = getScanPeriodKey(user.subscriptionPlan);
      setUser((prev) => ({
        ...prev,
        monthlyScanMonth: periodKey,
        monthlyScanCount:
          prev.monthlyScanMonth === periodKey ? prev.monthlyScanCount + 1 : 1,
      }));
    }
  };

  const persistActiveGame = async (turnsToSave: Turn[], pgnToSave: string) => {
    if (!activeGameId || user.plan !== "PAID") return;

    try {
      const res = await fetch(`/api/games/${activeGameId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pgn: pgnToSave,
          movesJson: JSON.stringify(turnsToSave),
        }),
      });

      if (!res.ok) {
        const apiErr = await readApiErrorOrLogout(
          res,
          "We couldn't save your edits. Please try again.",
        );
        if (apiErr === null) return;
        throw new Error(apiErr);
      }

      const movesJson = JSON.stringify(turnsToSave);
      setGames((prev) =>
        prev.map((g) =>
          g.id === activeGameId ? { ...g, pgn: pgnToSave, movesJson } : g,
        ),
      );
    } catch (err) {
      console.error("Failed to persist game edits:", err);
      toast.error(
        friendlyError(err, "We couldn't save your edits. Please try again."),
      );
    }
  };

  const runValidation = async (rawMoves: unknown[]) => {
    try {
      const res = await fetch("/api/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          moves: rawMoves,
          validationToken: validationSessionToken,
        }),
      });

      if (!res.ok) {
        if (await forceLogoutIfUserNotFound(res)) return;
        const errData = await res.json().catch(() => ({}));
        if (errData.limitExceeded) {
          setShowPricingModal(true);
        }
        throw new Error(
          friendlyError(
            errData.error,
            "We couldn't validate these moves. Please try again.",
          ),
        );
      }

      const valData = await res.json();

      if (typeof valData.validationToken === "string") {
        setValidationSessionToken(valData.validationToken);
      }
      if (valData.scanConsumed) {
        bumpScanCountAfterConsume();
      }

      applyValidationResult(valData);
      await persistActiveGame(valData.moves || [], valData.pgn || "");
    } catch (err: unknown) {
      console.error(err);
      setError(
        friendlyError(
          err,
          "We couldn't validate these moves. Please try again.",
        ),
      );
      throw err;
    }
  };

  const handleUpdateMove = async (
    moveNumber: number,
    player: "white" | "black",
    newNotation: string,
  ) => {
    const updatedTurns = turns.map((turn) => {
      if (turn.moveNumber === moveNumber) {
        return {
          ...turn,
          [player]: {
            ...turn[player],
            original: newNotation,
          },
        };
      }
      return turn;
    });

    setTurns(updatedTurns);

    try {
      await runValidation(updatedTurns);
    } catch {
      // Handled in runValidation
    }
  };

  const handleAddTurn = async () => {
    const nextMoveNumber = turns.length + 1;
    const newTurn: Turn = {
      moveNumber: nextMoveNumber,
      white: {
        original: "",
        status: "missing",
        san: null,
        candidates: [],
        suggestions: [],
        fen: null,
        uci: null,
      },
      black: {
        original: "",
        status: "missing",
        san: null,
        candidates: [],
        suggestions: [],
        fen: null,
        uci: null,
      },
    };

    const updatedTurns = [...turns, newTurn];
    setTurns(updatedTurns);

    try {
      await runValidation(updatedTurns);
    } catch {
      // Handled in runValidation
    }
  };

  // Insert a blank ply before/after a given 1-based ply index, then re-pair & re-validate.
  const handleInsertPly = async (
    plyIndex: number,
    position: "before" | "after",
  ) => {
    const orig = turnsToOriginals(turns);
    const at = Math.max(
      0,
      Math.min(position === "before" ? plyIndex - 1 : plyIndex, orig.length),
    );
    orig.splice(at, 0, "");
    try {
      await runValidation(originalsToRaw(orig));
      setPendingEditPly(at + 1);
    } catch {
      // Handled in runValidation
    }
  };

  // Delete a single ply (1-based) and re-pair the remaining moves.
  const handleDeletePly = async (plyIndex: number) => {
    const orig = turnsToOriginals(turns);
    if (plyIndex < 1 || plyIndex > orig.length) return;
    orig.splice(plyIndex - 1, 1);
    while (orig.length && !orig[orig.length - 1].trim()) orig.pop();

    if (orig.length === 0) {
      setTurns([]);
      setPgn("");
      setGameIsValid(false);
      setCurrentPlyIndex(0);
      return;
    }
    try {
      await runValidation(originalsToRaw(orig));
    } catch {
      // Handled in runValidation
    }
  };

  // Replace the whole move list from free-form text (Text view).
  const handleLoadText = async (text: string) => {
    const raw = pgnToRawMoves(text);
    if (raw.length === 0) {
      setTurns([]);
      setPgn("");
      setGameIsValid(false);
      setCurrentPlyIndex(0);
      return;
    }
    try {
      await runValidation(raw);
    } catch {
      // Handled in runValidation
    }
  };

  // Drag-to-update: convert a legal board drag into SAN and write it at the selected ply.
  const handleBoardMove = async (from: string, to: string) => {
    if (boardMoveLoading) return;

    let san: string | null = null;
    try {
      const c = new Chess(getBoardFen());
      const mv = c.move({ from, to, promotion: "q" });
      san = mv?.san ?? null;
    } catch {
      san = null;
    }
    if (!san) return;

    const targetPly = getBoardEditPlyIndex(turns, currentPlyIndex);
    const orig = turnsToOriginals(turns);
    while (orig.length < targetPly) orig.push("");
    orig[targetPly - 1] = san;

    setBoardMoveLoading(true);
    try {
      await runValidation(originalsToRaw(orig));
      setCurrentPlyIndex(targetPly);
    } catch {
      // Handled in runValidation
    } finally {
      setBoardMoveLoading(false);
    }
  };

  const findKingSquare = (fen: string, color: "w" | "b"): string | null => {
    const boardPart = fen.split(" ")[0];
    const rows = boardPart.split("/");
    const target = color === "w" ? "K" : "k";
    const files = ["a", "b", "c", "d", "e", "f", "g", "h"];

    for (let r = 0; r < 8; r++) {
      const rowStr = rows[r];
      let fileIdx = 0;
      for (let c = 0; c < rowStr.length; c++) {
        const char = rowStr[c];
        if (char === target) {
          const rank = 8 - r;
          const file = files[fileIdx];
          return `${file}${rank}`;
        }
        if (/\d/.test(char)) {
          fileIdx += parseInt(char, 10);
        } else {
          fileIdx++;
        }
      }
    }
    return null;
  };

  const getBoardFen = () =>
    getBoardFenForPly(turns, currentPlyIndex, START_FEN);

  const getLastMove = () => getLastMoveForPly(turns, currentPlyIndex);

  const getCheckHighlight = () => {
    const checkPly = getCheckPlyForDisplay(turns, currentPlyIndex);
    if (!checkPly) return null;

    const { ply, player } = checkPly;
    const isCheckmate = ply.san!.endsWith("#");
    const isCheck = ply.san!.endsWith("+");

    if (isCheckmate || isCheck) {
      const checkedColor = player === "white" ? "b" : "w";
      const kingSq = findKingSquare(getBoardFen(), checkedColor);
      if (kingSq) {
        return {
          square: kingSq,
          type: isCheckmate ? ("checkmate" as const) : ("check" as const),
        };
      }
    }

    return null;
  };

  const getTotalPlies = () =>
    turns.reduce(
      (count, turn) =>
        count + (turn.white?.san ? 1 : 0) + (turn.black?.san ? 1 : 0),
      0,
    );

  const getBoardStatus = () => {
    const fen = getBoardFen();
    const sideToMove = fen.split(" ")[1] === "w" ? "White" : "Black";
    const totalPlies = getTotalPlies();
    const checkInfo = getCheckHighlight();
    const positionLabel =
      currentPlyIndex === 0
        ? "Start position"
        : `Ply ${currentPlyIndex} of ${totalPlies || turns.length * 2}`;
    return { sideToMove, totalPlies, checkInfo, positionLabel };
  };

  const getGameSnapshot = () => {
    const { turnCount, totalPlies, valid, flagged } = computeMoveStats(turns);
    const activeGame = activeGameId
      ? games.find((g) => g.id === activeGameId)
      : null;
    const title =
      activeGame?.title ?? (activeGameId ? "Saved game" : "Current session");
    const isShared = !!(
      activeGameSharedSlug || activeGame?.publicLink?.enabled
    );
    return {
      title,
      turnCount,
      totalPlies,
      valid,
      flagged,
      currentPly: currentPlyIndex,
      isSaved: !!activeGameId,
      isShared,
      gameIsValid,
      hasImage: !!imageUrl,
    };
  };

  const renderScanUsageMeter = (opts?: { compact?: boolean }) => (
    <ScanUsageMeter
      used={scanUsage.used}
      limit={scanUsage.limit}
      tier={scanUsage.tier}
      planLabel={scanUsage.planLabel}
      periodUnit={scanUsage.periodUnit}
      compact={opts?.compact}
      onUpgrade={!isPro ? () => setShowPricingModal(true) : undefined}
    />
  );

  const renderGameSearchInput = (opts?: { compact?: boolean }) => (
    <div className={`relative ${opts?.compact ? "mb-2.5" : "mb-3"}`}>
      <Search
        className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-2"
        aria-hidden="true"
      />
      <input
        type="search"
        value={gameSearchQuery}
        onChange={(e) => setGameSearchQuery(e.target.value)}
        placeholder="Search by title, date, or move…"
        aria-label="Search saved games"
        className={`w-full rounded-xl border border-line bg-paper pl-9 pr-3 text-ink placeholder:text-muted-2 focus:border-ink focus:outline-none focus:ring-2 focus:ring-ink/10 ${
          opts?.compact ? "py-2 text-[12px]" : "py-2.5 text-[13px]"
        }`}
      />
    </div>
  );

  const renderSavedGamesPanel = () => {
    const renderGameRow = (game: SavedGame, idx: number) => {
      let turnCount = 0;
      if (game.movesJson) {
        try {
          turnCount = JSON.parse(game.movesJson).length;
        } catch {
          /* noop */
        }
      }
      const isActive = activeGameId === game.id;
      const isDeleting = deleting && pendingDelete?.id === game.id;

      return (
        <div
          key={game.id}
          style={{ ["--gp-i" as string]: idx }}
          className="gp-stagger group relative"
        >
          <button
            onClick={() => loadSavedGame(game)}
            aria-current={isActive ? "true" : undefined}
            className={`w-full text-left p-2.5 rounded-xl border flex items-center gap-3 transition-all duration-150 cursor-pointer ${
              isActive
                ? "bg-ink border-ink shadow-[var(--shadow-pop)]"
                : "bg-paper border-line hover:border-muted-2 hover:bg-surface-2 hover:-translate-y-px hover:shadow-[var(--shadow-soft)]"
            }`}
          >
            {isActive && (
              <span
                aria-hidden="true"
                className="absolute left-0 top-1/2 h-6 w-[3px] -translate-y-1/2 rounded-r-full bg-paper/80"
              />
            )}
            <span
              className={`flex-shrink-0 overflow-hidden rounded-lg ring-1 transition-transform duration-150 ${isActive ? "ring-paper/20" : "ring-line group-hover:scale-[1.04]"}`}
            >
              <BoardThumbnail
                movesJson={game.movesJson}
                size={48}
                aria-label={`Board preview for ${game.title}`}
              />
            </span>
            <span className="min-w-0 flex-1">
              <span
                className={`font-semibold text-[13px] block truncate leading-snug pr-7 ${isActive ? "text-paper" : "text-ink"}`}
              >
                {game.title}
              </span>
              <span
                className={`flex items-center flex-wrap gap-x-1.5 gap-y-0.5 text-[12px] mt-1 ${isActive ? "text-paper/55" : "text-muted-2"}`}
              >
                <span className="gp-nums">
                  {formatGameDate(game.createdAt)}
                </span>
                <span aria-hidden="true">·</span>
                <span className="gp-nums">
                  {turnCount} {turnCount === 1 ? "turn" : "turns"}
                </span>
                {game.publicLink && (
                  <span
                    className={`inline-flex items-center gap-0.5 font-medium ${isActive ? "text-paper/70" : "text-muted"}`}
                  >
                    <span aria-hidden="true">·</span>
                    <Share2 className="w-2.5 h-2.5" />
                    Shared
                  </span>
                )}
              </span>
            </span>
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setPendingDelete(game);
            }}
            disabled={isDeleting}
            aria-busy={isDeleting || undefined}
            aria-label={`Delete ${game.title}`}
            title="Delete game"
            className={`absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-lg border opacity-0 transition-all duration-150 focus:opacity-100 focus-visible:opacity-100 group-hover:opacity-100 disabled:opacity-100 disabled:cursor-not-allowed cursor-pointer ${
              isActive
                ? "border-paper/25 bg-paper/10 text-paper/75 hover:bg-paper/20 hover:text-paper"
                : "border-line-strong bg-paper text-muted hover:border-danger hover:bg-danger-bg hover:text-danger"
            }`}
          >
            {isDeleting ? (
              <Spinner size={12} />
            ) : (
              <Trash2 className="h-3.5 w-3.5" />
            )}
          </button>
        </div>
      );
    };

    return (
      <div className="bg-surface border border-line rounded-2xl p-4 flex flex-col overflow-hidden">
        <div className="flex items-center justify-between mb-3.5 px-1 shrink-0">
          <h2 className="font-semibold text-[11px] text-muted-2 uppercase tracking-widest flex items-center gap-2">
            <History className="w-3 h-3" />
            Saved Games
          </h2>
          {isPro && games.length > 0 && (
            <span className="text-[11px] text-muted font-mono gp-nums px-1.5 py-0.5 rounded-md bg-surface-2 border border-line">
              {games.length}
            </span>
          )}
        </div>
        {isPro && games.length > 0 && renderGameSearchInput({ compact: true })}
        <div className="relative min-h-0">
          <div className="overflow-y-auto space-y-1.5 -mx-1 px-1 pb-1 max-h-[min(420px,calc(100vh-280px))] scroll-smooth [scrollbar-gutter:stable]">
            {isPro ? (
              games.length === 0 ? (
                <div className="text-center space-y-3 py-14 px-4">
                  <div className="mx-auto w-fit mb-1 opacity-70">
                    <BoardThumbnail size={56} aria-label="Empty board" />
                  </div>
                  <p className="text-xs font-semibold text-ink">
                    No saved games yet
                  </p>
                  <p className="text-[12px] text-muted leading-relaxed">
                    Digitize &amp; save a scoresheet — it&apos;ll appear here
                    with a board preview.
                  </p>
                </div>
              ) : filteredGames.length === 0 ? (
                <div className="text-center py-10 px-4">
                  <p className="text-[12px] font-semibold text-ink">No matches</p>
                  <p className="mt-1 text-[11px] text-muted">
                    Try a different title, date, or move notation.
                  </p>
                </div>
              ) : (
                <div className="space-y-1.5">{filteredGames.map(renderGameRow)}</div>
              )
            ) : (
              <div className="relative overflow-hidden p-5 rounded-xl border border-line-strong bg-paper text-center space-y-4 mt-1">
                <div className="flex items-center justify-center -space-x-3 mb-1">
                  <BoardThumbnail
                    size={40}
                    className="rotate-[-8deg] opacity-50"
                    aria-label="Locked preview"
                  />
                  <BoardThumbnail
                    size={48}
                    className="relative z-10 shadow-md"
                    aria-label="Locked preview"
                  />
                  <BoardThumbnail
                    size={40}
                    className="rotate-[8deg] opacity-50"
                    aria-label="Locked preview"
                  />
                </div>
                <div className="space-y-1">
                  <h3 className="font-bold text-[15px] text-ink flex items-center justify-center gap-1.5">
                    <Lock className="w-3.5 h-3.5" />
                    History Locked
                  </h3>
                  <p className="text-[12px] text-muted leading-relaxed">
                    Keep every game forever. Pro includes scan allowances
                    and shareable replays.
                  </p>
                </div>
                <button
                  onClick={() => setShowPricingModal(true)}
                  className="w-full py-2.5 px-3 bg-ink hover:bg-ink-soft text-paper rounded-lg text-[13px] font-bold transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-1.5"
                >
                  Unlock History
                </button>
              </div>
            )}
          </div>
          {isPro && games.length > 4 && (
            <div
              className="pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-surface to-transparent"
              aria-hidden="true"
            />
          )}
        </div>
        {isPro && games.length > 0 && (
          <p className="mt-2 px-1 text-[11px] text-muted-2 leading-relaxed">
            {gameSearchQuery.trim()
              ? `${filteredGames.length} of ${games.length} games`
              : games.length === 1
                ? "1 saved game"
                : `${games.length} saved games`}
            {filteredGames.length > 4 ? " · scroll for more" : ""}
          </p>
        )}
      </div>
    );
  };

  const renderUploadScanLimitBanner = () =>
    scansExhausted ? (
      <div
        className={`${UPLOAD_FOCUS} relative overflow-hidden rounded-[20px] border border-line/50 bg-surface/30 px-5 py-5 gp-fade-up`}
      >
        <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:text-left">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-ink text-paper">
            <Lock className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1 space-y-1">
            <span className="block text-[15px] font-semibold text-ink">
              {isPro
                ? scanUsage.periodUnit === "year"
                  ? "Yearly scan limit reached"
                  : "Monthly scan limit reached"
                : "All free scans used"}
            </span>
            <span className="block text-[13px] leading-relaxed text-muted">
              {isPro
                ? scanUsage.periodUnit === "year"
                  ? `You've used ${scanUsage.used.toLocaleString()} of ${scanUsage.limit.toLocaleString()} scans this year. Your quota resets on January 1.`
                  : `You've used ${scanUsage.used.toLocaleString()} of ${scanUsage.limit.toLocaleString()} scans this month. Your quota resets on the 1st.`
                : "Upgrade for scan allowances, a permanent library, and shareable replays."}
            </span>
          </div>
          {!isPro && (
            <button
              onClick={() => setShowPricingModal(true)}
              className="btn-primary btn-sm shrink-0 cursor-pointer"
            >
              View plans
            </button>
          )}
        </div>
      </div>
    ) : null;

  const renderUploadError = () =>
    error ? (
      <div
        className={`${UPLOAD_FOCUS} flex items-start gap-3 rounded-[20px] border border-[#fbcfe3] bg-danger-bg px-4 py-4 text-danger gp-fade-in`}
      >
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
        <div className="space-y-0.5">
          <span className="block text-sm font-semibold text-ink">
            Couldn&apos;t process that
          </span>
          <span className="text-xs">{error}</span>
        </div>
      </div>
    ) : null;

  const renderUploadFormCard = (opts?: {
    showHeading?: boolean;
    wide?: boolean;
  }) => {
    const showHeading = opts?.showHeading !== false && !imageUrl;
    const wide = opts?.wide === true;
    return (
      <div className={`${uploadShell(wide)} space-y-4 gp-fade-up`}>
        {showHeading && (
          <div className="space-y-1 text-center sm:text-left">
            <h2 className="text-[15px] font-semibold tracking-tight text-ink">
              Upload your scoresheet
            </h2>
            <p className="text-[13px] leading-relaxed text-muted">
              Handwriting, captures, checks, and promotions included.
            </p>
          </div>
        )}
        <ImageUpload
          onImageSelected={handleImageSelected}
          imageUrl={imageUrl}
          onClear={handleClearImage}
          disabled={scansExhausted}
          disabledMessage={
            isPro
              ? scanUsage.periodUnit === "year"
                ? "You've used all scans for this year. Your quota resets on January 1."
                : "You've used all scans for this month. Your quota resets on the 1st."
              : "You've used both free scans. Upgrade to Pro to keep digitizing."
          }
        />
        {selectedFile && (
          <div className="gp-digitize-shell gp-fade-up p-1.5">
            <p className="px-3 py-2.5 text-center text-[12px] leading-relaxed text-muted-2">
              Ready to digitize — replace or remove above if needed
            </p>
            <button
              type="button"
              onClick={handleExtractMoves}
              disabled={scansExhausted}
              className="gp-digitize-cta"
            >
              <span className="gp-digitize-cta__label">
                Digitize scoresheet
              </span>
              <ArrowRight
                className="gp-digitize-cta__arrow h-4 w-4"
                strokeWidth={2}
                aria-hidden="true"
              />
            </button>
          </div>
        )}
      </div>
    );
  };

  const renderUploadFeaturePills = (wide?: boolean) => (
    <div
      className={`${uploadShell(wide)} grid grid-cols-3 gap-2 rounded-[16px] border border-line/40 bg-surface/15 p-2 gp-fade-up`}
    >
      {[
        { icon: HelpCircle, label: "Handwriting" },
        { icon: BookOpen, label: "Validation" },
        { icon: Share2, label: "Export" },
      ].map(({ icon: Icon, label }) => (
        <div
          key={label}
          className="flex flex-col items-center gap-1.5 rounded-xl px-2 py-2.5 text-center"
        >
          <Icon className="h-3.5 w-3.5 text-muted-2" />
          <span className="text-[10px] font-medium text-muted">{label}</span>
        </div>
      ))}
    </div>
  );

  const renderUploadLibraryInsights = () => {
    let shared = 0;
    let totalTurns = 0;
    for (const g of games) {
      if (g.publicLink) shared++;
      if (g.movesJson) {
        try {
          totalTurns += JSON.parse(g.movesJson).length;
        } catch {
          /* noop */
        }
      }
    }
    return (
      <div className="grid grid-cols-3 gap-2 rounded-[16px] border border-line/40 bg-surface/15 p-3 gp-fade-up">
        {[
          { label: "Games", value: games.length },
          { label: "Shared", value: shared },
          { label: "Turns", value: totalTurns },
        ].map(({ label, value }) => (
          <div
            key={label}
            className="rounded-xl border border-line/30 bg-paper/70 px-2 py-2.5 text-center"
          >
            <p className="text-[10px] font-medium uppercase tracking-[0.1em] text-muted-2">
              {label}
            </p>
            <p className="mt-1 text-[18px] font-semibold tracking-tight text-ink gp-nums">
              {value}
            </p>
          </div>
        ))}
      </div>
    );
  };

  const renderUploadProPerks = () => (
    <div className="hidden rounded-[20px] border border-line/45 bg-surface/20 px-5 py-4 gp-fade-up lg:block">
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-2">
        Your plan
      </p>
      <ul className="mt-3 space-y-2.5">
        {[
          {
            icon: InfinityIcon,
            text: formatProScanAllowance(user.subscriptionPlan),
          },
          { icon: History, text: "Cloud game library" },
          { icon: Share2, text: "Shareable replay links" },
        ].map(({ icon: Icon, text }) => (
          <li key={text} className="flex items-center gap-2.5 text-[12px] text-muted">
            <Icon className="h-3.5 w-3.5 shrink-0 text-ink" />
            {text}
          </li>
        ))}
      </ul>
    </div>
  );

  const renderUploadSavedGamesLibrary = (wide?: boolean) => (
    <section
      className={`${uploadShell(wide)} gp-fade-up`}
      style={{ animationDelay: "40ms" }}
    >
      <div className="overflow-hidden rounded-[20px] border border-line/50 bg-surface/20 shadow-[var(--shadow-soft)]">
        <div className="flex items-center justify-between gap-3 border-b border-line/40 px-4 py-3.5 sm:px-5">
          <div className="min-w-0 text-left">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-2">
              Your library
            </p>
            <h2 className="text-[15px] font-semibold tracking-tight text-ink">
              Saved games
            </h2>
          </div>
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-line/60 bg-paper/70 px-2.5 py-1 text-[11px] text-muted">
            <History className="h-3 w-3" />
            <span className="font-semibold text-ink gp-nums">
              {games.length}
            </span>
          </span>
        </div>

        {games.length > 0 && (
          <div className="border-b border-line/40 px-4 py-3 sm:px-5">
            {renderGameSearchInput({ compact: true })}
          </div>
        )}

        <div
          className={`divide-y divide-line/35 overflow-y-auto scroll-smooth [scrollbar-gutter:stable] ${
            wide
              ? "max-h-[min(320px,42vh)] lg:max-h-[min(520px,62vh)]"
              : "max-h-[min(280px,36vh)]"
          }`}
        >
          {filteredGames.length === 0 && gameSearchQuery.trim() ? (
            <div className="px-4 py-10 text-center sm:px-5">
              <p className="text-[13px] font-semibold text-ink">No matches</p>
              <p className="mt-1 text-[12px] text-muted">
                Try another title, date, or move.
              </p>
            </div>
          ) : null}
          {filteredGames.map((game) => {
            let turnCount = 0;
            if (game.movesJson) {
              try {
                turnCount = JSON.parse(game.movesJson).length;
              } catch {
                /* noop */
              }
            }
            const isActive = activeGameId === game.id;
            const isDeleting = deleting && pendingDelete?.id === game.id;

            return (
              <div key={game.id} className="group relative">
                <button
                  type="button"
                  onClick={() => loadSavedGame(game)}
                  aria-current={isActive ? "true" : undefined}
                  className={`flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors sm:px-5 sm:py-4 ${
                    isActive ? "bg-ink text-paper" : "hover:bg-surface/50"
                  }`}
                >
                  <span
                    className={`shrink-0 overflow-hidden rounded-lg ring-1 ${
                      isActive ? "ring-paper/20" : "ring-line/70"
                    }`}
                  >
                    <BoardThumbnail
                      movesJson={game.movesJson}
                      size={52}
                      aria-label={`Board preview for ${game.title}`}
                    />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span
                      className={`block truncate text-[14px] font-medium ${
                        isActive ? "text-paper" : "text-ink"
                      }`}
                    >
                      {game.title}
                    </span>
                    <span
                      className={`mt-0.5 flex items-center gap-1.5 text-[12px] ${
                        isActive ? "text-paper/60" : "text-muted"
                      }`}
                    >
                      <span className="gp-nums">
                        {turnCount} {turnCount === 1 ? "turn" : "turns"}
                      </span>
                      <span className="text-faint">·</span>
                      <span>{formatGameDate(game.createdAt)}</span>
                      {game.publicLink ? (
                        <>
                          <span className="text-faint">·</span>
                          <span
                            className={
                              isActive ? "text-paper/75" : "text-positive"
                            }
                          >
                            Shared
                          </span>
                        </>
                      ) : null}
                    </span>
                  </span>
                  <ArrowUpRight
                    className={`h-4 w-4 shrink-0 transition-transform duration-200 group-hover:-translate-y-px group-hover:translate-x-px ${
                      isActive
                        ? "text-paper/80"
                        : "text-muted-2 group-hover:text-ink"
                    }`}
                  />
                </button>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setPendingDelete(game);
                  }}
                  disabled={isDeleting}
                  aria-busy={isDeleting || undefined}
                  aria-label={`Delete ${game.title}`}
                  title="Delete game"
                  className={`absolute right-3 top-1/2 z-10 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-md border opacity-0 shadow-[var(--shadow-soft)] transition-all duration-150 focus:opacity-100 focus-visible:opacity-100 group-hover:opacity-100 disabled:cursor-not-allowed disabled:opacity-100 cursor-pointer ${
                    isActive
                      ? "border-paper/25 bg-paper/10 text-paper/75 hover:bg-paper/20 hover:text-paper"
                      : "border-line-strong bg-paper text-muted hover:border-danger hover:bg-danger-bg hover:text-danger"
                  }`}
                >
                  {isDeleting ? (
                    <Spinner size={12} />
                  ) : (
                    <Trash2 className="h-3 w-3" />
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );

  const renderUploadLibraryOnboarding = (wide?: boolean) => {
    if (!isPro) return null;

    return (
    <section
      className={`${uploadShell(wide)} gp-fade-up`}
      style={{ animationDelay: "60ms" }}
    >
      <div className="rounded-[20px] border border-line/45 bg-surface/20 px-5 py-5 sm:px-6 sm:py-6">
          <>
            <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:items-start sm:text-left">
              <div className="flex shrink-0 items-center justify-center -space-x-2.5">
                <BoardThumbnail
                  size={44}
                  className="rotate-[-6deg] opacity-35"
                  aria-label="Placeholder game"
                />
                <BoardThumbnail
                  size={56}
                  className="relative z-10 shadow-[var(--shadow-soft)]"
                  aria-label="Placeholder game"
                />
                <BoardThumbnail
                  size={44}
                  className="rotate-[6deg] opacity-35"
                  aria-label="Placeholder game"
                />
              </div>
              <div className="min-w-0">
                <h2 className="text-[15px] font-semibold tracking-tight text-ink">
                  Build your game library
                </h2>
                <p className="mt-1 text-[13px] leading-relaxed text-muted">
                  Upload, review, and save — every game gets a board preview and
                  replay link.
                </p>
              </div>
            </div>
            <div className="mt-5 flex flex-col gap-3 border-t border-line/40 pt-5 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
              {[
                { title: "Upload", desc: "Photo of scoresheet", icon: Upload },
                { title: "Digitize", desc: "AI reads moves", icon: Sparkles },
                { title: "Save", desc: "Cloud library", icon: History },
              ].map(({ title, desc, icon: Icon }, i, arr) => (
                <div
                  key={title}
                  className="flex min-w-0 flex-1 items-center gap-3 sm:flex-col sm:items-start sm:gap-1.5"
                >
                  <div className="flex items-center gap-2.5 sm:w-full">
                    <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-ink/8 text-[11px] font-semibold text-ink">
                      {i + 1}
                    </span>
                    <Icon className="h-3.5 w-3.5 text-muted-2 sm:hidden" />
                    <div className="min-w-0 sm:flex-1">
                      <p className="text-[13px] font-medium text-ink">
                        {title}
                      </p>
                      <p className="text-[11px] text-muted-2">{desc}</p>
                    </div>
                  </div>
                  {i < arr.length - 1 && (
                    <span
                      className="hidden h-px flex-1 bg-line/50 sm:block"
                      aria-hidden
                    />
                  )}
                </div>
              ))}
            </div>
          </>
      </div>
    </section>
    );
  };

  const renderUploadGreeting = (opts?: { centered?: boolean }) => (
    <p
      className={`text-[clamp(1.25rem,2.8vw,1.625rem)] font-semibold tracking-tight text-ink gp-fade-up ${
        opts?.centered ? "text-center" : ""
      }`}
    >
      {getTimeGreeting(user.username)}
    </p>
  );

  const renderUploadScreen = () => {
    const hasLibrary = isPro && games.length > 0;
    const showHero = !imageUrl && !selectedFile;

    const hero = showHero ? (
      <div className={`${UPLOAD_FOCUS} text-center gp-fade-up`}>
        {renderUploadGreeting({ centered: true })}
        <div className="mb-4 mt-4 flex flex-wrap items-center justify-center gap-2">
          <span className="chip">
            <span
              className={`h-1.5 w-1.5 rounded-full ${scansExhausted ? "bg-danger" : "bg-positive"}`}
            />
            {scanUsage.planLabel} ·{" "}
            <span className="gp-nums">
              {scanUsage.used.toLocaleString()}/{scanUsage.limit.toLocaleString()}
            </span>{" "}
            scans used
            {isPro
              ? scanUsage.periodUnit === "year"
                ? " this year"
                : " this month"
              : ""}
          </span>
        </div>
        <h1 className="mt-3 text-[clamp(1.375rem,4vw,1.75rem)] font-semibold tracking-tight text-ink leading-snug">
          {scansExhausted
            ? isPro
              ? scanUsage.periodUnit === "year"
                ? "Yearly scan limit reached"
                : "Monthly scan limit reached"
              : "Upgrade to keep digitizing"
            : "Digitize your chess games"}
        </h1>
        <p className="mx-auto mt-2 max-w-[22rem] text-[14px] leading-relaxed text-muted">
          {scansExhausted
            ? isPro
              ? scanUsage.periodUnit === "year"
              ? `You've used all ${scanUsage.limit.toLocaleString()} scans for this year. Your quota resets on January 1.`
              : `You've used all ${scanUsage.limit.toLocaleString()} scans for this month. Your quota resets on the 1st.`
              : "You've used both free scans. Upgrade for scan allowances and shareable replays."
            : "Upload a handwritten scoresheet — we extract moves, validate the game, and export clean PGN."}
        </p>
        {!scansExhausted && (
          <p className="mt-3 text-[12px] text-muted-2">
            {isPro
              ? scanUsage.periodUnit === "year"
                ? `${scanUsage.remaining.toLocaleString()} scan${scanUsage.remaining === 1 ? "" : "s"} left this year`
                : `${scanUsage.remaining.toLocaleString()} scan${scanUsage.remaining === 1 ? "" : "s"} left this month`
              : `No credit card · ${scanUsage.remaining} free scan${scanUsage.remaining === 1 ? "" : "s"} left`}
          </p>
        )}
      </div>
    ) : null;

    if (hasLibrary) {
      return (
        <div className="w-full space-y-5 pb-10">
          <div className="space-y-1">
            {renderUploadGreeting()}
            {!imageUrl && !selectedFile ? (
              <p className="text-[15px] font-semibold tracking-tight text-ink">
                Pick up where you left off, or start a new scoresheet.
              </p>
            ) : null}
          </div>
          {renderUploadScanLimitBanner()}
          {renderUploadError()}
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.08fr)_minmax(300px,400px)] lg:items-start lg:gap-8 xl:gap-10">
            <div className="min-w-0 space-y-4 lg:sticky lg:top-24 lg:self-start">
              {renderUploadSavedGamesLibrary(true)}
              {renderUploadLibraryInsights()}
              {renderUploadProPerks()}
            </div>
            <div className="min-w-0 space-y-4 lg:sticky lg:top-24 lg:self-start">
              {renderScanUsageMeter({ compact: true })}
              {!imageUrl ? (
                <div className="flex items-center gap-3 px-1">
                  <div className="h-px flex-1 bg-line/45" />
                  <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-2">
                    New scoresheet
                  </span>
                  <div className="h-px flex-1 bg-line/45" />
                </div>
              ) : null}
              {renderUploadFormCard({ showHeading: false, wide: true })}
              {!imageUrl ? renderUploadFeaturePills(true) : null}
            </div>
          </div>
        </div>
      );
    }

    if (!isPro) {
      return (
        <div className="w-full space-y-8 pb-4">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-10 xl:grid-cols-[minmax(0,1fr)_320px]">
            <div className="min-w-0 space-y-8">
              {hero}
              {renderUploadScanLimitBanner()}
              {renderUploadError()}
              {renderUploadFormCard({ showHeading: false })}
              {!imageUrl && renderUploadFeaturePills()}
            </div>
            <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
              {renderScanUsageMeter()}
              <FreeVsProTable
                compact
                onUpgrade={() => setShowPricingModal(true)}
              />
            </aside>
          </div>
          {!imageUrl && renderUploadLibraryOnboarding()}
        </div>
      );
    }

    return (
      <div className="w-full space-y-8 pb-6">
        {!showHero ? (
          <div className="space-y-1">{renderUploadGreeting()}</div>
        ) : null}
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(300px,400px)] lg:items-start lg:gap-10">
          <div className="min-w-0 space-y-6">
            {hero}
            {!imageUrl && renderUploadLibraryOnboarding(true)}
            {!imageUrl && renderUploadFeaturePills(true)}
          </div>
          <div className="min-w-0 space-y-4 lg:sticky lg:top-24 lg:self-start">
            {renderScanUsageMeter({ compact: true })}
            {renderUploadScanLimitBanner()}
            {renderUploadError()}
            {renderUploadFormCard({ showHeading: !imageUrl, wide: true })}
            {renderUploadProPerks()}
          </div>
        </div>
      </div>
    );
  };

  const handleReset = () => {
    setTurns([]);
    setPgn("");
    setGameIsValid(false);
    setCurrentPlyIndex(0);
    setActiveGameId(null);
    setActiveGameSharedSlug(null);
    setPgnText("");
    setValidationSessionToken(null);
    handleClearImage();
    setAppState("upload");
    try {
      localStorage.removeItem(`getpgn:workspace:${user.id}`);
    } catch {}
  };

  const handleDeleteGame = async () => {
    if (!pendingDelete) return;
    const target = pendingDelete;
    setDeleting(true);
    try {
      const res = await fetch("/api/games/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gameId: target.id }),
      });
      if (!res.ok) {
        const apiErr = await readApiErrorOrLogout(
          res,
          "We couldn't delete that game. Please try again.",
        );
        if (apiErr === null) return;
        throw new Error(apiErr);
      }
      setGames((prev) => prev.filter((g) => g.id !== target.id));
      if (activeGameId === target.id) handleReset();
      toast.success("Game deleted");
      setPendingDelete(null);
    } catch (err) {
      toast.error(
        friendlyError(err, "We couldn't delete that game. Please try again."),
      );
    } finally {
      setDeleting(false);
    }
  };

  const handleSaveGame = async (title: string): Promise<string | null> => {
    if (!pgn || user.plan !== "PAID") return null;

    try {
      const res = await fetch("/api/games/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pgn,
          title,
          movesJson: JSON.stringify(turns),
        }),
      });

      if (!res.ok) {
        const apiErr = await readApiErrorOrLogout(
          res,
          "We couldn't save this game. Please try again.",
        );
        if (apiErr === null) return null;
        throw new Error(apiErr);
      }
      const data = await res.json();

      const newGame: SavedGame = {
        id: data.game.id,
        title: data.game.title,
        pgn,
        movesJson: JSON.stringify(turns),
        createdAt: data.game.createdAt,
        publicLink: null,
      };

      setGames((prev) => [newGame, ...prev]);
      setActiveGameId(data.game.id);
      toast.success("Game saved to your library");
      return data.game.id;
    } catch (err: unknown) {
      console.error(err);
      toast.error(
        friendlyError(err, "We couldn't save this game. Please try again."),
      );
      return null;
    }
  };

  const handleShareGame = async (gameId: string): Promise<string | null> => {
    if (!gameId || user.plan !== "PAID") return null;

    try {
      const res = await fetch("/api/games/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gameId }),
      });

      if (!res.ok) {
        const apiErr = await readApiErrorOrLogout(
          res,
          "We couldn't create a share link. Please try again.",
        );
        if (apiErr === null) return null;
        throw new Error(apiErr);
      }
      const data = await res.json();

      // Update games list locally to include share slug
      setGames((prev) =>
        prev.map((g) => {
          if (g.id === gameId) {
            return {
              ...g,
              publicLink: { slug: data.slug, enabled: true },
            };
          }
          return g;
        }),
      );

      setActiveGameSharedSlug(data.slug);
      toast.success("Shareable link ready");
      return data.slug;
    } catch (err: unknown) {
      console.error(err);
      toast.error(
        friendlyError(
          err,
          "We couldn't create a share link. Please try again.",
        ),
      );
      return null;
    }
  };

  const loadSavedGame = async (game: SavedGame) => {
    try {
      const res = await fetch(`/api/games/${game.id}`);
      if (!res.ok) {
        const apiErr = await readApiErrorOrLogout(
          res,
          "We couldn't open that saved game.",
        );
        if (apiErr === null) return;
        throw new Error(apiErr);
      }
      const data = await res.json();
      const fullGame: SavedGame = {
        id: data.game.id,
        title: data.game.title,
        pgn: data.game.pgn,
        movesJson: data.game.movesJson,
        createdAt: data.game.createdAt,
        publicLink: data.game.publicLink ?? null,
      };
      setGames((prev) =>
        prev.map((g) => (g.id === fullGame.id ? fullGame : g)),
      );

      if (typeof data.validationToken === "string") {
        setValidationSessionToken(data.validationToken);
      }

      const parsedTurns = JSON.parse(fullGame.movesJson!) as Turn[];
      applyValidationResult({
        moves: parsedTurns,
        pgn: fullGame.pgn,
        valid: true,
      });
      setActiveGameId(fullGame.id);
      setActiveGameSharedSlug(fullGame.publicLink?.slug || null);
      setAppState("review");
      setError(null);
    } catch (err) {
      console.error("Failed to load saved game:", err);
      toast.error(friendlyError(err, "We couldn't open that saved game."));
    }
  };

  // ─── Billing (Upgrade & Simulation) Handlers ────────────────────────────
  const handleCreateSubscription = async (plan: "monthly" | "yearly") => {
    setBillingLoading(true);
    try {
      await openRazorpayCheckout({
        plan,
        username: user.username,
        onVerified: async ({ plan: verifiedPlan, subscriptionId }) => {
          setBillingLoading(true);
          try {
            setUser((prev) => ({
              ...prev,
              plan: "PAID",
              subscriptionStatus: "active",
              subscriptionPlan: verifiedPlan,
              subscriptionId,
            }));
            setShowPricingModal(false);
            toast.success("Welcome to GetPGN Pro", {
              description: `Pro is active instantly. ${formatProScanAllowance(verifiedPlan)}.`,
            });
            router.refresh();
          } finally {
            setBillingLoading(false);
          }
        },
        onError: (message) => {
          toast.error(message);
        },
      });
    } catch (err: unknown) {
      console.error(err);
      toast.error(
        friendlyError(err, "We couldn't start checkout. Please try again."),
      );
    } finally {
      setBillingLoading(false);
    }
  };

  const handleCancelSubscription = async () => {
    setBillingLoading(true);
    try {
      const res = await fetch("/api/subscription/cancel", {
        method: "POST",
      });
      if (!res.ok) {
        const apiErr = await readApiErrorOrLogout(
          res,
          "We couldn't cancel your subscription. Please try again.",
        );
        if (apiErr === null) return;
        throw new Error(apiErr);
      }

      setUser((prev) => ({
        ...prev,
        subscriptionStatus: "cancelled",
      }));
      setShowCancelConfirm(false);
      toast.success("Subscription cancelled", {
        description: "You keep Pro access until your billing period ends.",
      });
      router.refresh();
    } catch (err: unknown) {
      console.error(err);
      toast.error(
        friendlyError(
          err,
          "We couldn't cancel your subscription. Please try again.",
        ),
      );
    } finally {
      setBillingLoading(false);
    }
  };

  const handleSimulateUpgrade = async () => {
    setBillingLoading(true);
    try {
      const res = await fetch("/api/billing/simulate-upgrade", {
        method: "POST",
      });
      if (!res.ok) {
        const apiErr = await readApiErrorOrLogout(res, "Simulation failed.");
        if (apiErr === null) return;
        throw new Error(apiErr);
      }
      const data = await res.json();

      setUser((prev) => ({
        ...prev,
        plan: "PAID",
        subscriptionPlan: data.subscriptionPlan ?? "monthly",
        subscriptionStatus: data.subscriptionStatus ?? "active",
        subscriptionStart: data.subscriptionStart ?? null,
        subscriptionEnd: data.subscriptionEnd ?? null,
        subscriptionId: data.subscriptionId ?? null,
        paymentProvider: data.paymentProvider ?? "simulated",
      }));
      toast.success("Dev: upgraded to Pro");
      router.refresh();
    } catch (err: unknown) {
      console.error(err);
      toast.error(friendlyError(err, "Simulation failed."));
    } finally {
      setBillingLoading(false);
    }
  };

  const handleSimulateDowngrade = async () => {
    setBillingLoading(true);
    try {
      const res = await fetch("/api/billing/simulate-upgrade", {
        method: "DELETE",
      });
      if (!res.ok) {
        const apiErr = await readApiErrorOrLogout(
          res,
          "Simulation reset failed.",
        );
        if (apiErr === null) return;
        throw new Error(apiErr);
      }

      setUser((prev) => ({
        ...prev,
        plan: "FREE",
        scanCount: 0,
        monthlyScanCount: 0,
        monthlyScanMonth: null,
      }));
      setGames([]);
      handleReset();
      toast.success("Dev: reverted to Free plan");
      router.refresh();
    } catch (err: unknown) {
      console.error(err);
      toast.error(friendlyError(err, "Simulation reset failed."));
    } finally {
      setBillingLoading(false);
    }
  };

  const handleDownloadInvoice = async () => {
    setDownloadingInvoice(true);
    try {
      const res = await fetch("/api/billing/invoice");
      if (!res.ok) {
        const apiErr = await readApiErrorOrLogout(
          res,
          "Could not download invoice.",
        );
        if (apiErr === null) return;
        toast.error(apiErr);
        return;
      }
      const blob = await res.blob();
      const disposition = res.headers.get("Content-Disposition");
      const match = disposition?.match(/filename="([^"]+)"/);
      const filename = match?.[1] ?? "GetPGN-invoice.pdf";
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filename;
      anchor.rel = "noopener";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (err: unknown) {
      console.error(err);
      toast.error(friendlyError(err, "Could not download invoice."));
    } finally {
      setDownloadingInvoice(false);
    }
  };

  const renderAccountProfileSection = () => (
    <section
      className="bg-surface border border-line rounded-2xl overflow-hidden gp-fade-up shrink-0"
      style={{ animationDelay: "90ms" }}
    >
      <div className="px-4 sm:px-5 py-3 border-b border-line flex items-center gap-2 shrink-0">
        <ShieldCheck className="w-4 h-4 text-muted" />
        <h2 className="font-semibold text-ink text-[14px]">
          Profile &amp; security
        </h2>
      </div>
      <div className="p-4 sm:p-5 grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-5 min-h-0">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleChangeUsername();
          }}
          className="space-y-2.5"
          aria-label="Change username"
        >
          <h3 className="text-[13px] font-semibold text-ink">Username</h3>
          <div className="flex flex-col sm:flex-row sm:items-end gap-2.5">
            <div className="flex-1 min-w-0">
              <IconInput
                id="account-username"
                label="Username"
                icon={<User className="h-4 w-4" />}
                value={usernameInput}
                onChange={(e) => setUsernameInput(e.target.value)}
                autoComplete="username"
                maxLength={32}
                placeholder="Your username"
                disabled={savingUsername}
              />
            </div>
            <button
              type="submit"
              disabled={
                savingUsername ||
                usernameInput.trim().length < 3 ||
                usernameInput.trim() === user.username
              }
              className="shrink-0 h-[42px] py-2 px-4 bg-ink hover:bg-ink-soft text-paper font-bold rounded-xl text-[12px] flex items-center justify-center gap-1.5 transition-all active:scale-[0.99] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {savingUsername ? (
                <Spinner size={14} />
              ) : (
                <Check className="h-4 w-4" />
              )}
              Save
            </button>
          </div>
          {usernameInput.trim().length > 0 &&
            usernameInput.trim().length < 3 && (
              <p className="text-[11px] text-warn flex items-center gap-1.5">
                <AlertCircle className="h-3.5 w-3.5" />
                At least 3 characters.
              </p>
            )}
        </form>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleChangePassword();
          }}
          className="space-y-2.5"
          aria-label="Change password"
        >
          <h3 className="text-[13px] font-semibold text-ink">Password</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div className="sm:col-span-2">
              <IconInput
                id="account-current-password"
                label="Current password"
                type="password"
                icon={<Lock className="h-4 w-4" />}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                autoComplete="current-password"
                placeholder="Current password"
                disabled={savingPassword}
              />
            </div>
            <IconInput
              id="account-new-password"
              label="New password"
              type="password"
              icon={<KeyRound className="h-4 w-4" />}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
              placeholder="New password"
              disabled={savingPassword}
            />
            <IconInput
              id="account-confirm-password"
              label="Confirm"
              type="password"
              icon={<KeyRound className="h-4 w-4" />}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
              placeholder="Re-enter"
              disabled={savingPassword}
            />
          </div>
          {(newPassword.length > 0 && newPassword.length < 6) ||
          (confirmPassword.length > 0 && newPassword !== confirmPassword) ? (
            <p className="text-[11px] text-warn flex items-center gap-1.5">
              <AlertCircle className="h-3.5 w-3.5" />
              {newPassword.length > 0 && newPassword.length < 6
                ? "At least 6 characters."
                : "Passwords don't match."}
            </p>
          ) : null}
          <button
            type="submit"
            disabled={
              savingPassword ||
              !currentPassword ||
              newPassword.length < 6 ||
              newPassword !== confirmPassword
            }
            className="py-2 px-4 bg-ink hover:bg-ink-soft text-paper font-bold rounded-xl text-[12px] flex items-center justify-center gap-1.5 transition-all active:scale-[0.99] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {savingPassword ? (
              <Spinner size={14} />
            ) : (
              <Lock className="h-3.5 w-3.5" />
            )}
            Update password
          </button>
        </form>
      </div>
    </section>
  );

  const renderAccountBillingSection = () => (
    <section
      className="bg-surface border border-line rounded-2xl overflow-hidden gp-fade-up shrink-0"
      style={{ animationDelay: "120ms" }}
    >
      <div className="px-4 sm:px-5 py-3 border-b border-line flex items-center gap-2">
        <Receipt className="w-4 h-4 text-muted" />
        <h2 className="font-semibold text-ink text-[14px]">Billing history</h2>
      </div>
      {(() => {
        if (billingLoading) {
          return (
            <div className="divide-y divide-line">
              <BillingRowSkeleton />
            </div>
          );
        }
        const hasBilling =
          isPro &&
          (user.paymentProvider === "simulated" ||
            !!user.subscriptionPlan ||
            !!user.subscriptionStart ||
            isRealRazorpaySubscription(user));
        if (!hasBilling) {
          return (
            <div className="px-4 sm:px-5 py-8 text-center space-y-3">
              <span className="grid place-items-center w-10 h-10 mx-auto rounded-xl bg-surface-2 border border-line">
                <Receipt className="w-4 h-4 text-muted-2" />
              </span>
              <div className="space-y-0.5">
                <p className="text-sm font-semibold text-ink">
                  No billing history yet
                </p>
                <p className="text-[11px] text-muted leading-relaxed max-w-sm mx-auto">
                  {isPro
                    ? "Invoices appear here after checkout."
                    : "Pro subscribers get invoices here after checkout."}
                </p>
              </div>
              {!isPro && (
                <button
                  type="button"
                  onClick={() => setShowPricingModal(true)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-ink px-3.5 py-2 text-[12px] font-bold text-paper transition-all hover:bg-ink-soft active:scale-[0.98] cursor-pointer"
                >
                  View Pro plans
                </button>
              )}
            </div>
          );
        }
        const isYearly = user.subscriptionPlan === "yearly";
        const isSimulated = user.paymentProvider === "simulated";
        const amount = isSimulated ? "—" : isYearly ? "₹1,000" : "₹100";
        const cycle = isYearly ? "Yearly" : "Monthly";
        const dateStr = user.subscriptionStart
          ? new Date(user.subscriptionStart).toLocaleDateString("en-US", {
              dateStyle: "medium",
            })
          : "—";
        const paid =
          !isSimulated &&
          (user.subscriptionStatus === "active" ||
            user.subscriptionStatus === "cancelled");
        return (
          <div>
            <div className="hidden sm:grid grid-cols-[1fr_auto_auto_auto] gap-3 px-5 py-2 border-b border-line text-[10px] font-bold uppercase tracking-wider text-muted-2">
              <span>Description</span>
              <span>Date</span>
              <span className="text-right">Amount</span>
              <span className="text-right">Status</span>
            </div>
            <div className="px-4 sm:px-5 py-3 grid grid-cols-1 sm:grid-cols-[1fr_auto_auto_auto] gap-x-3 gap-y-2 items-center">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="grid place-items-center w-8 h-8 rounded-lg bg-ink text-paper shrink-0">
                  <Sparkles className="w-3.5 h-3.5" />
                </span>
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold text-ink truncate">
                    {isSimulated
                      ? "GetPGN Pro — Dev simulation"
                      : `GetPGN Pro — ${cycle}`}
                  </p>
                  <p className="text-[11px] text-muted">
                    {isSimulated ? "Dev upgrade" : "Current subscription"}
                  </p>
                </div>
              </div>
              <div className="text-xs text-muted gp-nums flex items-center gap-1.5 sm:block">
                <CalendarDays className="w-3.5 h-3.5 sm:hidden" />
                {dateStr}
              </div>
              <div className="text-sm font-semibold text-ink gp-nums sm:text-right">
                {amount}
              </div>
              <div className="sm:text-right">
                <span
                  className={`inline-flex items-center gap-1.5 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                    isSimulated
                      ? "bg-surface-2 border-line-strong text-muted"
                      : paid
                        ? "bg-positive-bg border-[#bbf7d0] text-positive"
                        : "bg-surface-2 border-line-strong text-muted"
                  }`}
                >
                  <span
                    className={`inline-flex h-1.5 w-1.5 rounded-full ${isSimulated ? "bg-muted-2" : paid ? "bg-positive" : "bg-muted-2"}`}
                  />
                  {isSimulated
                    ? "Simulated"
                    : paid
                      ? "Paid"
                      : user.subscriptionStatus || "Active"}
                </span>
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 px-4 sm:px-5 pb-4 pt-0.5">
              <p className="text-[11px] text-muted-2">
                {isSimulated
                  ? "Dev simulation — not a real charge."
                  : "Active subscription invoice."}
              </p>
              <div className="flex items-center gap-2">
                {isPro && (
                  <button
                    type="button"
                    onClick={handleDownloadInvoice}
                    disabled={downloadingInvoice}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-line-strong bg-paper px-3 py-1.5 text-[11px] font-semibold text-ink transition-colors hover:bg-surface-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {downloadingInvoice ? (
                      <Spinner size={12} />
                    ) : (
                      <Download className="w-3.5 h-3.5" />
                    )}
                    Download PDF
                  </button>
                )}
                {!isSimulated && (
                  <span className="inline-flex items-center gap-1 text-[11px] text-muted-2">
                    <RazorpayLogo showWordmark={false} /> Razorpay
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      })()}
    </section>
  );

  const renderAccountProBillingBlock = () => (
    <section
      className="bg-surface border border-line rounded-2xl overflow-hidden gp-fade-up shrink-0"
      style={{ animationDelay: "120ms" }}
    >
      <div className="px-4 sm:px-5 py-3 border-b border-line flex items-center gap-2">
        <CreditCard className="w-4 h-4 text-muted" />
        <h2 className="font-semibold text-ink text-[14px]">Billing</h2>
      </div>
      <div className="p-4 sm:px-5 sm:py-3.5">
        <dl className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-2.5 text-[12px]">
          <div>
            <dt className="text-[10px] text-muted font-bold uppercase tracking-wider">
              Plan
            </dt>
            <dd className="font-semibold text-ink flex items-center gap-1 mt-0.5">
              Pro · {user.subscriptionPlan || "paid"}
            </dd>
          </div>
          <div>
            <dt className="text-[10px] text-muted font-bold uppercase tracking-wider">
              Status
            </dt>
            <dd className="font-semibold text-ink mt-0.5">
              <span
                className={`inline-flex items-center gap-1 ${user.subscriptionStatus === "cancelled" ? "text-warn" : ""}`}
              >
                <span
                  className={`inline-flex h-1.5 w-1.5 rounded-full ${user.subscriptionStatus === "cancelled" ? "bg-warn" : "bg-positive"}`}
                />
                <span className="capitalize">
                  {user.subscriptionStatus || "active"}
                </span>
              </span>
            </dd>
          </div>
          <div>
            <dt className="text-[10px] text-muted font-bold uppercase tracking-wider">
              Provider
            </dt>
            <dd className="text-ink mt-0.5">
              {user.paymentProvider === "simulated" ? (
                <span className="text-muted">Dev simulation</span>
              ) : (
                <RazorpayLogo showWordmark={false} />
              )}
            </dd>
          </div>
          {user.subscriptionEnd && (
            <div>
              <dt className="text-[10px] text-muted font-bold uppercase tracking-wider">
                {user.subscriptionStatus === "cancelled"
                  ? "Access until"
                  : "Renews on"}
              </dt>
              <dd className="font-semibold text-ink gp-nums mt-0.5">
                {new Date(user.subscriptionEnd).toLocaleDateString("en-US", {
                  dateStyle: "medium",
                })}
              </dd>
            </div>
          )}
        </dl>
        {isRealRazorpaySubscription(user) && (
          <p className="mt-2 text-[10px] font-mono text-muted truncate">
            {user.subscriptionId}
          </p>
        )}
        {user.subscriptionStatus === "cancelled" && user.subscriptionEnd && (
          <p className="mt-2 text-[11px] text-muted leading-snug flex items-start gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 text-warn shrink-0 mt-px" />
            Cancelled — Pro access until{" "}
            {new Date(user.subscriptionEnd).toLocaleDateString("en-US", {
              dateStyle: "medium",
            })}
            .
          </p>
        )}
        {user.subscriptionStatus === "active" && (
          <button
            onClick={() => setShowCancelConfirm(true)}
            disabled={billingLoading}
            className="mt-2.5 py-1.5 px-3.5 bg-paper hover:bg-danger-bg border border-line-strong hover:border-[#fbcfe3] text-muted hover:text-danger font-medium rounded-lg text-[11px] transition-colors cursor-pointer disabled:opacity-50"
          >
            Cancel subscription
          </button>
        )}
      </div>
      <div className="border-t border-line">
        <div className="px-4 sm:px-5 py-2 border-b border-line flex items-center gap-2">
          <Receipt className="w-3.5 h-3.5 text-muted" />
          <h3 className="font-medium text-ink text-[13px]">History</h3>
        </div>
        {billingLoading ? (
          <BillingRowSkeleton />
        ) : (
          (() => {
            const isYearly = user.subscriptionPlan === "yearly";
            const isSimulated = user.paymentProvider === "simulated";
            const amount = isSimulated ? "—" : isYearly ? "₹1,000" : "₹100";
            const cycle = isYearly ? "Yearly" : "Monthly";
            const dateStr = user.subscriptionStart
              ? new Date(user.subscriptionStart).toLocaleDateString("en-US", {
                  dateStyle: "medium",
                })
              : "—";
            const paid =
              !isSimulated &&
              (user.subscriptionStatus === "active" ||
                user.subscriptionStatus === "cancelled");
            return (
              <>
                <div className="px-4 sm:px-5 py-2.5 grid grid-cols-[1fr_auto_auto] sm:grid-cols-[1fr_auto_auto_auto] gap-x-3 gap-y-1.5 items-center">
                  <div className="flex items-center gap-2 min-w-0">
                    <Sparkles className="w-3.5 h-3.5 text-ink shrink-0" />
                    <span className="text-[12px] font-medium text-ink truncate">
                      GetPGN Pro — {cycle}
                    </span>
                  </div>
                  <span className="text-[11px] text-muted gp-nums">{dateStr}</span>
                  <span className="text-[12px] font-semibold text-ink gp-nums sm:text-right">
                    {amount}
                  </span>
                  <span className="hidden sm:inline-flex justify-end">
                    <span
                      className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                        paid
                          ? "bg-positive-bg border-[#bbf7d0] text-positive"
                          : "bg-surface-2 border-line-strong text-muted"
                      }`}
                    >
                      <span
                        className={`inline-flex h-1.5 w-1.5 rounded-full ${paid ? "bg-positive" : "bg-muted-2"}`}
                      />
                      {isSimulated
                        ? "Simulated"
                        : paid
                          ? "Paid"
                          : user.subscriptionStatus || "Active"}
                    </span>
                  </span>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2 px-4 sm:px-5 pb-3.5">
                  <p className="text-[10px] text-muted-2">
                    {isSimulated
                      ? "Dev simulation invoice available for testing."
                      : "Tax invoice / receipt for your subscription."}
                  </p>
                  <button
                    type="button"
                    onClick={handleDownloadInvoice}
                    disabled={downloadingInvoice}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-ink px-3 py-1.5 text-[11px] font-bold text-paper transition-colors hover:bg-ink-soft active:scale-[0.98] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {downloadingInvoice ? (
                      <Spinner size={12} />
                    ) : (
                      <Download className="w-3.5 h-3.5" />
                    )}
                    Download PDF
                  </button>
                </div>
              </>
            );
          })()
        )}
      </div>
    </section>
  );

  const handleLogout = () => {
    forceLogout();
  };

  const handleSubmitFeedback = async (rating: number, comment: string) => {
    const res = await fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        rating,
        comment,
        gameId: activeGameId,
      }),
    });
    if (!res.ok) {
      const apiErr = await readApiErrorOrLogout(
        res,
        "We couldn't send your feedback. Please try again.",
      );
      if (apiErr === null) return;
      throw new Error(apiErr);
    }
    toast.success("Thanks for the feedback!");
  };

  const handleChangeUsername = async () => {
    const next = usernameInput.trim();
    if (savingUsername || next.length < 3 || next === user.username) return;
    setSavingUsername(true);
    try {
      const res = await fetch("/api/auth/change-username", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: next }),
      });
      if (!res.ok) {
        const apiErr = await readApiErrorOrLogout(
          res,
          "We couldn't update your username. Please try again.",
        );
        if (apiErr === null) return;
        throw new Error(apiErr);
      }
      const data = await res.json();
      const updated = typeof data.username === "string" ? data.username : next;
      // Server refreshed the session; reflect the new name everywhere in the UI.
      setUser((prev) => ({ ...prev, username: updated }));
      setUsernameInput(updated);
      toast.success("Username updated.");
    } catch (err: unknown) {
      toast.error(
        friendlyError(
          err,
          "We couldn't update your username. Please try again.",
        ),
      );
    } finally {
      setSavingUsername(false);
    }
  };

  const handleChangePassword = async () => {
    if (savingPassword) return;
    if (!currentPassword || !newPassword) {
      toast.error("Please enter your current and new password.");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("Your new password must be at least 6 characters.");
      return;
    }
    if (newPassword === currentPassword) {
      toast.error("Your new password must be different from your current one.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match.");
      return;
    }
    setSavingPassword(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      if (!res.ok) {
        const apiErr = await readApiErrorOrLogout(
          res,
          "We couldn't update your password. Please try again.",
        );
        if (apiErr === null) return;
        throw new Error(apiErr);
      }
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast.success("Password updated.");
    } catch (err: unknown) {
      toast.error(
        friendlyError(
          err,
          "We couldn't update your password. Please try again.",
        ),
      );
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-paper text-ink">
      {/* ── Header ── */}
      <header className="px-4 sm:px-6 md:px-8 bg-paper/90 backdrop-blur-md border-b border-line sticky top-0 z-40">
        <div
          className={`${DASHBOARD_SHELL} flex items-center justify-between h-16`}
        >
          <div className="flex items-center gap-4 sm:gap-7">
            <button
              onClick={() => setActiveTab("dashboard")}
              className="group/logo -ml-1.5 cursor-pointer rounded-lg px-2 py-1.5 transition-colors hover:bg-surface-2"
              title="Dashboard"
              aria-label="Go to dashboard"
            >
              <Logo wordmarkSize="md" />
            </button>
          </div>
          <div className="flex min-w-0 items-center gap-2 sm:gap-3.5">
            <div className="flex items-center gap-2 sm:gap-3">
              <button
                type="button"
                onClick={() => !isPro && setShowPricingModal(true)}
                className="hidden sm:flex items-center gap-2 rounded-full border border-line-strong bg-surface pl-2.5 pr-3 py-1.5 text-[12px] text-muted transition-colors hover:border-ink hover:text-ink cursor-pointer"
                title="Scan usage"
              >
                <span className="relative grid h-7 w-7 place-items-center">
                  <svg
                    className="absolute inset-0 h-7 w-7 -rotate-90"
                    viewBox="0 0 28 28"
                    aria-hidden="true"
                  >
                    <circle
                      cx="14"
                      cy="14"
                      r="11"
                      fill="none"
                      stroke="var(--color-line-strong)"
                      strokeWidth="2.5"
                    />
                    <circle
                      cx="14"
                      cy="14"
                      r="11"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeDasharray={`${scanUsage.limit > 0 ? (scanUsage.used / scanUsage.limit) * 69.1 : 0} 69.1`}
                      className={scansExhausted ? "text-danger" : "text-ink"}
                    />
                  </svg>
                  <span className="text-[10px] font-bold text-ink gp-nums">
                    {scanUsage.remaining > 99 ? "99+" : scanUsage.remaining}
                  </span>
                </span>
                <span>
                  <strong className="text-ink gp-nums">
                    {scanUsage.used.toLocaleString()}/
                    {scanUsage.limit.toLocaleString()}
                  </strong>{" "}
                  scans
                  {isPro ? (scanUsage.periodUnit === "year" ? "/yr" : "/mo") : ""}
                </span>
              </button>
              <button
                type="button"
                onClick={() => !isPro && setShowPricingModal(true)}
                className={`text-[12px] text-muted flex sm:hidden items-center gap-1.5 ${
                  !isPro ? "cursor-pointer rounded-full px-2 py-1 -mr-1 hover:bg-surface-2" : ""
                }`}
                title={!isPro ? "View plans" : "Scan usage"}
                aria-label={!isPro ? "View upgrade plans" : "Scan usage"}
              >
                <span className="inline-flex h-1.5 w-1.5 rounded-full bg-ink/70" />
                <strong className="text-ink gp-nums">
                  {scanUsage.used.toLocaleString()}/
                  {scanUsage.limit.toLocaleString()}
                </strong>
              </button>
              {!isPro && (
                <button
                  onClick={() => setShowPricingModal(true)}
                  disabled={billingLoading}
                  className="hidden sm:flex shrink-0 h-9 py-1.5 px-3 sm:px-4 bg-ink hover:bg-ink-soft text-paper font-bold rounded-lg text-[13px] whitespace-nowrap transition-all active:scale-[0.98] cursor-pointer disabled:opacity-50 items-center gap-1.5"
                >
                  Upgrade
                </button>
              )}
            </div>
            {isDevMode && (
              <div className="items-center gap-1.5 hidden md:flex">
                {!isPro ? (
                  <button
                    onClick={handleSimulateUpgrade}
                    disabled={billingLoading}
                    className="py-1 px-2 border border-line-strong bg-surface text-[11px] text-muted hover:text-ink rounded font-mono transition-colors cursor-pointer"
                    title="Dev upgrade simulator"
                  >
                    [Simulate Pro]
                  </button>
                ) : (
                  <button
                    onClick={handleSimulateDowngrade}
                    disabled={billingLoading}
                    className="py-1 px-2 border border-line-strong bg-surface text-[11px] text-muted hover:text-ink rounded font-mono transition-colors cursor-pointer"
                    title="Dev downgrade simulator"
                  >
                    [Simulate Free]
                  </button>
                )}
              </div>
            )}
            <UserMenu
              username={user.username}
              isPro={!!isPro}
              onAccount={() => setActiveTab("account")}
            />
            <span
              className="hidden md:block h-6 w-px bg-line-strong"
              aria-hidden="true"
            />
            <button
              type="button"
              onClick={() => setShowLogoutConfirm(true)}
              className="btn-ghost grid h-9 w-9 shrink-0 place-items-center rounded-lg p-0 text-muted hover:text-ink"
              title="Log out"
              aria-label="Log out"
            >
              <LogOut className="h-[18px] w-[18px]" />
            </button>
          </div>
        </div>
      </header>

      {/* ── Dashboard Body ── */}
      {activeTab === "dashboard" ? (
        <main
          className={`${DASHBOARD_SHELL} flex min-h-0 flex-1 gap-7 px-4 py-8 sm:px-6 md:px-8 ${appState === "upload" ? "relative" : "items-stretch"}`}
        >
          {/* Sidebar — hidden on upload; skeleton while session restores */}
          {!workspaceReady ? (
            <div className={`${appState === "upload" ? "hidden" : "hidden md:block"}`}>
              <SidebarRestoreSkeleton />
            </div>
          ) : (
          <aside
            className={`w-72 flex-shrink-0 flex-col gap-3 ${appState === "upload" ? "hidden" : "hidden md:flex"}`}
          >
            {renderSavedGamesPanel()}
            {appState !== "upload" && (
              <ExportPanel
                section="share"
                pgn={pgn}
                gameIsValid={gameIsValid}
                isPaid={!!isPro}
                gameId={activeGameId}
                initialSharedSlug={activeGameSharedSlug}
                onSave={handleSaveGame}
                onShare={handleShareGame}
              />
            )}
            {isPro && (
              <button
                onClick={handleReset}
                className="w-full py-2.5 bg-paper border border-line-strong hover:border-muted-2 hover:bg-surface-2 text-muted hover:text-ink rounded-xl text-xs font-semibold transition-all active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                New Scoresheet
              </button>
            )}
            {pgn && (
              <div className="flex flex-col gap-2">
                <span className="px-1 text-[11px] font-semibold uppercase tracking-wider text-muted-2">
                  Analyze elsewhere
                </span>
                <button
                  onClick={() =>
                    window.open(
                      `https://lichess.org/analysis/pgn/${encodeURIComponent(pgn)}`,
                      "_blank",
                      "noopener,noreferrer",
                    )
                  }
                  className="w-full py-2.5 bg-paper border border-line-strong hover:border-muted-2 hover:bg-surface-2 text-muted hover:text-ink rounded-xl text-[13px] font-semibold transition-all active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer"
                >
                  <SiLichess className="h-4 w-4" aria-hidden="true" />
                  Open in Lichess
                </button>
                <button
                  onClick={() =>
                    window.open(
                      `https://www.chess.com/analysis?pgn=${encodeURIComponent(pgn)}`,
                      "_blank",
                      "noopener,noreferrer",
                    )
                  }
                  className="w-full py-2.5 bg-paper border border-line-strong hover:border-[var(--color-positive)] hover:bg-surface-2 text-muted hover:text-positive rounded-xl text-[13px] font-semibold transition-all active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer"
                >
                  <SiChessdotcom
                    className="h-4 w-4 text-positive"
                    aria-hidden="true"
                  />
                  Open in Chess.com
                </button>
              </div>
            )}
            {appState === "review" &&
              turns.length > 0 &&
              (() => {
                const snap = getGameSnapshot();
                return (
                  <div className="bg-surface border border-line rounded-2xl p-4 gp-fade-up">
                    <div className="mb-3 flex items-center gap-2">
                      <LayoutGrid className="h-3.5 w-3.5 text-muted-2" />
                      <h2 className="font-semibold text-[11px] text-muted-2 uppercase tracking-widest">
                        Game snapshot
                      </h2>
                    </div>
                    <p
                      className="mb-3 truncate text-[13px] font-semibold text-ink"
                      title={snap.title}
                    >
                      {snap.title}
                    </p>
                    <dl className="space-y-2 text-[12px]">
                      <div className="flex items-center justify-between gap-3">
                        <dt className="text-muted">Turns</dt>
                        <dd className="font-medium text-ink gp-nums">
                          {snap.turnCount}
                        </dd>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <dt className="text-muted">Position</dt>
                        <dd className="font-medium text-ink gp-nums">
                          {snap.currentPly === 0
                            ? "Start"
                            : `${snap.currentPly} / ${snap.totalPlies}`}
                        </dd>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <dt className="text-muted">Valid moves</dt>
                        <dd className="font-medium text-positive gp-nums">
                          {snap.valid}
                        </dd>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <dt className="text-muted">Flagged</dt>
                        <dd
                          className={`font-medium gp-nums ${snap.flagged > 0 ? "text-warn" : "text-ink"}`}
                        >
                          {snap.flagged}
                        </dd>
                      </div>
                    </dl>
                    <div className="mt-3 flex flex-wrap gap-1.5 border-t border-line pt-3">
                      {snap.isSaved ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-line-strong bg-paper px-2 py-0.5 text-[11px] font-medium text-muted">
                          <Check className="h-3 w-3 text-positive" /> Saved
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full border border-line-strong bg-paper px-2 py-0.5 text-[11px] font-medium text-muted-2">
                          Unsaved
                        </span>
                      )}
                      {snap.isShared && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-line-strong bg-paper px-2 py-0.5 text-[11px] font-medium text-muted">
                          <Share2 className="h-3 w-3" /> Shared
                        </span>
                      )}
                      {snap.hasImage && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-line-strong bg-paper px-2 py-0.5 text-[11px] font-medium text-muted">
                          <ImageIcon className="h-3 w-3" /> Scoresheet
                        </span>
                      )}
                      {snap.gameIsValid ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-[#bbf7d0] bg-positive-bg px-2 py-0.5 text-[11px] font-medium text-positive">
                          Validated
                        </span>
                      ) : snap.flagged > 0 ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-warn-bg px-2 py-0.5 text-[11px] font-medium text-warn">
                          <AlertCircle className="h-3 w-3" /> Needs review
                        </span>
                      ) : null}
                    </div>
                  </div>
                );
              })()}
          </aside>
          )}

          {/* Main Workspace */}
          <section className="flex-1 flex flex-col min-w-0 h-full min-h-0 overflow-y-auto">
            {!workspaceReady ? (
              <WorkspaceRestoreSkeleton />
            ) : (
              <>
                {/* UPLOAD VIEW */}
                {appState === "upload" && (
                  <div
                    className={`flex w-full flex-col overflow-y-auto py-6 pr-1 sm:py-10 ${
                      isPro ? "items-stretch" : "items-center"
                    }`}
                  >
                    {renderUploadScreen()}
                  </div>
                )}

                {/* REVIEW WORKSPACE */}
                {appState === "review" && (
                  <div className="flex min-h-0 flex-1 flex-col gap-5 gp-fade-in pb-2">
                    {/* Toolbar */}
                    <div className="card flex shrink-0 items-center justify-between px-4 py-2.5">
                      <button
                        onClick={handleReset}
                        className="btn-secondary btn-sm"
                      >
                        <ArrowLeft className="h-3.5 w-3.5" /> Back to upload
                      </button>
                      <div className="flex items-center gap-2">
                        {gameIsValid ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#bbf7d0] bg-positive-bg px-2.5 py-1 text-[11px] font-medium text-positive">
                            <Check className="h-3 w-3" /> Validated game
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-warn-bg px-2.5 py-1 text-[11px] font-medium text-warn">
                            <AlertCircle className="h-3 w-3" /> Needs review
                          </span>
                        )}
                      </div>
                    </div>

                    <MobileShareBar
                      pgn={pgn}
                      isPaid={!!isPro}
                      gameId={activeGameId}
                      sharedSlug={activeGameSharedSlug}
                      onShare={handleShareGame}
                    />

                    {/* panel grid — mobile: board → move sheet → PGN; lg: board+PGN | move sheet */}
                    <div className="grid min-h-0 flex-1 grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,1.12fr)_minmax(0,0.98fr)]">
                      {/* Board */}
                      <div className="order-1 min-w-0 lg:col-start-1 lg:row-start-1">
                        <div
                          ref={boardCardRef}
                          className="card shrink-0 overflow-hidden p-0"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3 sm:px-5">
                            <div className="min-w-0 flex-1 space-y-1">
                              <h3 className="text-[15px] font-semibold text-ink">
                                Visual replay
                              </h3>
                              {(() => {
                                const { sideToMove, checkInfo, positionLabel } =
                                  getBoardStatus();
                                return (
                                  <div className="flex min-h-[22px] flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-muted">
                                    <span className="gp-nums">
                                      {positionLabel}
                                    </span>
                                    <span
                                      aria-hidden="true"
                                      className="text-muted-2"
                                    >
                                      ·
                                    </span>
                                    <span>{sideToMove} to move</span>
                                    {checkInfo && (
                                      <span
                                        className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
                                          checkInfo.type === "checkmate"
                                            ? "border-[#fbcfe3] bg-danger-bg text-danger"
                                            : "border-amber-200 bg-warn-bg text-warn"
                                        }`}
                                      >
                                        {checkInfo.type === "checkmate"
                                          ? "Checkmate"
                                          : "Check"}
                                      </span>
                                    )}
                                  </div>
                                );
                              })()}
                            </div>
                            <div className="flex shrink-0 items-center gap-2">
                              <BoardThemePicker
                                value={boardTheme}
                                onChange={setBoardTheme}
                                locked={!isPro}
                                onLockedClick={() => setShowPricingModal(true)}
                                inline
                              />
                              <SoundToggle />
                              <button
                                onClick={() =>
                                  setBoardOrientation(
                                    boardOrientation === "white"
                                      ? "black"
                                      : "white",
                                  )
                                }
                                className="btn-secondary btn-sm shrink-0"
                                title="Flip board perspective"
                              >
                                <RotateCw className="h-3.5 w-3.5" /> Flip board
                              </button>
                            </div>
                          </div>

                          <div className="bg-surface px-2 py-3 sm:px-3 sm:py-4">
                            <ChessBoard
                              key={`board-${activeGameId ?? "live"}`}
                              fen={getBoardFen()}
                              orientation={boardOrientation}
                              lastMove={getLastMove()}
                              checkSquare={getCheckHighlight()?.square}
                              checkType={getCheckHighlight()?.type}
                              interactive={!boardMoveLoading}
                              onMove={handleBoardMove}
                              boardTheme={isPro ? boardTheme : "slate"}
                              showColorPicker={false}
                              maxWidth="100%"
                            />
                            {/* <p className="mt-2.5 text-center text-[12px] text-muted-2">
                              Drag pieces to update notation
                            </p> */}
                          </div>
                        </div>
                      </div>

                      {/* Move sheet — directly under board on mobile; right column on lg */}
                      <div className="order-2 flex min-w-0 flex-col gap-2 lg:col-start-2 lg:row-start-1 lg:row-span-3">
                        <div
                          className="flex min-h-0 flex-col overflow-hidden lg:min-h-[280px]"
                          style={
                            boardCardHeight != null && boardCardHeight > 0
                              ? { height: boardCardHeight }
                              : undefined
                          }
                        >
                          <MoveList
                            key={`moves-${activeGameId ?? "live"}`}
                            turns={turns}
                            currentPlyIndex={currentPlyIndex}
                            onSelectPly={setCurrentPlyIndex}
                            onUpdateMove={handleUpdateMove}
                            onAddTurn={handleAddTurn}
                            onInsertPly={handleInsertPly}
                            onDeletePly={handleDeletePly}
                            onLoadText={handleLoadText}
                            pendingEditPly={pendingEditPly}
                            onConsumePendingEdit={() => setPendingEditPly(null)}
                          />
                        </div>

                        {pgn && (
                          <button
                            type="button"
                            onClick={() => setShowFeedbackModal(true)}
                            className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-line bg-surface py-2.5 text-[12px] font-medium text-muted transition-colors hover:border-line-strong hover:bg-surface-2 hover:text-ink cursor-pointer"
                          >
                            <MessageSquare className="h-3.5 w-3.5" />
                            Send feedback
                          </button>
                        )}
                      </div>

                      {!gameIsValid && (
                        <div className="order-3 flex shrink-0 items-start gap-3 rounded-[14px] border border-amber-200 bg-warn-bg px-4 py-3 text-[12.5px] lg:col-start-1 lg:row-start-2">
                          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-warn" />
                          <div className="space-y-1">
                            <span className="block font-semibold text-ink">
                              Almost there
                            </span>
                            <span className="block leading-relaxed text-muted">
                              Fix the flagged moves (shown in{" "}
                              <span className="font-medium text-warn">amber</span>
                              ). Tip: right-click any move for instant
                              suggestions — fixing the first one often clears
                              the rest.
                            </span>
                          </div>
                        </div>
                      )}

                      <div className="order-4 min-w-0 lg:col-start-1 lg:row-start-3">
                        <div className="hidden lg:block">
                          <ExportPanel
                            section="pgn"
                            pgn={pgn}
                            gameIsValid={gameIsValid}
                            isPaid={!!isPro}
                            gameId={activeGameId}
                            initialSharedSlug={activeGameSharedSlug}
                            onSave={handleSaveGame}
                            onShare={handleShareGame}
                          />
                        </div>
                        <div className="lg:hidden">
                          <ExportPanel
                            section="pgn"
                            compact
                            pgn={pgn}
                            gameIsValid={gameIsValid}
                            isPaid={!!isPro}
                            gameId={activeGameId}
                            initialSharedSlug={activeGameSharedSlug}
                            onSave={handleSaveGame}
                            onShare={handleShareGame}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </section>
        </main>
      ) : (
        /* Account Settings View */
        <main
          className={`flex-1 ${DASHBOARD_SHELL} px-4 sm:px-6 md:px-8 py-4 sm:py-5 flex flex-col gap-3 min-h-0 gp-fade-in`}
        >
          {/* Back to dashboard */}
          <button
            onClick={() => setActiveTab("dashboard")}
            className="shrink-0 inline-flex w-fit items-center gap-1.5 text-[13px] font-medium text-muted transition-colors hover:text-ink cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" /> Back to dashboard
          </button>

          {!isPro ? (
            <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_280px] lg:gap-4 min-h-0 flex-1">
              <div className="flex flex-col gap-3 min-w-0 min-h-0">
                {/* Identity card */}
                <section className="bg-surface border border-line rounded-2xl p-4 sm:p-5 gp-fade-up shrink-0">
                  <div className="flex items-center gap-3 sm:gap-4">
                    <UserAvatar name={user.username} size={48} />
                    <div className="min-w-0">
                      <h1 className="text-lg sm:text-xl font-extrabold text-ink tracking-tight truncate">
                        {user.username}
                      </h1>
                      <div className="mt-1 flex items-center gap-2 flex-wrap">
                        <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold py-0.5 px-2 rounded-full bg-surface-2 border border-line-strong text-muted">
                          Free plan
                        </span>
                        <span className="text-[11px] text-muted gp-nums">
                          · {user.scanCount}/{FREE_SCAN_LIMIT} scans
                        </span>
                      </div>
                    </div>
                  </div>
                </section>

                {renderAccountProfileSection()}

                <section
                  className="bg-surface border border-line rounded-2xl overflow-hidden gp-fade-up shrink-0"
                  style={{ animationDelay: "105ms" }}
                >
                  <div className="px-4 sm:px-5 py-3 border-b border-line flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-muted" />
                    <h2 className="font-semibold text-ink text-[14px]">
                      Your plan
                    </h2>
                  </div>
                  <div className="p-4 sm:px-5 sm:py-3">
                    <dl className="grid grid-cols-3 gap-3 text-[12px]">
                      <div>
                        <dt className="text-[10px] text-muted font-bold uppercase tracking-wider">
                          Plan
                        </dt>
                        <dd className="font-semibold text-ink mt-0.5">Free</dd>
                      </div>
                      <div>
                        <dt className="text-[10px] text-muted font-bold uppercase tracking-wider">
                          Scans
                        </dt>
                        <dd className="font-semibold text-ink gp-nums mt-0.5">
                          {user.scanCount}/{FREE_SCAN_LIMIT}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-[10px] text-muted font-bold uppercase tracking-wider">
                          Library
                        </dt>
                        <dd className="font-semibold text-muted flex items-center gap-1 mt-0.5">
                          <Lock className="w-3 h-3" />
                          Pro
                        </dd>
                      </div>
                    </dl>
                  </div>
                </section>

                {renderAccountBillingSection()}
              </div>

              <aside className="space-y-3 lg:sticky lg:top-20 lg:self-start shrink-0">
                {renderScanUsageMeter({ compact: true })}
                <section className="relative overflow-hidden bg-ink text-paper rounded-2xl p-4 gp-fade-up">
                  <div className="relative space-y-2.5">
                    <h2 className="font-extrabold text-[15px] tracking-tight">
                      Unlock Pro
                    </h2>
                    <p className="text-[11px] text-paper/70 leading-relaxed">
                      ₹100/mo · 100 scans or ₹1,000/yr · 1,000 scans, plus saved library and shareable replays.
                    </p>
                    <button
                      onClick={() => setShowPricingModal(true)}
                      className="w-full py-2 px-4 bg-paper hover:bg-surface text-ink font-bold rounded-xl text-[12px] transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      View plans
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </section>
                <FreeVsProTable
                  compact
                  onUpgrade={() => setShowPricingModal(true)}
                />
              </aside>
            </div>
          ) : (
            <div className="flex flex-col gap-3 min-h-0 flex-1">
              {/* Identity card */}
              <section className="bg-surface border border-line rounded-2xl p-4 sm:px-5 gp-fade-up shrink-0">
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="relative shrink-0">
                    <UserAvatar name={user.username} size={48} />
                    <span
                      className="absolute -bottom-0.5 -right-0.5 grid place-items-center w-5 h-5 rounded-full bg-paper border border-line-strong shadow-[var(--shadow-soft)]"
                      title="Pro member"
                    >
                      <Sparkles className="w-2.5 h-2.5 text-ink" />
                    </span>
                  </div>
                  <div className="min-w-0">
                    <h1 className="text-lg sm:text-xl font-extrabold text-ink tracking-tight truncate">
                      {user.username}
                    </h1>
                    <div className="mt-1 flex items-center gap-2 flex-wrap">
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold py-0.5 pl-1.5 pr-2 rounded-full bg-ink text-paper">
                        GetPGN Pro
                      </span>
                      {user.subscriptionPlan && (
                        <span className="text-[11px] text-muted capitalize">
                          · {user.subscriptionPlan} billing
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </section>

              {renderAccountProfileSection()}

              <section className="bg-surface border border-line rounded-2xl overflow-hidden gp-fade-up shrink-0">
                <div className="px-4 sm:px-5 py-3 border-b border-line flex items-center gap-2">
                  <History className="w-4 h-4 text-muted" />
                  <h2 className="font-semibold text-ink text-[14px]">
                    Scan usage
                  </h2>
                </div>
                <div className="p-4 sm:px-5 sm:py-4">
                  {renderScanUsageMeter({ compact: true })}
                </div>
              </section>

              {renderAccountProBillingBlock()}
            </div>
          )}
        </main>
      )}

      {/* ── Footer ── */}
      <footer className="border-t border-line bg-surface/25">
          <div
            className={`${DASHBOARD_SHELL} flex flex-col gap-4 px-4 py-6 sm:px-6 md:px-8`}
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <LegalTrustLinks className="max-w-md" />
              <nav
                className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[12px] sm:justify-end"
                aria-label="Legal and support"
              >
                <LegalLink href="/privacy">Privacy Policy</LegalLink>
                <LegalLink href="/refund">Refund Policy</LegalLink>
                <a href={`mailto:${LEGAL.contactEmail}`} className="legal-link">
                  {LEGAL.contactEmail}
                </a>
              </nav>
            </div>
            <div className="flex flex-col items-center justify-between gap-2 border-t border-line/50 pt-4 text-center sm:flex-row sm:text-left">
              <span className="text-[12px] text-muted">
                © {new Date().getFullYear()} GetPGN · Chess scoresheet digitizer
              </span>
              <span className="text-[12px] text-muted">
                Built for players &amp; coaches
              </span>
            </div>
          </div>
        </footer>

      <PricingModal
        open={showPricingModal}
        onClose={() => setShowPricingModal(false)}
        scanCount={user.scanCount}
        isPro={!!isPro}
        billingLoading={billingLoading}
        initialInterval={pricingInitialInterval}
        onSelectMonthly={() => handleCreateSubscription("monthly")}
        onSelectYearly={() => handleCreateSubscription("yearly")}
      />

      {appState === "extracting" && (
        <ExtractingOverlay
          loadingStep={loadingStep}
          chessPieceIndex={chessPieceIndex}
          reduceMotion={!!reduceMotion}
        />
      )}

      <ConfirmDialog
        open={showLogoutConfirm}
        title="Log out?"
        description="You'll need to sign in again to access your saved games."
        confirmLabel="Log out"
        cancelLabel="Cancel"
        onConfirm={() => {
          setShowLogoutConfirm(false);
          handleLogout();
        }}
        onCancel={() => setShowLogoutConfirm(false)}
      />

      <FeedbackModal
        open={showFeedbackModal}
        onClose={() => setShowFeedbackModal(false)}
        onSubmit={handleSubmitFeedback}
      />

      <ConfirmDialog
        open={!!pendingDelete}
        title="Delete this game?"
        description="This permanently removes the saved game and its share link. This can't be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        destructive
        loading={deleting}
        onConfirm={handleDeleteGame}
        onCancel={() => {
          if (!deleting) setPendingDelete(null);
        }}
      />

      <ConfirmDialog
        open={showCancelConfirm}
        title="Cancel subscription?"
        description="You'll keep full Pro access until the end of your current billing period. After that, your account returns to the Free plan."
        confirmLabel="Cancel subscription"
        cancelLabel="Keep Pro"
        destructive
        loading={billingLoading}
        onConfirm={handleCancelSubscription}
        onCancel={() => setShowCancelConfirm(false)}
      />
    </div>
  );
}
