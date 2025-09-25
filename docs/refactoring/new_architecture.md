# Sprint Reader Target Architecture

## 1. Document Purpose

### 1.1 Overview
This document defines the target service-oriented architecture for the Sprint Reader browser extension. It guides the ongoing refactor from the legacy modular layout to a layered system built around core services, a dedicated reader domain, and UI surfaces that consume a shared state store.

The document must be revisited at the end of every refactoring phase. When code, tooling, or runtime assumptions diverge, update this document before drafting new stories so that the development backlog always reflects the current direction.

### 1.2 Change Log
| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2025-09-26 | 1.0 | Initial target architecture baseline | Scrum Team |

## 2. Architecture Goals & Non-Negotiables

### 2.1 Goals Summary
- **Primary Objective:** Transition Sprint Reader to a service-oriented architecture that cleanly separates browser/platform concerns, reader domain logic, and UI rendering while remaining fully operational after every phase.
- **Supporting Goals:**
  - Improve unit-testability of timing, playback, and preprocessing logic.
  - Ensure background, popup, settings, and reader contexts share the same platform abstractions.
  - Unlock incremental delivery by isolating state management and rendering behind stable contracts.
  - Preserve support for streaming AI preprocessing with clear extension points for future providers.

### 2.2 Guardrails
- Maintain extension functionality after each refactoring phase; `npm run lint`, `npm run typecheck`, and `npm test` must pass before merging.
- Preserve MV3 compatibility across Chrome, Firefox, and Safari distributions.
- Keep shared TypeScript modules framework-agnostic, side-effect free, and portable across contexts.
- Do not regress reader performance targets (warm start under 700 ms, frame budget under 16 ms during playback).
- Investigate and fix root causes—no silent fallbacks or partially implemented features.

## 3. Target Architecture Overview

### 3.1 Technical Summary
The target architecture adopts a layered service composition. Core platform services abstract browser APIs, storage, and messaging so that all execution contexts can be tested in isolation. The reader domain consolidates state, playback, timing, and AI preprocessing behind explicit services coordinated by a Zustand store. UI layers (reader renderer, popup, settings) subscribe to the store and dispatch events through action creators rather than mutating globals. Background, content, and popup contexts communicate through typed messaging contracts to keep selection, preferences, and window state in sync while remaining resilient to streaming AI availability.

### 3.2 Architecture Diagram
```mermaid
graph TD
    subgraph Core Services
        BrowserApi[BrowserApiService]
        Storage[StorageService]
        Contracts[Message Contracts]
    end

    subgraph Background Context
        Background[Background Service Worker]
        Lifecycle[Install & Update Flows]
    end

    subgraph Content Scripts
        Content[Content Selection Capture]
    end

    subgraph Reader Domain
        Store[Reader Store (Zustand)]
        Playback[PlaybackService]
        Timing[TimingService]
        AI[AIPreprocessingService]
    end

    subgraph Reader UI
        Renderer[Renderer]
        Controls[UI Controls]
    end

    subgraph Popup & Settings
        Popup[Popup UI]
        Settings[Settings UI]
    end

    Content --> Background
    Content --> Store
    Background --> BrowserApi
    BrowserApi --> Background
    Background --> Storage
    Storage --> Background
    Background --> Contracts
    Contracts --> Popup
    Contracts --> Settings
    Popup --> Contracts
    Settings --> Contracts
    Store --> Renderer
    Controls --> Store
    Renderer --> Store
    Playback --> Store
    Store --> Playback
    Timing --> Store
    Store --> Timing
    AI --> Timing
    Store --> AI
```

### 3.3 Runtime Contexts
- **Background Service Worker:** Owns lifecycle orchestration, context menus, and reader window bootstrapping using BrowserApiService and StorageService.
- **Content Scripts:** Capture text selections, normalise DOM snippets, and forward structured payloads through typed messages.
- **Reader UI:** Displays RSVP playback, subscribes to the reader store, and renders deterministic DOM updates without reaching into services directly.
- **Popup & Settings:** Provide quick actions and configuration surfaces that consume the same core services for storage and messaging.
- **Shared Core:** Contains platform abstractions, domain contracts, and pure utilities that can be consumed by any execution context.

## 4. Component Responsibilities

### 4.1 Core Services Layer
- **BrowserApiService:** Encapsulates `browser`/`chrome` messaging, window management, tabs, and permissions with promise-based helpers suitable for tests.
- **StorageService:** Centralises syncing preferences, API keys, and ephemeral reader metadata on top of BrowserApiService, exposing typed getters/setters.
- **Messaging Contracts:** Defines request/response payloads and event channels to keep background, content, popup, and reader communications type-safe.

### 4.2 Reader Domain Layer
- **State Store (Zustand):** Source of truth for selection, playback status, preferences, streaming progress, and error states; exposes actions consumed by UI and services.
- **PlaybackService:** Runs the RSVP timing loop, controls word advancement, coordinates with TimingService, and updates store state rather than manipulating DOM.
- **TimingService:** Provides deterministic calculations for chunking, word duration, and progress metrics; implemented as pure functions with comprehensive unit tests.
- **AIPreprocessingService:** Abstracts provider selection, streaming orchestration, and fallbacks, returning canonical tokens to TimingService and the store.

### 4.3 UI Layer
- **Renderer:** Subscribes to the reader store to render words, progress indicators, and status changes, batching DOM updates to respect frame budgets.
- **UI Controls:** Binds DOM events to store actions (play/pause, seek, WPM, theme) without referencing implementation details from services.
- **Shared Styling:** Maintains scoped CSS modules and theming tokens consumed by renderer and popup surfaces.

### 4.4 Background & Content Integration
- **Selection Pipeline:** Content scripts send structured selections to background; StorageService snapshots the payload, and reader bootstraps selection from the store.
- **Preferences Sync:** StorageService synchronises user preferences across popup, settings, and reader contexts with optimistic UI updates.
- **Window Lifecycle:** BrowserApiService manages reader window creation, focusing, teardown, and Playwright hooks.

### 4.5 External Interfaces
- **OpenAI Provider:** Streaming-enabled preprocessing that enriches text and surfaces progress events through the store.
- **Fallback Providers:** Deterministic passthrough processors that share the same interface and logging for diagnostics.
- **Localisation & Future Providers:** Reserved interface slots for regional translators or on-device AI integrations without disrupting existing services.

## 5. Data & Storage Model
- **Persistent Data:** Reader preferences, OpenAI API key, feature toggles, and onboarding flags stored via StorageService in extension storage.
- **In-Memory State:** Active selection, RSVP queue, playback status, streaming progress, and UI flags stored in the reader Zustand store.
- **Cross-Context Messaging:** Structured message contracts for selection updates, playback commands, preprocessing results, and window lifecycle events.
- **Schema Contracts:** TypeScript interfaces living under `src/common/` that define payload shapes shared across services and tests.

## 6. Quality Attributes & Operational Concerns

### 6.1 Performance
- **Reader Start Time:** Target under 700 ms from invocation to first rendered word by eager-loading selection and deferring non-critical services.
- **Frame Budget:** Keep repaint work under 16 ms per frame through batched store subscriptions and minimal DOM diffing.
- **Streaming Responsiveness:** Surface progress updates within 250 ms of provider events and allow immediate playback on available chunks.

### 6.2 Reliability & Resilience
- **Offline Behaviour:** Seamlessly fall back to local preprocessing with transparent messaging to the user; no crashes on offline events.
- **Error Handling:** Report service failures through store error channels and provide actionable retry paths without silent suppression.
- **Telemetry:** Emit structured logs in development and test environments to validate streaming, timing, and error flows.

### 6.3 Security & Privacy
- **Secrets Management:** Store OpenAI keys using Chrome storage with `chrome.storage.sync` encryption and never log secrets.
- **Data Handling:** Avoid persisting selections beyond the active session; redact PII from diagnostics.
- **Permission Model:** Maintain minimal permission footprint (activeTab, storage) and document justification in manifest metadata.

## 7. Migration & Release Strategy

### 7.1 Phase Breakdown
| Phase | Focus | Key Deliverables | Verification |
|-------|-------|------------------|--------------|
| 0 | Baseline hardening | Stricter TypeScript config, Vitest scaffolding, future directory layout | lint → typecheck → Vitest smoke → Playwright regression |
| 1 | Core services abstraction | BrowserApiService, StorageService, project-wide adoption | lint → typecheck → service unit tests → Playwright |
| 2 | Reader state foundation | Introduce Zustand store, sync legacy state | lint → typecheck → store unit tests → Playwright |
| 3 | Domain services extraction | TimingService, AIPreprocessingService, legacy delegation | lint → typecheck → service unit tests → Playwright |
| 4 | UI isolation | Renderer & UI Controls backed by store | lint → typecheck → renderer integration tests → Playwright |
| 5 | Playback consolidation | PlaybackService, remove legacy state mutations | lint → typecheck → playback unit/integration tests → Playwright |
| 6 | Cleanup & finishing | Background service alignment, repository hygiene, documentation | lint → typecheck → Playwright → artefact review |

Every phase ends with a working extension build. Do not merge until regression suites succeed and manual smoke verifies RSVP playback, popup controls, and settings persistence.

### 7.2 Release Guardrails
- **Verification Gates:** Sequentially execute `npm run lint`, `npm run typecheck`, relevant unit suites (`npm run test:unit` when introduced), and `npm test` for Playwright before tagging a release.
- **Rollback Plan:** Retain feature branches per phase; if regressions surface post-release, redeploy previous tag and hotfix via cherry-pick.
- **Feature Flags / Kill Switches:** Use store-level toggles for experimental streaming features; expose a background-controlled flag to disable AI providers rapidly.

## 8. Testing & Tooling
- **Unit Tests:** Vitest covers TimingService, PlaybackService, and StorageService using mocked BrowserApi dependencies.
- **Integration & Component Tests:** DOM-oriented tests validate renderer-store interactions and popup/settings flows.
- **End-to-End Tests:** Playwright suite runs across Chrome equivalent harness, verifying selection capture through playback, settings sync, and AI fallback behaviour.
- **Developer Tooling:** ESLint, TypeScript strict mode, Prettier, and npm scripts for build/test; CI should cache `node_modules` and execute the verification chain per phase.

## 9. Risks & Open Questions
- **Known Risks:** Introducing Zustand without full migration may cause dual-state divergence; streaming providers can introduce race conditions; background refactor might break automated tests relying on globals.
- **Mitigations:** Mirror legacy state into the store until cut-over, instrument streaming queue handling, retain Playwright hooks via controlled exports, and add unit coverage for new services.
- **Open Questions:** Confirm target browsers for MV3 parity, decide on telemetry strategy for AI failures, and determine whether to add proxy provider before GA.

