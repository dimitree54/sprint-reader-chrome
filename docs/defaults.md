# Default Values Configuration

## Last updated: September 2025

This document describes all default values used throughout the extension and their purposes. All defaults are centralized in `src/config/defaults.ts` to ensure consistency and easy maintenance.

## Reader Preferences Defaults

These values control the initial reading experience when a user first installs the extension or when preferences cannot be loaded from storage.

| Setting | Default Value | Purpose |
|---------|---------------|---------|
| `wordsPerMinute` | `400` | Initial reading speed - optimized for average reading comprehension |
| `pauseAfterComma` | `true` | Enables pause after commas for natural reading rhythm |
| `pauseAfterPeriod` | `true` | Enables pause after periods for sentence boundaries |
| `pauseAfterParagraph` | `true` | Enables pause after paragraphs for content separation |
| `chunkSize` | `3` | Number of words to group together (1=single word, 2-4=word groups) |
| `wordFlicker` | `false` | Enables flicker effect to improve concentration |
| `wordFlickerPercent` | `10` | Percentage of word display time for flicker effect |
| `theme` | `'dark'` | Default visual theme (dark reduces eye strain) |

## Selection State Defaults

These values define the initial state of text selection tracking.

| Setting | Default Value | Purpose |
|---------|---------------|---------|
| `text` | `''` | Empty text when no selection exists |
| `hasSelection` | `false` | No active selection initially |
| `isRTL` | `false` | Left-to-right text direction (most common) |
| `timestamp` | `Date.now()` | Current timestamp for selection freshness tracking |

## Timing and Playback Defaults

These values ensure safe and responsive playback behavior.

| Setting | Default Value | Purpose |
|---------|---------------|---------|
| `minimumDelayMs` | `20` | Minimum delay between words (prevents UI freezing) |
| `minimumWpmForCalculation` | `100` | Minimum WPM for timing calculations (prevents division by zero) |
| `selectionCaptureDelayMs` | `120` | Debounce delay for selection change events |

## UI and Positioning Defaults

These values control visual positioning and timing for UI elements.

| Setting | Default Value | Purpose |
|---------|---------------|---------|
| `resizeDebounceMs` | `150` | Debounce delay for window resize events |
| `windowDimensions.width` | `960` | Default reader window width |
| `windowDimensions.height` | `640` | Default reader window height |
| `highlightOptimalLetterColor` | `'#FF8C00'` | Orange color for highlighting the optimal reading letter |
| `optimalFontSize` | `'128px'` | Default font size for word display (dynamically adjusted) |

## Word Processing Defaults

These values control how text is processed and grouped for optimal reading.

| Setting | Default Value | Purpose |
|---------|---------------|---------|
| `maxWordLengthForGrouping` | `3` | Maximum word length (in characters) for grouping multiple words together |
| `rawText` | `''` | Fallback for empty raw text to prevent errors in preprocessing |

## Visual Effects Defaults

These values control animations and visual effects during reading.

| Setting | Default Value | Purpose |
|---------|---------------|---------|
| `flickerOpacity` | `0.3` | Opacity level (0.0-1.0) for word flicker effect |
| `flickerDurationMultiplier` | `0.3` | Fraction of word display time when flicker occurs (30%) |
| `maxTheoreticalLength` | `16` | Maximum expected word length for font size calculations |
| `maxFontSize` | `128` | Maximum font size in pixels for word display |
| `minFontSize` | `48` | Minimum font size in pixels for word display |

## Theme Constants

These values define the available theme options.

| Setting | Default Value | Purpose |
|---------|---------------|---------|
| `THEMES.light` | `'light'` | Identifier for light theme mode |
| `THEMES.dark` | `'dark'` | Identifier for dark theme mode |

## Error Handling Defaults

These values provide consistent error handling behavior.

| Setting | Default Value | Purpose |
|---------|---------------|---------|
| `consoleErrorHandler` | `console.error` | Default error logging function |
| `consoleWarnHandler` | `console.warn` | Default warning logging function |

## Network and API Timeouts

These values define the timeouts for network requests and API calls.

| Setting | Default Value | Purpose |
|---------|---------------|---------|
| `getCurrentSelectionTimeout` | `3000` | Timeout in milliseconds for getting the current selection from the background script |


## Preprocessing & Translation Defaults

These values control preprocessing features and default translation behavior.

| Setting | Default Value | Purpose |
|---------|---------------|---------|
| `PREPROCESSING.enabled` | `false` | Enables AI preprocessing/streaming features |
| `TRANSLATION.defaultLanguage` | `'en'` | Default translation language (user‑visible language) |

## Summarization Defaults

These values control the default summarization behavior for text preprocessing.

| Setting | Default Value | Purpose |
|---------|---------------|---------|
| `defaultLevel` | `'none'` | Default summarization level (none = no summarization) |

## Usage Guidelines

### Adding New Defaults

When adding new default values:

1. Add the value to the appropriate section in `src/config/defaults.ts`
2. Use the centralized value throughout the codebase instead of hardcoding
3. Update this documentation with the new default and its purpose
4. Consider the impact on existing users (migrations may be needed)

### Modifying Existing Defaults

When changing default values:

1. Consider backward compatibility with existing installations
2. Test the impact on new user experience
3. Update tests that depend on the old defaults
4. Document the change and reasoning

### Best Practices

1. **Accessibility**: Default values should work for users with disabilities
2. **Performance**: Defaults should not cause performance issues on slower devices
3. **Internationalization**: Consider different languages and text directions
4. **User Experience**: Defaults should provide a good first impression

## Implementation Details

### Centralized Configuration

All defaults are defined in `src/config/defaults.ts` using TypeScript's `satisfies` operator to ensure type safety:

```typescript
export const DEFAULTS = {
  READER_PREFERENCES: {
    wordsPerMinute: 400,
    chunkSize: 3,
    theme: 'dark' as ReaderTheme
    // ... other preferences
  } satisfies ReaderPreferences,

  WORD_PROCESSING: {
    maxWordLengthForGrouping: 3
  },

  TIMING: {
    minimumDelayMs: 20,
    minimumWpmForCalculation: 100,
    selectionCaptureDelayMs: 120
  },

  UI: {
    highlightOptimalLetterColor: '#FF8C00',
    optimalFontSize: '128px',
    windowDimensions: { width: 960, height: 640 }
    // ... other UI settings
  },

  VISUAL: {
    flickerOpacity: 0.3,
    maxFontSize: 128,
    minFontSize: 48
    // ... other visual effects
  },

  THEMES: {
    light: 'light' as ReaderTheme,
    dark: 'dark' as ReaderTheme
  },



  PREPROCESSING: {
    enabled: false
  },

  TRANSLATION: {
    defaultLanguage: 'en'
  },

  SUMMARIZATION: {
    defaultLevel: 'none'
  }
} as const
```

### Helper Functions

The configuration file provides helper functions for common use cases:

- `getDefaultReaderPreferences()`: Returns a deep copy of reader preference defaults
- `getDefaultSelectionState()`: Returns default selection state with current timestamp

### Type Safety

All defaults are strongly typed and aligned with the extension's TypeScript interfaces, preventing configuration errors at compile time.

## Fallback Behavior Elimination

As part of the extension's architecture principles, the centralized defaults replace previous fallback patterns:

- **Before**: `value ?? 400` scattered throughout the codebase
- **After**: `value ?? DEFAULTS.READER_PREFERENCES.wordsPerMinute`

This approach ensures consistency and makes it easier to understand and maintain the extension's behavior.

## Recent Changes

### September 2025 - Streaming & Defaults Alignment

Updates in alignment with the current architecture and tests:

- Preprocessing is disabled by default: `PREPROCESSING.enabled = false`
- Default translation language is English: `TRANSLATION.defaultLanguage = 'en'`
- OpenAI requests use the priority tier by default: `OPENAI.service_tier = 'priority'`

### December 2024 - Hardcode Elimination

A comprehensive audit was performed to eliminate hardcoded values throughout the codebase. The following new configuration sections were added:

**Word Processing Defaults:**
- Added `maxWordLengthForGrouping` to centralize the 3-character limit for word grouping logic

**Visual Effects Defaults:**
- Added `flickerOpacity`, `flickerDurationMultiplier` for flicker effect control
- Added `maxTheoreticalLength` for font size calculation consistency
- Added `maxFontSize` and `minFontSize` for dynamic font sizing boundaries

**Enhanced UI Defaults:**
- Added `highlightOptimalLetterColor` for consistent letter highlighting
- Added `optimalFontSize` as the default font size for words

**Theme Constants:**
- Added `THEMES.light` and `THEMES.dark` to replace string literals throughout the code

**Impact:**
- Eliminated 15+ hardcoded values across 12 files
- Improved maintainability and reduced risk of configuration drift
- Enhanced type safety with centralized constants
- Enabled easier customization of visual effects and behavior

### September 2024 - Translation and Summarization Defaults

Added comprehensive language support and default behavior configuration for text preprocessing:

**Translation Defaults:**
- Added `TRANSLATION.defaultLanguage` set to 'none' (no translation by default)
- Expanded language support to 47+ languages including all requested languages
- Added "Do not translate" option as the first option in language selection

**Summarization Defaults:**
- Added `SUMMARIZATION.defaultLevel` set to 'none' (no summarization by default)
- Ensured original text is returned when both translation and summarization are disabled

**Language Support Added:**
- Afrikaans, Albanian, Arabic, Bengali, Bulgarian, Catalan, Chinese (Simplified), Chinese (Traditional), Croatian, Czech, Danish, Dutch, English, Estonian, Filipino/Tagalog, Finnish, French, German, Greek, Hebrew, Hindi, Hungarian, Indonesian, Italian, Japanese, Korean, Latvian, Lithuanian, Malay, Norwegian Bokmål, Persian (Farsi), Polish, Portuguese (Brazil), Portuguese (Portugal), Romanian, Russian, Serbian, Slovak, Slovenian, Spanish, Swahili, Swedish, Thai, Turkish, Ukrainian, Urdu, Vietnamese, Yoruba

**Impact:**
- Default behavior now preserves original text without processing
- Users must explicitly opt-in to translation and summarization
- Comprehensive language support for global users
- Improved performance by skipping unnecessary API calls when no processing is needed
