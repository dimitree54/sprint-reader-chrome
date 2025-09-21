export type WordItem = {
  text: string;
  originalText: string;
  optimalLetterPosition: number;
  pixelOffsetToOptimalLetter?: number;
  duration: number;
  predelay: number;
  postdelay: number;
  wordLength: number;
  frequency?: number;
  wordsInChunk: number;
  isGrouped: boolean;
  isBold: boolean;
}

export type TimingSettings = {
  wordsPerMinute: number;
  pauseAfterComma: boolean;
  pauseAfterPeriod: boolean;
  pauseAfterParagraph: boolean;
  chunkSize: number;
}
