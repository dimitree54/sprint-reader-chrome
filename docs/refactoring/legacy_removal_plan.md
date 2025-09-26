# Legacy Removal Plan — Sprint Reader

Last updated: 2025-09-26

Purpose
- Remove the remaining “legacy” reader code paths and bridges so the codebase is purely service‑oriented and store‑driven with a single rendering/control pathway.
- Align repository 1:1 with docs/refactoring/new_architecture.md.

Scope
- Reader UI only (background/popup/settings already conform to services).
- No functional changes; behavior remains identical. All changes must keep tests green (lint, typecheck, unit, e2e with real OPENAI_API_KEY).

Current Legacy Inventory (must be eliminated)
1) Rendering (partial coexistence)
   - File: src/reader/render.ts
   - Role: Legacy DOM rendering (word, status, progress, highlighting, positioning)
   - Status: Renderer (src/reader/ui/renderer.ts) augments updates, but render.ts still performs the main DOM update.

2) Playback loop bridge
   - File: src/reader/playback.ts
   - Role: Legacy timer scheduling and progression
   - Status: PlaybackService (src/reader/playback/playback.service.ts) currently bridges to legacy start/stop to preserve behavior.

3) Controls (legacy binding)
   - File: src/reader/controls.ts
   - Role: Direct DOM event bindings (play/pause, slider, theme)
   - Status: Store-bound controls glue exists (src/reader/ui/store-controls.ts) but event binding is still in legacy controls.ts.

4) Legacy state compatibility glue
   - File: src/reader/state/legacy-state-helpers.ts
   - Role: Compatibility helpers for timing settings and streaming state updates (getTimingSettings, start/reset streaming, appendWordItems, updateStreamingProgress)
   - Status: Used by:
     - src/reader/text.ts (getTimingSettings, resetStreamingState)
     - src/reader/streaming-text.ts (start/reset streaming, appendWordItems, updateStreamingProgress)
     - src/reader/streaming-text-processor.ts (getTimingSettings)

5) Mixed rendering responsibility
   - Renderer and render.ts both affect progress/status text; needs single source of DOM writes under renderer.

Non-Legacy (intentionally kept)
- Background modules using BrowserApiService and StorageService.
- TimingService, AIPreprocessingService, PlaybackService, Zustand store, and store-driven UI (renderer/store-controls).

Plan of Record (Phased, safe, reversible)

Phase A — Renderer Takeover (UI DOM updates)
A1. Port all DOM update logic from render.ts into renderer.ts as pure update functions (small, testable). Ensure:
    - Word display (including optimal letter wrap/highlight/positioning) via visual-effects functions.
    - Status text updates.
    - Progress bar and progress labels (streaming and non-streaming).
A2. Convert renderer.ts subscription to compute required deltas from the store and call the new DOM update functions exclusively.
A3. Remove calls to renderCurrentWord() from external modules; instead rely on renderer subscription to respond to state changes.
A4. Update tests if they directly call renderCurrentWord(); replace with state action sequences or use renderer helpers.
A5. Delete src/reader/render.ts after rg confirms zero references.

Acceptance for Phase A
- No direct imports of render.ts.
- UI updates driven entirely by renderer.ts subscription & helpers.
- All tests pass; visual checks validated.

Phase B — PlaybackService Full Ownership
B1. Move scheduling loop from playback.ts into PlaybackService (scheduleNextWord, calculateDelay with TimingService).
B2. Controls event handlers call PlaybackService.play()/pause()/restart() only (no legacy start/stop calls).
B3. Ensure store updates (index/status) are exclusively through store actions inside PlaybackService.
B4. Delete src/reader/playback.ts after rg confirms zero references.

Acceptance for Phase B
- No references to playback.ts; playback loops run through PlaybackService only.
- Timing behavior unchanged; e2e playback tests remain green.

Phase C — Store-Only State (remove legacy-state-helpers)
C1. Replace all uses of legacy-state-helpers.ts with direct store access or small pure mappers in situ:
    - getTimingSettings → derive from store.getState() (pause flags, wpm, chunkSize)
    - startStreaming/resetStreaming/append/updateProgress → store.setState()/actions
C2. Update modules:
    - src/reader/text.ts (remove getTimingSettings/resetStreamingState imports)
    - src/reader/streaming-text.ts (remove start/reset streaming, appendWordItems, updateStreamingProgress imports)
    - src/reader/streaming-text-processor.ts (remove getTimingSettings import)
C3. Delete src/reader/state/legacy-state-helpers.ts after rg confirms zero references.

Acceptance for Phase C
- No imports from legacy-state-helpers.ts; file deleted.
- Streaming and timing paths rely on store and services only.

Phase D — Controls Modernization
D1. Create src/reader/ui/controls.ts with explicit binding functions that:
    - Read from store (for initial UI state) and dispatch only store/PlaybackService actions.
    - Replace legacy controls.ts bindings.
D2. Update reader/index.ts to use new ui/controls.ts; remove legacy controls.ts import.
D3. Delete src/reader/controls.ts after rg confirms zero references.

Acceptance for Phase D
- All control events wired through ui/controls.ts and PlaybackService.
- UI remains reactive via renderer; tests green.

Cross-Cutting Tasks
- Docs updates per phase:
  - docs/architecture.md — remove legacy mentions; describe renderer as sole DOM updater; PlaybackService owns loop.
  - README.md — remove hybrid notes after A–D complete.
- Testing strategy per phase:
  - Run lint/typecheck/unit/e2e (with real OPENAI_API_KEY).
  - Manual smoke: playback start/pause/restart, WPM slider, theme toggle, streaming progress UI, background menu/shortcut flows.
- Rollback plan: each phase is self-contained; revert via git if regressions found.

Ownership & Timeline (suggested)
- Phase A: 1–2 days (port + verify visuals), high test focus.
- Phase B: 1 day (timer loop migration), ensure playback e2e stability.
- Phase C: 0.5–1 day (store direct usage), streaming regression checks.
- Phase D: 1 day (new controls, cleanup), integration polish.

Risk & Mitigation
- Risk: UI regressions from DOM migration → Mitigate with incremental renderer takeovers and visual validation.
- Risk: Playback cadence changes → Keep TimingService calculations identical; add unit checks if needed.
- Risk: Streaming edge cases → Validate with long text and poor network; ensure graceful fallbacks.

Exit Criteria (100% Legacy-Free)
- No src/reader/render.ts
- No src/reader/playback.ts
- No src/reader/controls.ts
- No src/reader/state/legacy-state-helpers.ts
- Renderer is sole DOM updater; PlaybackService owns loop; store is SoT everywhere.
- Docs match implementation and contain no hybrid notes.

