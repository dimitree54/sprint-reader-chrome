# Sprint Reader - Advanced Reading Algorithm

_Last updated: January 2025_

## Overview

Sprint Reader uses an advanced **Word Frequency + Shannon Entropy Algorithm** that adapts the display time for each word based on its complexity, frequency of use, and reading context. This creates a more natural reading rhythm where simple words flash quickly and complex words give you more time to process.

## 🎯 Core Timing Algorithm

### Base Timing Calculation

Every word starts with a **base duration** calculated from your WPM setting:
```
Base Time = 60,000 ÷ WPM (in milliseconds)
```

**Examples at different WPM settings:**
- 300 WPM: 200ms base time
- 400 WPM: 150ms base time
- 600 WPM: 100ms base time
- 1000 WPM: 60ms base time

### Word Frequency Multipliers

The algorithm then adjusts this base time based on how common the word is in English:

| Word Frequency | Examples | Time Multiplier | Rationale |
|----------------|----------|-----------------|-----------|
| **Very Common** (1M+ uses) | the, and, is, you, that, it, he, was, for, on | **×0.7** (-30%) | Your brain processes these instantly |
| **Common** (100K+ uses) | about, after, again, against, back, because | **×0.85** (-15%) | Familiar words need less time |
| **Regular** (10K+ uses) | important, example, different, following | **×1.0** (normal) | Standard processing time |
| **Uncommon** (1K+ uses) | algorithm, architecture, implementation | **×1.2** (+20%) | Technical terms need more time |
| **Rare** (<1K uses) | supercalifragilisticexpialidocious, antidisestablishmentarianism | **×1.5** (+50%) | Complex/unknown words |

### Shannon Entropy Adjustment

The algorithm also considers the **information complexity** of each word using Shannon entropy:

- **Simple patterns**: "that", "when", "with" → minimal adjustment
- **Complex patterns**: "rhythm", "psychology", "strength" → +10-30% time
- **Very complex**: technical terms, foreign words → up to +30% time

## 📊 Real Timing Examples

Here are actual timing examples at **400 WPM** (150ms base):

### Common Words (Fast)
| Word | Category | Final Time | Calculation |
|------|----------|------------|-------------|
| "I" | Very common | **105ms** | 150ms × 0.7 = 105ms |
| "the" | Very common | **105ms** | 150ms × 0.7 = 105ms |
| "and" | Very common | **105ms** | 150ms × 0.7 = 105ms |
| "you" | Very common | **105ms** | 150ms × 0.7 = 105ms |
| "have" | Common | **128ms** | 150ms × 0.85 = 128ms |
| "about" | Common | **128ms** | 150ms × 0.85 = 128ms |

### Regular Words (Normal)
| Word | Category | Final Time | Calculation |
|------|----------|------------|-------------|
| "reading" | Regular | **150ms** | 150ms × 1.0 = 150ms |
| "example" | Regular | **150ms** | 150ms × 1.0 = 150ms |
| "different" | Regular | **150ms** | 150ms × 1.0 = 150ms |

### Complex Words (Slow)
| Word | Category | Final Time | Calculation |
|------|----------|------------|-------------|
| "algorithm" | Uncommon | **180ms** | 150ms × 1.2 = 180ms |
| "implementation" | Uncommon | **195ms** | 150ms × (1.2 + 0.1 entropy) = 195ms |
| "antidisestablishmentarianism" | Rare | **270ms** | 150ms × (1.5 + 0.3 entropy) = 270ms |
| "supercalifragilisticexpialidocious" | Rare | **315ms** | 150ms × (1.5 + 0.6 entropy) = 315ms |

## ⏱️ Punctuation Pauses

Additional pauses are added after punctuation marks:

### Pause Multipliers
- **Comma, semicolon, colon** (`,`, `;`, `:`): **+50% of base time**
- **Period, exclamation, question** (`.`, `!`, `?`): **+100% of base time**
- **Paragraph break** (`\n\n`): **+250% of base time**

### Punctuation Examples (400 WPM base = 150ms)
| Text | Word Time | Pause Time | Total Time | Explanation |
|------|-----------|------------|------------|-------------|
| "word," | 150ms | **+75ms** | **225ms** | 150ms × 0.5 = 75ms pause |
| "end!" | 105ms | **+150ms** | **255ms** | 150ms × 1.0 = 150ms pause |
| "sentence." | 128ms | **+150ms** | **278ms** | 150ms × 1.0 = 150ms pause |
| [paragraph] | varies | **+375ms** | +375ms | 150ms × 2.5 = 375ms pause |

## 🎯 Optimal Letter Centering

### The Science Behind Letter Positioning

Sprint Reader doesn't just center words—it centers the **optimal letter** within each word that your eye should focus on. This is based on reading research showing that the eye naturally fixates on specific positions within words.

### Optimal Letter Position Rules

The algorithm calculates which letter to highlight based on word length:

| Word Length | Optimal Letter Position | Examples |
|-------------|------------------------|----------|
| **1 character** | Position 1 | "I" → **I** |
| **2-4 characters** | Position 2 | "the" → t**h**e, "word" → w**o**rd |
| **5-9 characters** | Position 3 | "reading" → re**a**ding, "example" → ex**a**mple |
| **10+ characters** | Position 4 | "implementation" → imp**l**ementation |

### Visual Centering Process

1. **Letter Wrapping**: Each word is split into individual `<span>` elements:
   ```html
   "reading" becomes:
   <span class="char1">r</span><span class="char2">e</span><span class="char3">a</span>...
   ```

2. **Optimal Letter Highlighting**: The calculated optimal letter gets orange color (`#FF8C00`):
   ```
   "reading" → re[a]ding  (where [a] is highlighted in orange)
   ```

3. **Precise Centering**: The entire word is positioned so the highlighted letter sits exactly in the center of the viewport:
   ```
   Viewport center: 50% of screen width
   Word position: calculated so optimal letter center = viewport center
   ```

### Centering Examples

| Word | Optimal Letter | Visual Result |
|------|----------------|---------------|
| "I" | Position 1 | **[I]** ← centered |
| "the" | Position 2 | t**[h]**e ← h is centered |
| "reading" | Position 3 | re**[a]**ding ← a is centered |
| "implementation" | Position 4 | imp**[l]**ementation ← l is centered |

## 🔬 Why This Algorithm Works

### Reading Research Foundation

1. **Fixation Points**: Research shows readers naturally fixate on specific positions in words, not the beginning or center
2. **Word Recognition**: High-frequency words are processed faster by the brain
3. **Information Theory**: Complex letter patterns (high entropy) require more processing time
4. **Punctuation Processing**: Natural reading includes pauses after punctuation for comprehension

### Adaptive Benefits

- **Efficiency**: Common words don't slow you down
- **Comprehension**: Complex words get adequate processing time
- **Natural Rhythm**: Mirrors natural reading patterns with punctuation pauses
- **Eye Strain Reduction**: Consistent focal point reduces eye movement
- **Speed Scaling**: Everything scales proportionally with your WPM setting

## 📈 Performance Scaling

The algorithm scales beautifully across all reading speeds:

### Speed Comparison Examples

| Word Type | 200 WPM | 400 WPM | 800 WPM | 1200 WPM |
|-----------|---------|---------|---------|----------|
| "the" (common) | 210ms | 105ms | 53ms | 35ms |
| "reading" (regular) | 300ms | 150ms | 75ms | 50ms |
| "algorithm" (complex) | 360ms | 180ms | 90ms | 60ms |
| Comma pause | +150ms | +75ms | +38ms | +25ms |
| Period pause | +300ms | +150ms | +75ms | +50ms |

This ensures that regardless of your reading speed, the **relative timing relationships** between different word types remain optimal for comprehension.

## 🧩 Advanced Text Preprocessing

Sprint Reader includes sophisticated text preprocessing that optimizes text before the timing algorithm runs:

### Hyphenated Word Consolidation

**Problem**: Hyphenated words get split by spaces, disrupting reading flow
**Solution**: Merge hyphenated components into single units

| Original Text | After Processing | Benefit |
|---------------|------------------|---------|
| "state-of-the-art technology" | "stateoftheart technology" | Reads as single concept |
| "twenty-one years old" | "twentyone years old" | Natural number reading |
| "well-known author" | "wellknown author" | Unified adjective |

### Acronym Consolidation

**Problem**: Spaced acronyms read as individual letters
**Solution**: Detect and merge acronym patterns

| Original Text | After Processing | Benefit |
|---------------|------------------|---------|
| "U S A is great" | "USA is great" | Country name as unit |
| "F B I investigation" | "FBI investigation" | Agency name clarity |
| "C P U performance" | "CPU performance" | Technical term unity |

**Detection Logic**: Looks for 2-4 consecutive uppercase letters and merges them.

### Number Preservation

**Problem**: Decimals and large numbers get fragmented
**Solution**: Preserve number formatting for comprehension

| Original Text | After Processing | Benefit |
|---------------|------------------|---------|
| "Pi equals 3 . 14159" | "Pi equals 3.14159" | Mathematical precision |
| "Price: $ 1 , 000 . 50" | "Price: $ 1,000.50" | Financial clarity |
| "Version 2 . 1 . 3" | "Version 2.1.3" | Software version unity |

### Long Word Splitting

**Problem**: Very long words (>17 characters) are hard to process quickly
**Solution**: Split at natural break points

| Original Word | Split Result | Break Logic |
|---------------|--------------|-------------|
| "antidisestablishmentarianism" | "antidisestab" + "lishmentarianism" | Syllable boundary |
| "supercalifragilisticexpialidocious" | "supercalifragi" + "listicexpiali" + "docious" | Vowel positions |
| "pneumonoultramicroscopicsilicovolcanoconosis" | Multiple chunks | Readable segments |

**Algorithm**: Finds vowel positions between characters 10-15 for natural break points.

## 🎯 Word Chunking System

For improved reading flow, Sprint Reader can group short words together:

### Chunking Rules

- **Target**: Words ≤ 3 characters
- **Group Size**: Configurable (default: disabled, can be 2-4 words)
- **Boundary Respect**: Never chunks across sentence endings (`.!?`)

### Chunking Examples

**Input text**: "I am on a big red car in the USA"

**Without Chunking** (1 word per display):
```
"I" → "am" → "on" → "a" → "big" → "red" → "car" → "in" → "the" → "USA"
10 displays total
```

**With Chunking (size=3)**:
```
"I am on" → "a" → "big red" → "car in" → "the" → "USA"
6 displays total (40% fewer displays)
```

### Chunking Benefits

- **Reduced Eye Strain**: Fewer transitions between words
- **Natural Phrases**: Groups function words with content words
- **Speed Improvement**: 10% faster timing for grouped chunks
- **Cognitive Flow**: Maintains phrase-level meaning

### Timing Adjustments for Chunks

Chunked words receive a small speed bonus:
- **Individual word**: Standard timing
- **Chunked words**: 90% of calculated time (10% speed bonus)

## ✨ Word Flicker Effects

Optional concentration enhancement through subtle visual effects:

### Flicker Mechanism

**Timing**: Activates 30% through each word's display time
**Effect**: Brief opacity reduction (100% → 30% → 100%)
**Duration**: Configurable percentage of word display time (default: 10%)

### Flicker Examples

At 400 WPM with 10% flicker:

| Word | Display Time | Flicker Start | Flicker Duration |
|------|--------------|---------------|------------------|
| "the" | 105ms | 32ms | 11ms |
| "reading" | 150ms | 45ms | 15ms |
| "algorithm" | 180ms | 54ms | 18ms |

### Purpose and Benefits

- **Attention Reset**: Brief visual change refocuses attention
- **Concentration Aid**: Prevents mental wandering during long sessions
- **Customizable**: Can be disabled or adjusted (5-20% of word time)
- **Subtle**: Doesn't disrupt reading flow when properly calibrated

### When to Use Flicker

**Recommended for**:
- Long reading sessions (>10 minutes)
- Technical or dense material
- When attention tends to wander

**Avoid when**:
- Reading in low light
- Eye strain or fatigue
- High-speed reading (>800 WPM)

## 🔧 Configuration and Customization

All advanced features can be configured through the reader preferences:

### Available Settings

| Feature | Default | Range | Description |
|---------|---------|--------|-------------|
| **Words Per Minute** | 400 | 100-1000+ | Base reading speed |
| **Chunk Size** | 1 (disabled) | 1-4 | Words to group together |
| **Word Flicker** | Disabled | On/Off | Concentration flicker effect |
| **Flicker Percent** | 10% | 5-20% | Portion of word time for flicker |
| **Pause After Comma** | Enabled | On/Off | +50% pause after commas |
| **Pause After Period** | Enabled | On/Off | +100% pause after periods |
| **Pause After Paragraph** | Enabled | On/Off | +250% pause after paragraphs |
| **Highlight Optimal Letter** | Enabled | On/Off | Orange letter highlighting |
| **Highlight Color** | #FF8C00 | Color | Optimal letter color |

### Recommended Configurations

**Beginner (200-400 WPM)**:
- Enable all punctuation pauses
- Chunk size: 2
- No flicker effect
- Full highlighting

**Intermediate (400-600 WPM)**:
- Enable period/paragraph pauses only
- Chunk size: 3
- Light flicker (5-10%)
- Full highlighting

**Advanced (600+ WPM)**:
- Minimal punctuation pauses
- Chunk size: 4
- Optional flicker (10-15%)
- Highlighting optional

This comprehensive algorithm creates a personalized, adaptive reading experience that scales with your skill level while maintaining optimal comprehension.