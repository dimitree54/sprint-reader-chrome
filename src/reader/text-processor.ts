/**
 * Advanced text preprocessing for optimal RSVP reading
 * Handles acronyms, numbers, and long word splitting
 */


export function consolidateAcronyms(words: string[]): string[] {
  const result: string[] = [];
  let i = 0;

  while (i < words.length) {
    const word = words[i];

    // Check if this looks like an acronym (2-4 uppercase letters)
    if (/^[A-Z]{2,4}$/.test(word) && i + 1 < words.length) {
      // Check if next words are also part of acronym
      let acronym = word;
      let j = i + 1;

      while (j < words.length && j < i + 3 && /^[A-Z]{1,2}$/.test(words[j])) {
        acronym += words[j];
        j++;
      }

      if (j > i + 1) {
        result.push(acronym);
        i = j;
        continue;
      }
    }

    result.push(word);
    i++;
  }

  return result;
}

export function preserveNumbersDecimals(words: string[]): string[] {
  const result: string[] = [];
  let i = 0;

  while (i < words.length) {
    const word = words[i];

    // Check for number patterns like "3.14" or "1,000"
    if (/^\d+$/.test(word) && i + 1 < words.length) {
      const next = words[i + 1];

      // Decimal point case: "3" + "." + "14"
      if (next === '.' && i + 2 < words.length && /^\d+$/.test(words[i + 2])) {
        result.push(word + '.' + words[i + 2]);
        i += 3;
        continue;
      }

      // Comma in numbers: "1" + "," + "000"
      if (next === ',' && i + 2 < words.length && /^\d+$/.test(words[i + 2])) {
        result.push(word + ',' + words[i + 2]);
        i += 3;
        continue;
      }
    }

    result.push(word);
    i++;
  }

  return result;
}

export function splitLongWords(text: string): string[] {
  // Split words longer than 17 characters for better readability
  if (text.length <= 17) return [text];

  const parts: string[] = [];
  let remaining = text;

  while (remaining.length > 17) {
    // Try to find a good break point (vowel or consonant cluster)
    let breakPoint = 12;
    for (let i = 10; i <= 15 && i < remaining.length; i++) {
      if (/[aeiou]/.test(remaining[i])) {
        breakPoint = i + 1;
        break;
      }
    }

    parts.push(remaining.substring(0, breakPoint));
    remaining = remaining.substring(breakPoint);
  }

  if (remaining.length > 0) {
    parts.push(remaining);
  }

  return parts;
}

export function preprocessText(text: string): string[] {
  // Step 1: Preserve paragraph breaks, then normalize other whitespace
  const PARA = '¶¶';
  const preserved = text.replace(/\r?\n\r?\n/g, ` ${PARA} `);
  const normalized = preserved.replace(/\s+/g, ' ').trim();
  let words = normalized.length > 0 ? normalized.split(' ') : [];
  // Restore paragraph markers as actual double newlines so downstream can detect
  words = words.map(w => (w === PARA ? '\n\n' : w));

  // Step 2: Consolidate acronyms
  words = consolidateAcronyms(words);

  // Step 3: Preserve numbers with decimals/commas
  words = preserveNumbersDecimals(words);

  // Step 4: Split very long words
  const finalWords: string[] = [];
  words.forEach(word => {
    const splitWords = splitLongWords(word);
    finalWords.push(...splitWords);
  });

  return finalWords;
}