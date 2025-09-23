const WORD_FREQUENCIES: Record<string, number> = {
  the: 4038615,
  of: 2086675,
  and: 1620968,
  a: 1543676,
  to: 1458447,
  in: 1141261,
  is: 1052329,
  you: 996657,
  that: 956536,
  it: 956535,
  he: 908351,
  was: 857775,
  for: 831445,
  on: 757344,
  are: 729492,
  as: 681214,
  with: 668014,
  his: 649825,
  they: 567529,
  i: 567526,
  at: 548989,
  be: 527405,
  this: 524724,
  have: 524220,
  from: 481918,
  or: 474471,
  one: 441628,
  had: 437324,
  by: 424948,
  word: 422444,
  but: 418859,
  not: 409251,
  what: 390097,
  all: 386888,
  were: 378193,
  we: 344788,
  when: 332733,
  your: 328163,
  can: 327473,
  said: 318318,
  there: 314887,
  each: 304613,
  which: 301080,
  she: 293048,
  do: 289925,
  how: 289414,
  their: 285391,
  if: 284992,
  will: 256933,
  up: 254545,
  other: 236431,
  about: 235524,
  out: 233949,
  many: 230372,
  then: 229761,
  them: 225991,
  these: 221260,
  so: 219056,
  some: 218068,
  her: 216867,
  would: 214398,
  make: 208712,
  like: 206476,
  into: 199722,
  him: 195186,
  has: 193023,
  two: 191427,
  more: 189019,
  very: 188068,
  after: 186716,
  words: 183525,
  first: 179954,
  its: 176551,
  new: 174624,
  who: 171587,
  could: 168283,
  time: 167336,
  been: 159753,
  call: 157945,
  way: 157325,
  find: 157062,
  right: 155327,
  may: 154350,
  down: 152893,
  side: 152370
}

export function getWordFrequency (word: string): number {
  const lowerWord = word.toLowerCase().replace(/[^a-z]/g, '')
  return WORD_FREQUENCIES[lowerWord] || 1000
}

export function calculateShannonEntropy (text: string): number {
  const chars = text.toLowerCase().split('')
  const frequencies: Record<string, number> = {}

  for (const char of chars) {
    frequencies[char] = (frequencies[char] || 0) + 1
  }

  let entropy = 0
  for (const freq of Object.values(frequencies)) {
    const probability = freq / chars.length
    entropy -= probability * Math.log2(probability)
  }

  return entropy
}

export function detectPunctuation (text: string): { hasComma: boolean; hasPeriod: boolean; isParagraph: boolean } {
  return {
    hasComma: /[,;:]/.test(text),
    hasPeriod: /[.!?]/.test(text),
    isParagraph: text.includes('\n\n') || text.includes('\r\n\r\n')
  }
}

export function assignOptimalLetterPosition (text: string): number {
  const letterIndices: number[] = []
  for (let i = 0; i < text.length; i++) {
    // Use a regex to match any Unicode letter or number, ensuring we don't select punctuation or symbols
    if (/[\p{L}\p{N}]/u.test(text[i])) {
      letterIndices.push(i + 1)
    }
  }

  const count = letterIndices.length
  if (count === 0) return 0 // No letters or numbers found, indicating no valid highlight position

  // Existing logic for determining optimal position based on letter count
  if (count === 1) return letterIndices[0]
  if (count <= 4) return letterIndices[1] ?? letterIndices[count - 1]
  if (count <= 9) return letterIndices[2] ?? letterIndices[count - 1]
  return letterIndices[3] ?? letterIndices[count - 1]
}
