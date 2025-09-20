# Modularization Plan for Sprint Reader Extension

## Objectives
- Consolidate shared logic for background, content, popup, and options UIs into reusable modules.
- Establish a modern build pipeline that outputs browser-specific bundles while maintaining a single codebase.
- Centralize WebExtension API differences to simplify cross-browser maintenance.
- Improve testability and release automation for Chrome, Firefox, and Safari.

## Guiding Principles
1. **Single Source of Truth** – All feature logic lives in shared modules with browser-specific shims where necessary.
2. **Explicit Dependencies** – Replace global scripts with ES module imports to make relationships clear.
3. **Config-Driven Builds** – Drive manifest and asset differences from configuration files rather than ad-hoc scripts.
4. **Incremental Adoption** – Migrate functionality in phases to keep the extension releasable throughout the transition.

## Phase 1: Prepare the Codebase
1. **Directory Layout**
   - Create `src/common/` for shared utilities (text processing, storage helpers, messaging contracts).
   - Create `src/platform/` for browser-specific wrappers (e.g., API shims, manifest augmentations).
   - Move existing entry points into `src/background/`, `src/content/`, `src/popup/`, and `src/options/`.
2. **TypeScript Support**
   - Enable TypeScript in `tsconfig.json` for new modules while keeping compatibility with existing JavaScript.
   - Configure strict typing for shared modules to catch regression early.
3. **Coding Guidelines**
   - Document module boundaries and naming conventions in `CONTRIBUTING.md` to align the team.

## Phase 2: Introduce Bundler-Based Builds
1. **Tooling Selection**
   - Adopt Vite, Rollup, or Webpack to output separate bundles for background, content, popup, options, and reader views.
   - Configure output to `dist/chrome/`, `dist/firefox/`, and `dist/safari/` directories.
2. **Entry Configuration**
   - Define entry files (`background/index.ts`, `content/index.ts`, `popup/index.ts`, etc.) that import shared modules explicitly.
   - Ensure bundler handles worker context (service worker) and DOM context builds with appropriate target settings.
3. **Asset Handling**
   - Use bundler plugins to copy static assets (HTML, CSS, images) and update script references to point to bundled files.
4. **Migration Strategy**
   - Convert utilities (`utility.js`, `engine.js`) into ES modules under `src/common/`.
   - Update entry points to import from `src/common/` instead of relying on globals.
   - Gradually remove legacy `<script>` tags once modules are bundled.

## Phase 3: Unify Manifest Generation
1. **Configuration Files**
   - Introduce `config/manifest.base.json` describing shared manifest fields.
   - Add override files (`manifest.chrome.json`, `manifest.firefox.json`, `manifest.safari.json`) for browser-specific differences.
2. **Generation Script**
   - Implement `scripts/build-extension.ts` that merges the base manifest with overrides and writes outputs to `dist/<browser>/`.
   - Ensure the script adjusts properties such as service worker vs. background scripts, permissions, and icons per target.
3. **Integration with Bundler**
   - Hook manifest generation into the bundler pipeline (e.g., via `npm run build:<browser>` commands).
   - Validate that generated manifests reference the new bundled filenames.

## Phase 4: Platform Abstraction Layer
1. **Unified API Module**
   - Create `src/platform/api.ts` exporting a `getBrowser()` helper and typed wrappers for `runtime`, `storage`, `contextMenus`, etc.
   - Handle detection between `chrome` and `browser` namespaces and map Safari-specific APIs.
2. **Context-Aware Utilities**
   - Build adapters for API differences (e.g., `contextMenus` vs `menus`, promise vs callback-based APIs).
   - Surface a consistent, promise-based interface for all modules.
3. **Refactor Usage**
   - Update background, content, popup, and options modules to consume the unified API rather than direct `chrome.*` calls.
   - Add unit tests for the platform layer to ensure parity across browsers.

## Phase 5: Testing & Automation Enhancements
1. **Unit Tests**
   - Establish Jest or Vitest for unit testing shared modules (`ReadingEngine`, storage, messaging helpers).
   - Add mocks for the platform layer to isolate business logic from browser APIs.
2. **Integration & E2E Tests**
   - Extend Playwright suite to validate bundled builds across Chromium and Firefox, and document Safari manual verification steps.
3. **CI Pipeline**
   - Configure GitHub Actions (or existing CI) to run linting, unit tests, bundler builds, and Playwright tests on pull requests.
   - Produce build artifacts for each browser to aid QA and distribution.

## Phase 6: Documentation & Developer Experience
1. **Update Documentation**
   - Expand `docs/architecture.md` with module diagrams showing shared vs. platform-specific layers.
   - Document build commands, manifest configuration, and platform abstraction usage.
2. **Developer Tooling**
   - Provide scripts for local development (`npm run dev:chrome`, `npm run dev:firefox`) with live reload where possible.
   - Add linting and formatting (ESLint + Prettier) to enforce consistency in the modularized codebase.
3. **Migration Checklist**
   - Track progress for moving legacy files into the modular structure to ensure no orphaned code remains.

## Expected Outcomes
- **Maintainability**: Clear module boundaries and centralized platform logic reduce the cost of feature development and bug fixes.
- **Scalability**: Config-driven builds make it easier to add new browser targets or adjust permissions/features per browser.
- **Testability**: Modular code with unit and integration tests improves confidence in releases.
- **Developer Velocity**: Standardized tooling and documentation streamline onboarding and daily workflows.
