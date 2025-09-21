# Default Values Configuration

_Last updated: December 2024 (Post-Hardcode Elimination)_

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
| `wordFlicker` | `true` | Enables flicker effect to improve concentration |
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
| `mouseCoordinates` | `{ x: 0, y: 0 }` | Fallback coordinates when mouse position unavailable |
| `selectionHintTimeoutMs` | `3000` | How long selection hints remain visible |
| `resizeDebounceMs` | `150` | Debounce delay for window resize events |
| `windowDimensions.width` | `960` | Default reader window width |
| `windowDimensions.height` | `640` | Default reader window height |
| `selectionHintOffset` | `16` | Pixel offset for selection hint positioning |
| `highlightOptimalLetterColor` | `'#FF8C00'` | Orange color for highlighting the optimal reading letter |
| `optimalFontSize` | `'128px'` | Default font size for word display (dynamically adjusted) |

## Word Processing Defaults

These values control how text is processed and grouped for optimal reading.

| Setting | Default Value | Purpose |
|---------|---------------|---------|
| `maxWordLengthForGrouping` | `3` | Maximum word length (in characters) for grouping multiple words together |

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