"use client";

import React, { useState } from 'react';
import { 
  Upload, 
  Play, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  FileText, 
  ChevronDown, 
  ChevronUp, 
  Copy, 
  Check, 
  ArrowLeft,
  AlertTriangle,
  Loader2
} from 'lucide-react';
import Link from 'next/link';

interface IllegalMove {
  move_number: number;
  player: 'white' | 'black';
  notation: string;
  reason: string;
}

interface UncertainMove {
  move_number: number;
  player: 'white' | 'black';
  notation: string;
  reason?: string;
}

interface Move {
  move_number: number;
  white: string;
  black: string;
}

interface TestResult {
  filename: string;
  processing_time_ms: number;
  ai_time_ms: number;
  moves_detected: number;
  legal_moves_count: number;
  illegal_moves: IllegalMove[];
  uncertain_moves: UncertainMove[];
  generated_pgn: string;
  pgn_is_partial: boolean;
  moves: Move[];
  status: 'success' | 'failed';
  error?: string;
}

export default function TestHarness() {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [results, setResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [currentRunningIndex, setCurrentRunningIndex] = useState<number | null>(null);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setSelectedFiles(Array.from(e.target.files));
      setResults([]);
    }
  };

  // Helper to compress the image on the client side
  const compressImage = (file: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
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
          const ctx = canvas.getContext('2d');
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
            'image/jpeg',
            0.85
          );
        };
        img.onerror = (err) => reject(err);
      };
      reader.onerror = (err) => reject(err);
    });
  };

  const runPipeline = async () => {
    if (selectedFiles.length === 0) return;
    setIsRunning(true);
    setResults([]);

    const accumulatedResults: TestResult[] = [];

    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];
      setCurrentRunningIndex(i);

      try {
        // Preprocess image
        const compressedBlob = await compressImage(file);
        
        const formData = new FormData();
        formData.append('file', compressedBlob, file.name);

        const res = await fetch('/api/test-pipeline', {
          method: 'POST',
          body: formData,
        });

        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || 'Failed to process scoresheet');
        }

        const data = await res.json();
        accumulatedResults.push({
          filename: file.name,
          processing_time_ms: data.processing_time_ms,
          ai_time_ms: data.ai_time_ms || 0,
          moves_detected: data.moves_detected,
          legal_moves_count: data.legal_moves_count ?? data.moves_detected,
          illegal_moves: data.illegal_moves || [],
          uncertain_moves: data.uncertain_moves || [],
          generated_pgn: data.generated_pgn || '',
          pgn_is_partial: data.pgn_is_partial || false,
          moves: data.moves || [],
          status: 'success'
        });
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : 'Processing error';
        accumulatedResults.push({
          filename: file.name,
          processing_time_ms: 0,
          ai_time_ms: 0,
          moves_detected: 0,
          legal_moves_count: 0,
          illegal_moves: [],
          uncertain_moves: [],
          generated_pgn: '',
          pgn_is_partial: false,
          moves: [],
          status: 'failed',
          error: errMsg
        });
      }

      setResults([...accumulatedResults]);
    }

    setIsRunning(false);
    setCurrentRunningIndex(null);
  };

  const copyPgn = (pgn: string, index: number) => {
    navigator.clipboard.writeText(pgn);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  // Metrics calculations
  const totalProcessed = results.length;
  const successfulRuns = results.filter(r => r.status === 'success');
  const totalFailed = results.filter(r => r.status === 'failed').length;

  const avgProcessingTime = successfulRuns.length > 0
    ? successfulRuns.reduce((acc, r) => acc + r.processing_time_ms, 0) / successfulRuns.length
    : 0;

  const pgnGeneratedCount = successfulRuns.filter(r => r.generated_pgn).length;
  const pgnGenerationRate = totalProcessed > 0
    ? (pgnGeneratedCount / totalProcessed) * 100
    : 0;

  // Legal moves rate calculation: total valid moves vs illegal moves
  let totalDetectedMoves = 0;
  let totalIllegalMoves = 0;
  successfulRuns.forEach(r => {
    totalDetectedMoves += r.moves_detected;
    totalIllegalMoves += r.illegal_moves.length;
  });
  const legalMovesRate = totalDetectedMoves > 0
    ? ((totalDetectedMoves - totalIllegalMoves) / totalDetectedMoves) * 100
    : 0;

  const failureRate = totalProcessed > 0
    ? (totalFailed / totalProcessed) * 100
    : 0;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <header className="px-6 py-4 bg-slate-900/80 border-b border-slate-800 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 transition-colors">
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <h1 className="font-extrabold text-lg tracking-tight flex items-center gap-1.5 leading-none">
                GetPGN Core Pipeline Test Harness
                <span className="text-[10px] py-0.5 px-1.5 rounded bg-indigo-500/20 text-indigo-400 font-mono font-semibold tracking-wide uppercase">
                  Phase 1
                </span>
              </h1>
              <p className="text-xs text-slate-400 font-medium">Image → Moves → chess.js → PGN validation tracker</p>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 md:px-6 py-6 space-y-6">
        {/* Upload Panel */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl shadow-xl space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">Select Chess Scoresheets</h2>
          <div className="flex flex-col sm:flex-row gap-4 items-center">
            <label className="flex-1 w-full flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-800 hover:border-slate-700 bg-slate-950/40 rounded-xl cursor-pointer transition-colors group">
              <Upload className="w-8 h-8 text-indigo-400 group-hover:scale-105 transition-transform mb-2" />
              <span className="text-sm font-medium text-slate-300">Choose multiple files</span>
              <span className="text-xs text-slate-500 mt-1">Select 10+ clean, messy, or damaged sheets</span>
              <input 
                type="file" 
                multiple 
                accept="image/*" 
                onChange={handleFileChange}
                className="hidden"
                disabled={isRunning}
              />
            </label>
            <button
              onClick={runPipeline}
              disabled={isRunning || selectedFiles.length === 0}
              className="w-full sm:w-auto h-full py-5 px-8 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-850 text-white font-bold rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isRunning ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Running {currentRunningIndex !== null ? `${currentRunningIndex + 1}/${selectedFiles.length}` : ''}...</span>
                </>
              ) : (
                <>
                  <Play className="w-5 h-5 fill-white" />
                  <span>Run Pipeline ({selectedFiles.length} files)</span>
                </>
              )}
            </button>
          </div>

          {selectedFiles.length > 0 && (
            <div className="text-xs text-slate-400 flex items-center gap-2">
              <FileText className="w-4 h-4 text-indigo-400" />
              <span>Selected files: {selectedFiles.map(f => f.name).join(', ')}</span>
            </div>
          )}
        </div>

        {/* Dashboard Statistics */}
        {results.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex flex-col justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Processed</span>
              <span className="text-2xl font-black mt-2 text-indigo-400">{totalProcessed}</span>
            </div>
            
            <div className={`bg-slate-900 border border-slate-800 p-4 rounded-xl flex flex-col justify-between`}>
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Avg Processing Time</span>
              <span className="text-2xl font-black mt-2 flex items-center gap-1 text-slate-200">
                <Clock className="w-5 h-5 text-indigo-400" />
                {(avgProcessingTime / 1000).toFixed(2)}s
              </span>
              <span className="text-[10px] text-slate-500 mt-1">Target &lt; 5.00s</span>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex flex-col justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">PGN Generated</span>
              <span className={`text-2xl font-black mt-2 ${pgnGenerationRate >= 90 ? 'text-emerald-400' : 'text-amber-400'}`}>
                {pgnGenerationRate.toFixed(1)}%
              </span>
              <span className="text-[10px] text-slate-500 mt-1">Target &gt; 90.0%</span>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex flex-col justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Legal Move Rate</span>
              <span className={`text-2xl font-black mt-2 ${legalMovesRate >= 95 ? 'text-emerald-400' : 'text-amber-400'}`}>
                {legalMovesRate.toFixed(1)}%
              </span>
              <span className="text-[10px] text-slate-500 mt-1">Target &gt; 95.0%</span>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex flex-col justify-between col-span-2 md:col-span-1">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Complete Failure Rate</span>
              <span className={`text-2xl font-black mt-2 ${failureRate <= 5 ? 'text-emerald-400' : 'text-red-400'}`}>
                {failureRate.toFixed(1)}%
              </span>
              <span className="text-[10px] text-slate-500 mt-1">Target &lt; 5.0%</span>
            </div>
          </div>
        )}

        {/* Results List */}
        {results.length > 0 && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
            <div className="px-5 py-4 bg-slate-950 border-b border-slate-800">
              <h3 className="font-semibold text-sm text-slate-200">Individual Run Results</h3>
            </div>
            
            <div className="divide-y divide-slate-800/60">
              {results.map((res, idx) => (
                <div key={idx} className="flex flex-col">
                  {/* Summary Bar */}
                  <div 
                    onClick={() => setExpandedIndex(expandedIndex === idx ? null : idx)}
                    className="px-5 py-3.5 flex items-center justify-between hover:bg-slate-800/10 cursor-pointer select-none transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {res.status === 'failed' ? (
                        <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                      ) : res.generated_pgn ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                      ) : (
                        <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0" />
                      )}
                      <div>
                        <span className="text-sm font-semibold text-slate-200">{res.filename}</span>
                        <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                          <span>Time: {(res.processing_time_ms / 1000).toFixed(2)}s</span>
                          <span>•</span>
                          <span>Moves: {res.moves_detected}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      {res.status === 'failed' ? (
                        <span className="text-xs bg-red-500/10 border border-red-500/20 text-red-400 px-2 py-0.5 rounded font-semibold uppercase">Failed</span>
                      ) : res.generated_pgn && !res.pgn_is_partial ? (
                        <span className="text-xs bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded font-semibold uppercase">PGN Valid</span>
                      ) : res.pgn_is_partial ? (
                        <span className="text-xs bg-amber-500/10 border border-amber-500/20 text-amber-400 px-2 py-0.5 rounded font-semibold uppercase">Partial PGN</span>
                      ) : (
                        <span className="text-xs bg-red-500/10 border border-red-500/20 text-red-400 px-2 py-0.5 rounded font-semibold uppercase">Illegal Moves</span>
                      )}
                      
                      {expandedIndex === idx ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                    </div>
                  </div>

                  {/* Expanded Content */}
                  {expandedIndex === idx && (
                    <div className="px-5 pb-5 pt-2 border-t border-slate-850 bg-slate-950/20 space-y-4 text-xs font-mono animate-in fade-in duration-200">
                      {res.status === 'failed' ? (
                        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-lg">
                          <span className="font-semibold block">Execution Failure:</span>
                          {res.error}
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Details & Reports */}
                          <div className="space-y-3">
                            <div className="bg-slate-900 border border-slate-800 p-3 rounded-lg space-y-2">
                              <span className="text-slate-400 font-semibold block text-[10px] uppercase tracking-wider">Validation Report</span>
                              <div className="space-y-1 text-slate-300">
                                <div>Moves Detected: {res.moves_detected}</div>
                                <div>Legal Moves: {res.legal_moves_count}</div>
                                <div>Illegal Moves: {res.illegal_moves.length}</div>
                                <div>Uncertain Moves: {res.uncertain_moves.length}</div>
                              </div>
                            </div>

                            {/* Illegal moves list */}
                            {res.illegal_moves.length > 0 && (
                              <div className="bg-red-500/5 border border-red-500/10 p-3 rounded-lg space-y-1.5">
                                <span className="text-red-400 font-semibold block text-[10px] uppercase tracking-wider">Illegal / Doubtful Moves detected</span>
                                <div className="space-y-1 text-slate-400 max-h-[120px] overflow-y-auto">
                                  {res.illegal_moves.map((m, mIdx) => (
                                    <div key={mIdx} className="flex gap-2">
                                      <span className="text-red-400 font-bold">{m.move_number}.{m.player === 'white' ? 'w' : 'b'} ({m.notation}):</span>
                                      <span>{m.reason}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Uncertain moves list */}
                            {res.uncertain_moves.length > 0 && (
                              <div className="bg-amber-500/5 border border-amber-500/10 p-3 rounded-lg space-y-1.5">
                                <span className="text-amber-400 font-semibold block text-[10px] uppercase tracking-wider">Uncertain OCR Extractions</span>
                                <div className="space-y-1 text-slate-400 max-h-[120px] overflow-y-auto">
                                  {res.uncertain_moves.map((m, mIdx) => (
                                    <div key={mIdx} className="flex gap-2">
                                      <span className="text-amber-400 font-bold">{m.move_number}.{m.player} ({m.notation}):</span>
                                      <span>{m.reason || 'Handwriting unclear'}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Move List Sheet */}
                            <div className="bg-slate-900 border border-slate-800 p-3 rounded-lg">
                              <span className="text-slate-400 font-semibold block text-[10px] uppercase tracking-wider mb-2">Move List</span>
                              <div className="grid grid-cols-3 gap-y-1 gap-x-4 max-h-[180px] overflow-y-auto text-slate-300">
                                {res.moves.map((m, mIdx) => (
                                  <React.Fragment key={mIdx}>
                                    <span className="text-slate-500">{m.move_number}.</span>
                                    <span>{m.white || '-'}</span>
                                    <span>{m.black || '-'}</span>
                                  </React.Fragment>
                                ))}
                              </div>
                            </div>
                          </div>

                          {/* PGN Output */}
                          <div className="flex flex-col h-full min-h-[200px]">
                            <div className="bg-slate-900 border border-slate-800 rounded-lg p-3 flex flex-col flex-1">
                              <div className="flex justify-between items-center border-b border-slate-800 pb-2 mb-2">
                                <span className="text-slate-400 font-semibold text-[10px] uppercase tracking-wider">Generated PGN</span>
                                {res.generated_pgn && (
                                  <button
                                    onClick={() => copyPgn(res.generated_pgn, idx)}
                                    className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded transition-colors flex items-center gap-1"
                                    title="Copy PGN"
                                  >
                                    {copiedIndex === idx ? (
                                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                                    ) : (
                                      <Copy className="w-3.5 h-3.5" />
                                    )}
                                  </button>
                                )}
                              </div>
                              {res.generated_pgn ? (
                                <>
                                  {res.pgn_is_partial && (
                                    <div className="text-[10px] bg-amber-500/10 border border-amber-500/20 text-amber-400 px-2 py-1 rounded mb-2">
                                      ⚠ Partial PGN — valid moves up to illegal move {res.illegal_moves.find(m => !m.reason.includes('already broken'))?.move_number}
                                    </div>
                                  )}
                                  <textarea
                                    readOnly
                                    value={res.generated_pgn}
                                    className="w-full flex-1 bg-slate-950 border-0 outline-none text-slate-300 text-xs p-2 rounded font-mono resize-none focus:ring-0"
                                  />
                                </>
                              ) : (
                                <div className="flex-1 flex items-center justify-center text-slate-500 text-center p-4">
                                  No PGN generated. Game contains illegal moves.
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
