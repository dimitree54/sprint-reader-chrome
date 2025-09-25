Of course. Here is a pragmatic, multi-step plan to incrementally refactor the Sprint Reader extension to the new service-oriented architecture.

This plan is designed to be executed in small, verifiable steps. **Crucially, after each step is completed, the extension must remain fully functional, and all existing Playwright tests should pass**. This ensures a safe, controlled migration from the current architecture to the target state defined in the `architecture.md` document.

## Refactoring Plan: Sprint Reader Architecture

This plan is broken down into distinct phases. Each phase builds upon the last, systematically and safely decoupling the application components.

---

### Phase 0: Preparation and Tooling

> Phase exit criteria: Extension remains fully functional; `npm run lint`, `npm run typecheck`, and `npm test` must all pass before closing the phase.

This phase sets the foundation for a successful refactoring by preparing the development environment and tooling.

* **Step 0.1: Stricter TypeScript Configuration**
    * **Action:** Modify `tsconfig.json` to enable stricter checks like `noImplicitAny`, `strictNullChecks`, and `noUnusedLocals`.
    * **Verification:** Run `npm run typecheck`. Fix any existing type errors that arise. This establishes a stronger type safety baseline before making code changes.

* **Step 0.2: Introduce Unit Testing with Vitest**
    * **Action:** Add `vitest` to `devDependencies` in `package.json`. Create a `vitest.config.ts` file in the root directory.
    * **Verification:** Create a simple test file, for example `src/common/html.spec.ts`, and write a single unit test for the `encodeHtml` function. Run the test and confirm it passes. This ensures the testing framework is ready for the new services.

* **Step 0.3: Create New Directory Structure**
    * **Action:** Create the new top-level directories within `src/` as defined in the target architecture: `core/`, `reader/playback/`, `reader/state/`, `reader/timing/`, and `reader/ui/`.
    * **Verification:** The new directories exist. The application will continue to build and function as no files have been moved yet.

---

### Phase 1: Core Services Abstraction

> Phase exit criteria: Extension remains fully functional; `npm run lint`, `npm run typecheck`, and `npm test` must all pass before closing the phase.

This phase decouples the lowest-level browser and storage dependencies, making the rest of the application easier to test and modify.

* **Step 1.1: Create and Implement `BrowserApiService`**
    * **Action:** Create `src/core/browser-api.service.ts`. Move the logic from `src/platform/browser.ts` and `wrap-chrome.ts` into this new service class. The service should expose methods like `sendMessage`, `createWindow`, etc.
    * **Verification:** All existing Playwright tests must pass. The application functionality is unchanged.

* **Step 1.2: Migrate Code to Use `BrowserApiService`**
    * **Action:** Refactor all direct usages of the `browser` or `chrome` APIs throughout the codebase (`background/`, `popup/`, etc.) to import and use an instance of the new `BrowserApiService`.
    * **Verification:** All existing Playwright tests must pass. This confirms the abstraction is working correctly without altering behavior.

* **Step 1.3: Create and Implement `StorageService`**
    * **Action:** Create `src/core/storage.service.ts`. Move all functions from `src/common/storage.ts` and `storage-helpers.ts` into this service. It should use the `BrowserApiService`.
    * **Verification:** Create unit tests for the `StorageService` that mock the `BrowserApiService`. All existing Playwright tests must pass.

* **Step 1.4: Migrate All Storage Calls**
    * **Action:** Update all parts of the application that call storage functions to use the new `StorageService`.
    * **Verification:** All existing Playwright tests must pass, especially the settings page tests. This confirms that preference loading and saving still work correctly.

---

### Phase 2: Introduce the Reader State Store

> Phase exit criteria: Extension remains fully functional; `npm run lint`, `npm run typecheck`, and `npm test` must all pass before closing the phase.

This is the first major step in refactoring the `reader` module. We will introduce the new state store and run it in parallel with the old state for a transitional period.

* **Step 2.1: Add State Library and Create Store**
    * **Action:** Add `zustand` to `dependencies`. Create `src/reader/state/reader.store.ts`. Define the new `ReaderState` interface and set up the basic Zustand store as detailed in the `architecture.md`.
    * **Verification:** The application builds successfully. The store is not yet used, so no behavior has changed.

* **Step 2.2: Sync Old State to New Store**
    * **Action:** Modify the legacy `src/reader/state.ts` file. After any variable is modified (e.g., `state.playing = true`), add a line to update the corresponding value in the new Zustand store (e.g., `useReaderStore.setState({ status: 'playing' })`).
    * **Verification:** All Playwright tests pass. You can verify in the browser console that the new store's state changes in sync with the old state.

---

### Phase 3: Service Layer Extraction

> Phase exit criteria: Extension remains fully functional; `npm run lint`, `npm run typecheck`, and `npm test` must all pass before closing the phase.

With the state store in place, we can begin to extract pure logic from the `reader` monolith into testable services.

* **Step 3.1: Create `TimingService`**
    * **Action:** Create `src/reader/timing/timing.service.ts`. Move all functions from `src/reader/timing/` and `time-calculator.ts` into this service. The service should contain pure functions that take text and preferences and return `WordItem` arrays and timing calculations.
    * **Verification:** Create comprehensive unit tests for `TimingService` using Vitest to cover all aspects of the reading algorithm. All Playwright tests must pass.

* **Step 3.2: Create `AIPreprocessingService`**
    * **Action:** Create `src/preprocessing/ai-preprocessing.service.ts`. Refactor the existing logic from the `src/preprocessing` directory into this service class.
    * **Verification:** Create unit tests for this service, mocking any `fetch` calls. All Playwright tests related to OpenAI features must pass.

* **Step 3.3: Delegate Logic to New Services**
    * **Action:** Refactor the old `text.ts` and `selection-loader.ts` files. Instead of performing the logic themselves, they should now call the new `TimingService` and `AIPreprocessingService`. The results should still be stored in the legacy `reader/state.ts` variables for now.
    * **Verification:** All Playwright tests must pass. This confirms the logic was extracted correctly without changing the application's behavior.

---

### Phase 4: Isolate Rendering and User Controls

> Phase exit criteria: Extension remains fully functional; `npm run lint`, `npm run typecheck`, and `npm test` must all pass before closing the phase.

This is the most critical phase, where we decouple the UI from the business logic.

* **Step 4.1: Create the `Renderer`**
    * **Action:** Create `src/reader/ui/renderer.ts`. This module will subscribe to the **new Zustand store**. Its sole job is to update the DOM based on the current state from the store. Start by migrating one piece of logic, e.g., the part of `render.ts` that updates the word display.
    * **Verification:** The word display should now be driven by the new state store. Playback will appear broken, but the initial word should render correctly. Temporarily disable Playwright tests that rely on playback.

* **Step 4.2: Create the `UIControls` Module**
    * **Action:** Create `src/reader/ui/controls.ts`. Move all `addEventListener` calls from the old `controls.ts` here. Instead of directly manipulating state, these listeners should call actions on the **new Zustand store** (e.g., `useReaderStore.getState().togglePlay()`).
    * **Verification:** Clicking the UI buttons will update the state in the Zustand store, and the `Renderer` will react to it.

* **Step 4.3: Migrate All Rendering Logic**
    * **Action:** Incrementally move all remaining DOM manipulation logic from `render.ts`, `visual-effects.ts`, and the old `controls.ts` into the `Renderer`. The `Renderer` should become the only module that touches the DOM.
    * **Verification:** The entire UI (progress bar, status text, theme) is now driven by the Zustand store. All UI-related Playwright tests (theme switching, etc.) should be re-enabled and pass.

---

### Phase 5: Implement `PlaybackService` and Finalize Reader

> Phase exit criteria: Extension remains fully functional; `npm run lint`, `npm run typecheck`, and `npm test` must all pass before closing the phase.

With a decoupled UI, we can now clean up the core playback logic.

* **Step 5.1: Create `PlaybackService`**
    * **Action:** Create `src/reader/playback/playback.service.ts`. This service is responsible for the `setTimeout` loop. When the timer fires, it will *not* call the renderer. Instead, it will call an action on the Zustand store to advance the `playbackIndex`.
    * **Verification:** The `playbackIndex` in the Zustand store should update correctly when play is active. The UI will now update in response, driven by the `Renderer`'s subscription. All playback-related Playwright tests should be re-enabled and must pass.

* **Step 5.2: Deprecate Legacy Reader State**
    * **Action:** The entire application logic in the reader should now be using the Zustand store. Search the codebase for any remaining uses of the old `reader/state.ts` module and refactor them to use the store.
    * **Verification:** All tests must pass.

* **Step 5.3: Delete Old Reader Files**
    * **Action:** Delete `src/reader/state.ts`, `src/reader/render.ts`, the old `src/reader/controls.ts`, `src/reader/playback.ts`, and `src/reader/text.ts`.
    * **Verification:** The application builds and all Playwright tests pass. The reader refactor is complete.

---

### Phase 6: Cleanup and Finalization

> Phase exit criteria: Extension remains fully functional; `npm run lint`, `npm run typecheck`, and `npm test` must all pass before closing the phase.

The final phase is to remove all remaining legacy code and verify the final state.

* **Step 6.1: Refactor `BackgroundService`**
    * **Action:** Clean up the `src/background` modules to conform to the new service pattern, using the `CoreServices` for all browser and storage interactions.
    * **Verification:** All Playwright tests pass.

* **Step 6.2: Final Code Review and Cleanup**
    * **Action:** Perform a final pass over the entire codebase, removing any temporary variables, dead code, or commented-out logic from the refactoring process. Ensure all files adhere to the new architectural patterns. Update the main `architecture.md` and `README.md` to reflect the new structure.
    * **Verification:** Run the full test suite (`lint`, `typecheck`, and `test`) one last time. The application is now fully migrated to the new architecture.
