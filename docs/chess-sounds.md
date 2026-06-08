# Chess move sounds

GetPGN plays subtle move feedback during replay and board navigation, similar to modern chess sites, using **royalty-free CC0 audio** only.

## Sound sources

| Event | File | Original (Kenney UI Audio) | License |
|-------|------|----------------------------|---------|
| Normal move | `public/sounds/chess/move.wav` | `click1.wav` | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) |
| Capture | `public/sounds/chess/capture.wav` | `click2.wav` | CC0 |
| Check | `public/sounds/chess/check.wav` | `switch14.wav` | CC0 |
| Castling | `public/sounds/chess/castle.wav` | `switch7.wav` | CC0 |
| Promotion | `public/sounds/chess/promotion.wav` | `switch9.wav` | CC0 |
| Game end | `public/sounds/chess/game-end.wav` | `click3.wav` | CC0 |

- **Official pack:** https://kenney.nl/assets/ui-audio  
- **License file:** `public/sounds/chess/LICENSE.txt`  
- **Mapping notes:** `public/sounds/chess/SOURCES.md`

### Explicitly excluded

- **Lichess “standard” sounds** — marked non-free in [lila COPYING.md](https://github.com/lichess-org/lila/blob/master/COPYING.md)
- **Chess.com** — proprietary
- **CC BY-NC / attribution-heavy packs** — avoided for simple commercial deployment

Kenney’s CC0 pack requires **no attribution**; crediting Kenney is optional.

## Architecture

```
public/sounds/chess/*.wav
        ↓ preload (once)
src/lib/chessSounds.ts
        ↓ classifyMoveSound() via chess.js
src/hooks/useChessPlySounds.ts
        ↓ currentPlyIndex changes
DashboardClient / ShareClient
        ↓
src/components/ui/SoundToggle.tsx (mute preference)
```

### `src/lib/chessSounds.ts`

- Preloads and caches `HTMLAudioElement` instances per event type
- Single active playback channel (stops previous sound to avoid spam)
- `unlockAudio()` on first pointer/keyboard interaction (autoplay policy)
- Mute preference in `localStorage` key `getpgn-chess-sounds-muted` (`"1"` = muted)
- Default: **sounds enabled**

**Public API**

| Function | Purpose |
|----------|---------|
| `playMoveSound(info)` | Play sound for a move from FEN + SAN/UCI |
| `playMoveSoundForPly(turns, plyIndex)` | Resolve ply from validated turn list |
| `classifyMoveSound(info)` | Return event type without playing |
| `setMuted(boolean)` / `isMuted()` / `toggleMuted()` | User preference |
| `unlockAudio()` / `preloadSounds()` | Browser compatibility |

### Event priority

One sound per move, highest priority wins:

1. **Promotion** (`move.promotion`)
2. **Game end** (checkmate / stalemate after move)
3. **Check** (`chess.inCheck()` after move)
4. **Capture** (`flags` includes `c` or `e`)
5. **Castle** (`flags` includes `k` or `q`)
6. **Normal move**

Detection uses chess.js on the position **before** the ply, matching flags documented in the [chess.js move object](https://github.com/jhlywa/chess.js).

## Integration points

Sounds fire when `currentPlyIndex` changes (via `useChessPlySounds`):

- Move list ply clicks
- First / previous / next / last controls (`MoveList`)
- Auto-play (`MoveList` interval + ShareClient timer)
- Dashboard review board (including drag-to-move after validation)
- Public share replay page

Mute toggle: **`SoundToggle`** in the board toolbar (dashboard + share).

## User preference

- **Storage:** `localStorage` → `getpgn-chess-sounds-muted`
- **UI:** Speaker icon (`Volume2` / `VolumeX`), `aria-pressed`, keyboard accessible
- **Default:** Unmuted; preference persists across sessions

## Browser compatibility

- Audio unlocks after first user interaction (`pointerdown` / `keydown`)
- Failed `play()` promises are swallowed (no console noise)
- If audio is unavailable, replay continues silently

## Performance

- Six small WAV files (~135 KB total), loaded once per event type
- No network requests after first load (same-origin static files)
- Previous sound stopped before the next plays

## Future extensions

- Optional wooden-piece SFX pack (replace WAV mapping only)
- Separate volume slider per event type
- Sound on live OCR validation (currently replay/navigation only)
- Web Audio API for tighter latency and shared gain node
- Per-user server-side preference (currently client-only)

## Testing checklist

- [ ] First visit: sounds play after one click/keypress on the page
- [ ] Normal move, capture, check, castle, promotion each play distinct (quiet) sounds
- [ ] Checkmate / stalemate plays game-end sound
- [ ] Move list navigation (first/prev/next/last) triggers sounds
- [ ] Auto-play triggers sounds each ply
- [ ] Share page replay matches dashboard behavior
- [ ] Dragging a piece on the dashboard board plays sound after move applies
- [ ] Mute toggle persists after refresh
- [ ] No console errors when autoplay blocked
- [ ] Only one sound at a time during fast clicking
