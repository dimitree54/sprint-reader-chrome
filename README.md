# 10x your reading speed with AI*

**10x your reading speed** is a multi-browser speed reading extension that supercharges your reading with RSVP (Rapid Serial Visual Presentation) technology enhanced by AI preprocessing and real-time streaming.

> Current version: 3.0.3

Simply select text on a webpage, right-click and select `10x your reading speed - read selected text` from the menu. This launches the reader window where selected text is displayed word-by-word in a fixed focal position. The duration of each slide is calculated based on your word-per-minute (WPM) setting.

Prefer to paste something manually? Click the extension icon, drop your text into the popup, and then press **Speed read it** to open the reader with that content. Use the gear icon in the popup or reader to open the dedicated settings page where you can manage the OpenAI API key, pick the target language, and choose the summarisation level for AI-powered translation.

**New**: When an OpenAI API key is configured, the extension uses real-time streaming processing that begins displaying content immediately while continuing to process text in the background, providing instant feedback and progress visualization.

## What makes this special

On top of traditional **Rapid Serial Visual Presentation** (RSVP), we've added **LLM pre-processing** and **real-time streaming** to further accelerate your reading comprehension. Studies show that the habit of internally "sounding out" (sub-vocalising) words is a limiting factor that prevents faster reading speeds. RSVP eliminates this by not displaying words long enough for sub-vocalisation to occur.

Our AI preprocessing optimizes text before presentation, and with streaming enabled, you can start reading immediately while the AI continues processing the remaining content in the background - allowing you to absorb information even faster than standard RSVP while maintaining the same level of comprehension.

## Key Features

> Multiple colour schemes
> Optimal letter highlighting
> Automatic language detection
> Adjustable font and font size
> Adjustable word-per-minute (WPM)
> Intelligent hyphenation of words
> Focal guides to improve attention
> Adjustable words-per-slide (chunk size)
> Provision for different display algorithms
> Optimal word positioning to improve comprehension
> Optional grammar delays
> **Multi-browser support** (Chrome, Firefox, Safari)
> **AI-powered text preprocessing** for enhanced comprehension
> **Real-time streaming processing** with visual progress feedback
> Progressive content loading - start reading while processing continues
> Intelligent feature detection (streaming when API key available, fallback otherwise)
> Dedicated settings page for managing translation providers
> 47+ translation languages with "no translation" default
> Adjustable summarisation depth (literal, 50% reduction, or key-point digest)
> Keyboard shortcut helper that nudges you to select text when none is highlighted

## Table of Contents

* [Original Attribution](#original-attribution)
* [Getting Started](#getting-started)
* [Multi-Browser Support](#multi-browser-support)
* [Automated Testing](#automated-testing)
* [Useful Resources](#useful-resources)
* [Developers Guide](#developers-guide)
* [License](#license)

## <a name="original-attribution"></a>Original Attribution

This extension is based on **Sprint Reader** originally created by Anthony Nosek. We've enhanced it with:
- AI-powered text preprocessing with real-time streaming (see docs/architecture.md#76-real-time-streaming-architecture)
- Progressive content loading and visual progress feedback
- Multi-browser support (Chrome, Firefox, Safari)
- Modernized architecture and UI improvements

Original Sprint Reader: Copyright (c) 2013-2025, Anthony Nosek. Used under BSD license terms.

## <a name="getting-started"></a>Getting Started

### Installation from Source

1. Download or clone this repository
2. Build the extension for your target browser:

```bash
npm install
npm run build:chrome    # For Chrome
npm run build:firefox   # For Firefox
npm run build:safari    # For Safari
```

3. Load the extension in your browser:

**Chrome:**
- Visit `chrome://extensions`
- Enable **Developer mode**
- Click **Load unpacked** and select `dist/chrome/`

**Firefox:**
- Visit `about:debugging`
- Click **This Firefox** → **Load Temporary Add-on**
- Select any file in `dist/firefox/`

**Safari:**
- Use `safari-web-extension-converter` on `dist/safari/`

## <a name="multi-browser-support"></a>Multi-Browser Support

This extension supports all major browsers through a unified build system:

- **Chrome**: Full Manifest V3 support with service worker background scripts
- **Firefox**: MV3 compatible with Gecko-specific optimizations
- **Safari**: Ready for conversion to native Safari extension

Each browser target produces an optimized distribution in `dist/<browser>/`.

## <a name="automated-testing"></a>Automated Testing

The project includes both unit tests and end-to-end tests to ensure code quality and functionality.

### Unit Tests

Unit tests are implemented with [Vitest](https://vitest.dev/) and provide fast, isolated testing of individual functions and modules.

```bash
npm run test:unit
```

Unit tests are co-located with source files using the `.spec.ts` extension and provide comprehensive coverage of core utilities and algorithms.

### End-to-End Tests

End-to-end regression tests run on Chromium via [Playwright](https://playwright.dev/).

```bash
npm install
npx playwright install chromium
npm test
```

Tests exercise the complete reader flow including background worker APIs, reader window lifecycle, and RSVP playback behavior.

### Testing prerequisites

Some E2E scenarios validate the real OpenAI integration. To run the full suite successfully you must provide a valid API key via environment variable:

```bash
export OPENAI_API_KEY="sk-..."
npm test
```

Alternatively, prefix the command:

```bash
OPENAI_API_KEY="sk-..." npm test
```

Without this variable, the OpenAI integration test will fail by design (no mocks or fallbacks are used).

Note: The Playwright test runner auto-loads variables from a local `.env` file and will pick up `OPENAI_API_KEY` from there if present. Existing process environment variables always take precedence.

## <a name="useful-resources"></a>Useful Resources

- [Chrome Extensions Official Site](https://developer.chrome.com/extensions)
- [Firefox WebExtensions](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions)
- [Safari Web Extensions](https://developer.apple.com/documentation/safariservices/safari_web_extensions)
- [WebExtensions API](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API)

## <a name="developers-guide"></a>Developers Guide

See `docs/architecture.md` for detailed technical documentation covering:
- Extension architecture and execution contexts
- Build system and browser targeting
- Message passing and state management
- Testing strategy

### Coding Standards

- `npm run lint` must pass; the ESLint config now enforces `space-in-parens` so padding spaces like `( selection` are reported (use `npm run lint:fix` for automatic cleanup).
- `npm run typecheck` and `npm test` guard TypeScript types and Playwright scenarios respectively before submitting changes.
- A Husky `pre-push` hook runs `npm run lint` and `npm run typecheck` automatically; if hooks are missing (e.g., after cloning), run `npm run prepare` to re-install them.

## Architecture Summary

The extension uses a clean service‑oriented, store‑driven architecture (see `docs/architecture.md`).

- Core services: `BrowserApiService`, `StorageService`, `TimingService`, `AIPreprocessingService`, `PlaybackService` (owns the scheduling loop). The legacy `platform/` layer has been removed; all code uses the `BrowserApiService`.
- State: Centralized Zustand store `src/reader/state/reader.store.ts` (single source of truth).
- UI: Store‑driven renderer `src/reader/ui/renderer.ts` as the only DOM writer; modern control bindings in `src/reader/ui/controls.ts` wired to store and PlaybackService.

Quality gates: lint + typecheck + unit + end‑to‑end tests are green with a real `OPENAI_API_KEY`.

## <a name="license"></a>License

Copyright (c) 2013-2025, Anthony Nosek
All rights reserved.

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met:

* Redistributions of source code must retain the above copyright notice, this
  list of conditions and the following disclaimer.

* Redistributions in binary form must reproduce the above copyright notice,
  this list of conditions and the following disclaimer in the documentation
  and/or other materials provided with the distribution.

* Neither the name of Sprint Reader, Anthony Nosek nor the names of its
  contributors may be used to endorse or promote products derived from
  this software without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL ANTHONY NOSEK BE LIABLE FOR ANY DIRECT,
INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING,
BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY
OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE,
EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
