#!/usr/bin/env python3
import sys
import json
import chess
import chess.pgn
import io
import difflib

def clean_notation(notation):
    if not notation:
        return ""
    # Strip spaces and remove symbols like +, #, x, X, :, =, -, (, )
    cleaned = "".join(c for c in notation if c not in "+#xX:=()-")
    return cleaned.strip().lower()

def is_game_result(notation):
    if not notation:
        return False
    clean = notation.strip().replace(" ", "")
    # Check common result formats (including standalone score indicators at game termination)
    if clean in ["1-0", "0-1", "1/2-1/2", "1/2", "*", "1", "0", "1/2-1/2*", "1-0*", "0-1*"]:
        return True
    return False

def get_implied_piece_types(notation):
    clean = clean_notation(notation)
    if not clean:
        return set()
        
    # Check castling
    if clean in ["oo", "ooo", "00", "000"]:
        return {chess.KING}
        
    orig_clean = notation.strip()
    if not orig_clean:
        return set()
        
    first_orig = orig_clean[0]
    
    if first_orig == 'K':
        return {chess.KING}
    if first_orig == 'Q':
        return {chess.QUEEN}
    if first_orig == 'R':
        return {chess.ROOK}
    if first_orig == 'N':
        return {chess.KNIGHT}
    if first_orig == 'B':
        return {chess.BISHOP}
        
    # For lowercase letters:
    if first_orig in ['k', 'q', 'r', 'n', 'b']:
        # If it is lowercase 'b':
        if first_orig == 'b':
            # Is it a pawn push (like b3, b4) or a bishop move/pawn capture?
            # Remove symbols and see length
            stripped = "".join(c for c in orig_clean if c.isalnum())
            if len(stripped) == 2 and stripped[1].isdigit():
                # e.g. b3 -> pawn
                return {chess.PAWN}
            # Otherwise, could be Bishop or Pawn capture
            return {chess.BISHOP, chess.PAWN}
        
        # Other lowercase piece letters: could be piece or pawn capture/push if it's a file letter (e.g. d4, f4)
        piece_map = {
            'k': chess.KING,
            'q': chess.QUEEN,
            'r': chess.ROOK,
            'n': chess.KNIGHT,
        }
        pt = piece_map[first_orig]
        if first_orig in ['a', 'c', 'd', 'e', 'f', 'g', 'h']:
            return {pt, chess.PAWN}
        return {pt}
        
    # If it starts with any other letter or number:
    return {chess.PAWN}

def get_possible_notations(board, move):
    """
    Generate all common ways a player might write this legal move.
    """
    notations = []
    
    # 1. The standard SAN
    try:
        san = board.san(move)
        notations.append(san)
    except Exception:
        san = ""
    
    piece = board.piece_at(move.from_square)
    if not piece:
        return notations
        
    piece_symbol = piece.symbol().upper() if piece.piece_type != chess.PAWN else ""
    from_sq = chess.square_name(move.from_square)
    to_sq = chess.square_name(move.to_square)
    from_file = from_sq[0]
    from_rank = from_sq[1]
    
    # Castling special cases
    if piece.piece_type == chess.KING and abs(move.from_square - move.to_square) == 2:
        if to_sq in ["g1", "g8"]:
            notations.extend(["O-O", "0-0", "o-o", "oo", "00"])
        elif to_sq in ["c1", "c8"]:
            notations.extend(["O-O-O", "0-0-0", "o-o-o", "ooo", "000"])
            
    # Simple form (e.g. Nf3, e4)
    notations.append(f"{piece_symbol}{to_sq}")
    
    # Capture form (e.g. Nxb2, xe4)
    notations.append(f"{piece_symbol}x{to_sq}")
    
    # For pawns, only generate file capture forms if they are captures.
    # We do NOT generate simple pushes like "bb3" for b2-b3.
    if piece.piece_type == chess.PAWN:
        if board.is_capture(move):
            notations.append(f"{from_file}{to_sq}")
            notations.append(f"{from_file}x{to_sq}")
    else:
        # Pieces can always have source rank/file disambiguators
        notations.append(f"{piece_symbol}{from_file}{to_sq}")
        notations.append(f"{piece_symbol}{from_file}x{to_sq}")
        notations.append(f"{piece_symbol}{from_rank}{to_sq}")
        notations.append(f"{piece_symbol}{from_rank}x{to_sq}")
        notations.append(f"{piece_symbol}{from_sq}{to_sq}")
        notations.append(f"{piece_symbol}{from_sq}x{to_sq}")
    
    # Promotion forms
    if move.promotion:
        promo_piece = chess.piece_symbol(move.promotion).upper()
        base_notations = list(notations)
        for base in base_notations:
            notations.append(f"{base}={promo_piece}")
            notations.append(f"{base}{promo_piece}")
            notations.append(f"{base}({promo_piece})")
            notations.append(f"{base}/{promo_piece}")
            
    return notations

def find_candidates(board, notation):
    """
    Find all legal moves matching the user's notation, taking case-specific piece constraints into account.
    """
    cleaned_user = clean_notation(notation)
    if not cleaned_user:
        return []
        
    implied_types = get_implied_piece_types(notation)
    candidates = []
    
    for move in board.legal_moves:
        piece = board.piece_at(move.from_square)
        if not piece:
            continue
            
        # Strict piece type filter
        if piece.piece_type not in implied_types:
            continue
            
        possible_forms = get_possible_notations(board, move)
        for form in possible_forms:
            if clean_notation(form) == cleaned_user:
                candidates.append(move)
                break
                
    unique_candidates = []
    seen = set()
    for c in candidates:
        if c.uci() not in seen:
            unique_candidates.append(c)
            seen.add(c.uci())
            
    return unique_candidates

def get_similarity(s1, s2):
    c1 = clean_notation(s1)
    c2 = clean_notation(s2)
    return difflib.SequenceMatcher(None, c1, c2).ratio()

def get_suggestions(board, user_notation):
    if not user_notation:
        return []
        
    scored_moves = []
    for move in board.legal_moves:
        san = board.san(move)
        score = get_similarity(san, user_notation)
        scored_moves.append((score, san))
        
    # Sort by similarity score descending
    scored_moves.sort(key=lambda x: x[0], reverse=True)
    
    unique_suggestions = []
    for score, san in scored_moves:
        if san not in unique_suggestions:
            unique_suggestions.append(san)
        if len(unique_suggestions) >= 3:
            break
            
    return unique_suggestions

def normalize_notation(notation):
    if not notation:
        return ""
    # Normalize castling with zeroes to letter Os
    norm = notation.strip()
    if norm in ["0-0", "00"]:
        return "O-O"
    if norm in ["0-0-0", "000"]:
        return "O-O-O"
    return norm

def main():
    try:
        input_data = sys.stdin.read()
        if not input_data.strip():
            print(json.dumps({"error": "Empty input"}), flush=True)
            return

        data = json.loads(input_data)
        raw_moves = data.get("moves", [])
        
        print(f"[validate_chess] ── START ──────────────────────────────────", file=sys.stderr)
        print(f"[validate_chess] Received {len(raw_moves)} turn(s) to validate.", file=sys.stderr)
        
        board = chess.Board()
        validated_moves = []
        is_broken = False
        game_is_valid = True
        
        applied_moves = []
        stats = {"valid": 0, "illegal": 0, "ambiguous": 0, "missing": 0, "recovered": 0}
        
        for idx, turn in enumerate(raw_moves):
            move_number = turn.get("moveNumber", idx + 1)
            
            def get_notation(move_data):
                if not move_data:
                    return ""
                if isinstance(move_data, str):
                    return move_data.strip()
                if isinstance(move_data, dict):
                    val = move_data.get("notation")
                    if val is None:
                        val = move_data.get("original")
                    if val is not None:
                        if isinstance(val, str):
                            return val.strip()
                        return str(val).strip()
                return ""
                
            white_raw = turn.get("white")
            black_raw = turn.get("black")
            
            white_notation = get_notation(white_raw)
            black_notation = get_notation(black_raw)
            
            white_res = {
                "original": white_notation,
                "status": "missing",
                "san": None,
                "candidates": [],
                "suggestions": [],
                "fen": None,
                "uci": None
            }
            
            black_res = {
                "original": black_notation,
                "status": "missing",
                "san": None,
                "candidates": [],
                "suggestions": [],
                "fen": None,
                "uci": None
            }
            
            # Helper to validate a single move
            def validate_ply(notation, ply_res):
                nonlocal is_broken, game_is_valid
                
                color = ply_res.get("original", notation)
                
                # Check missing
                if not notation:
                    ply_res["status"] = "missing"
                    stats["missing"] += 1
                    print(f"[validate_chess] Move {move_number}: '{color}' → MISSING (empty notation)", file=sys.stderr)
                    is_broken = True
                    return False # board sequence broken
                    
                # Check if notation is a game termination result (like 1-0 or 1)
                if is_game_result(notation):
                    ply_res["status"] = "missing"
                    stats["missing"] += 1
                    print(f"[validate_chess] Move {move_number}: '{notation}' → SKIPPED (game result token)", file=sys.stderr)
                    is_broken = True
                    return False
                    
                if is_broken:
                    ply_res["status"] = "illegal"
                    stats["illegal"] += 1
                    print(f"[validate_chess] Move {move_number}: '{notation}' → ILLEGAL (board sequence broken by prior error)", file=sys.stderr)
                    game_is_valid = False
                    return False
                    
                normalized = normalize_notation(notation)
                
                # Step 1: Strict SAN Validation First
                try:
                    move = board.parse_san(normalized)
                    # Succeeded! The move is valid and not ambiguous.
                    san = board.san(move)
                    board.push(move)
                    applied_moves.append((move_number, san))
                    stats["valid"] += 1
                    print(f"[validate_chess] Move {move_number}: '{notation}' → VALID  (san={san})", file=sys.stderr)
                    
                    ply_res["status"] = "valid"
                    ply_res["san"] = san
                    ply_res["fen"] = board.fen()
                    ply_res["uci"] = move.uci()
                    return True
                except Exception:
                    # Parse failed, proceed to custom candidate matching
                    pass
                    
                # Step 2: Ambiguity & Error Detection
                candidates = find_candidates(board, notation)
                if len(candidates) == 1:
                    move = candidates[0]
                    san = board.san(move)
                    board.push(move)
                    applied_moves.append((move_number, san))
                    stats["valid"] += 1
                    print(f"[validate_chess] Move {move_number}: '{notation}' → VALID  (candidate match san={san})", file=sys.stderr)
                    
                    ply_res["status"] = "valid"
                    ply_res["san"] = san
                    ply_res["fen"] = board.fen()
                    ply_res["uci"] = move.uci()
                    return True
                elif len(candidates) > 1:
                    candidate_sans = [board.san(c) for c in candidates]
                    ply_res["status"] = "ambiguous"
                    ply_res["candidates"] = candidate_sans
                    # Recover by pushing first candidate
                    move = candidates[0]
                    san = board.san(move)
                    board.push(move)
                    applied_moves.append((move_number, san))
                    ply_res["san"] = san
                    ply_res["fen"] = board.fen()
                    ply_res["uci"] = move.uci()
                    stats["ambiguous"] += 1
                    stats["recovered"] += 1
                    print(f"[validate_chess] Move {move_number}: '{notation}' → AMBIGUOUS candidates={candidate_sans}  RECOVERED with '{san}'", file=sys.stderr)
                    game_is_valid = False
                    return True
                else:
                    # Illegal move - calculate closest suggestions
                    ply_res["status"] = "illegal"
                    suggestions = get_suggestions(board, notation)
                    ply_res["suggestions"] = suggestions
                    if suggestions:
                        try:
                            s_move = board.parse_san(suggestions[0])
                            board.push(s_move)
                            applied_moves.append((move_number, suggestions[0]))
                            ply_res["san"] = suggestions[0]
                            ply_res["fen"] = board.fen()
                            ply_res["uci"] = s_move.uci()
                            stats["illegal"] += 1
                            stats["recovered"] += 1
                            print(f"[validate_chess] Move {move_number}: '{notation}' → ILLEGAL  suggestions={suggestions}  RECOVERED with '{suggestions[0]}'", file=sys.stderr)
                            game_is_valid = False
                            return True
                        except Exception:
                            pass
                    stats["illegal"] += 1
                    print(f"[validate_chess] Move {move_number}: '{notation}' → ILLEGAL  suggestions={suggestions}  (no recovery possible, breaking chain)", file=sys.stderr)
                    is_broken = True
                    game_is_valid = False
                    return False
            
            # 1. Validate White's Move
            validate_ply(white_notation, white_res)
            
            # 2. Validate Black's Move (only run if sequence not broken by White)
            validate_ply(black_notation, black_res)
                    
            validated_moves.append({
                "moveNumber": move_number,
                "white": white_res,
                "black": black_res
            })
            
        # Final summary
        print(f"[validate_chess] ── SUMMARY ─────────────────────────────────", file=sys.stderr)
        print(f"[validate_chess] valid={stats['valid']}  illegal={stats['illegal']}  ambiguous={stats['ambiguous']}  missing={stats['missing']}  recovered={stats['recovered']}", file=sys.stderr)
        print(f"[validate_chess] game_is_valid={game_is_valid}  applied_moves={len(applied_moves)}", file=sys.stderr)
        
        # PGN Generation
        pgn_str = ""
        if applied_moves:
            pgn_game = chess.pgn.Game()
            pgn_game.headers["Event"] = "Digitized Scoresheet"
            pgn_game.headers["Site"] = "GetPGN"
            pgn_game.headers["Date"] = "????.??.??"
            pgn_game.headers["Round"] = "?"
            pgn_game.headers["White"] = "?"
            pgn_game.headers["Black"] = "?"
            
            temp_board = chess.Board()
            moves_list = []
            for move_num, san in applied_moves:
                move = temp_board.parse_san(san)
                moves_list.append(move)
                temp_board.push(move)
            pgn_game.add_line(moves_list)
                
            exporter = chess.pgn.StringExporter(headers=True, variations=False, comments=False)
            pgn_str = pgn_game.accept(exporter)
            
        print(json.dumps({
            "valid": game_is_valid,
            "moves": validated_moves,
            "pgn": pgn_str
        }, indent=2), flush=True)

    except Exception as e:
        print(json.dumps({"error": str(e)}), flush=True)

if __name__ == "__main__":
    main()
