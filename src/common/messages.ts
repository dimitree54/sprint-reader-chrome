import type { ReaderTheme } from './storage';

export type BackgroundMessage =
  | {
      target: 'background';
      type: 'getSelection';
      selectedText: string;
      haveSelection: boolean;
      dirRTL: boolean;
    }
  | {
      target: 'background';
      type: 'openReaderFromContextMenu';
      selectionText: string;
    }
  | {
      target: 'background';
      type: 'openReaderFromPopup';
      selectionText?: string;
      wordsPerMinute: number;
      theme?: ReaderTheme;
    }
  | {
      target: 'background';
      type: 'openReaderFromContent';
      selectionText: string;
      haveSelection: boolean;
      dirRTL: boolean;
    }
  | {
      target: 'background';
      type: 'getMenuEntryText';
    };

export type ReaderMessage =
  | {
      target: 'reader';
      type: 'refreshReader';
    };

export type BackgroundResponse =
  | {
      menuEntryText: string;
    };

export type ContentRequest =
  | {
      target: 'content';
      type: 'getMouseCoordinates';
    }
  | {
      target: 'content';
      type: 'showSelectionHint';
      x: number;
      y: number;
    }
  | {
      target: 'content';
      type: 'hideSelectionHint';
    };

export type RuntimeMessage = BackgroundMessage | ReaderMessage | ContentRequest;
