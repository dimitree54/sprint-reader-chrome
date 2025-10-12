import { getTranslationLanguageLabel, type TranslationLanguage } from '../common/translation'
import type { SummarizationLevel } from '../common/summarization'
import { DEFAULTS } from '../config/defaults'

export type OpenAIChatCompletionsPayload = {
  model: string;
  messages: Array<{ role: 'system' | 'user'; content: string }>;
  temperature?: number;
}

const BOLD_FORMATTING_INSTRUCTION = 'Format the most important words and phrases with **bold** (use **word** format only, no other markdown syntax).'

export function buildChatCompletionPayload (
  text: string,
  targetLanguage: TranslationLanguage,
  summarizationLevel: SummarizationLevel,
  enabled: boolean
): OpenAIChatCompletionsPayload {
  const languageLabel = getTranslationLanguageLabel(targetLanguage)
  const normalizedText = text.trim()

  const systemContent = getSystemPrompt(languageLabel, summarizationLevel, enabled)

  return {
    model: DEFAULTS.OPENAI.model,
    messages: [
      { role: 'system', content: systemContent },
      { role: 'user', content: normalizedText }
    ]
  }
}

function getSystemPrompt (languageLabel: string, level: SummarizationLevel, enabled: boolean): string {
  if (!enabled) {
    switch (level) {
      case 'moderate':
        return [
          'Condense each paragraph by roughly 50%.',
          'Preserve the original document structure: maintain paragraphs, headings, and list items in the same order.',
          'Retain all critical facts, novel insights, and the overall purpose of the source content.',
          'Avoid diluting specialised terminology—keep key technical terms in the original language if required for accuracy.',
          BOLD_FORMATTING_INSTRUCTION,
          'Output only the condensed text in the same language as the source.'
        ].join(' ')
      case 'aggressive':
        return [
          'Produce a high-level summary, targeting roughly 30% of the original length.',
          'You may restructure the material and merge or drop paragraphs to focus on the most important insights.',
          'Highlight primary arguments, findings, and calls to action while omitting ancillary details.',
          'Preserve crucial specialised terms in the original language if translating them would reduce clarity.',
          BOLD_FORMATTING_INSTRUCTION,
          'Return only the summarised text in the same language as the source.'
        ].join(' ')
      default:
        return 'You are a helpful assistant.' // Should not happen
    }
  }

  switch (level) {
    case 'none':
      return [
        `You are a meticulous translator rendering content into ${languageLabel}.`,
        'Produce a strictly literal translation: mirror the sentence structure and retain every detail.',
        'Do not summarise, paraphrase, or omit information. Maintain headings, bullet lists, and numbering.',
        'Keep specialised terminology (scientific terms, product names, technical jargon) in the original language when no widely accepted equivalent exists.',
        BOLD_FORMATTING_INSTRUCTION,
        'Return only the translated text without commentary.'
      ].join(' ')
    case 'moderate':
      return [
        `Translate the text into ${languageLabel} while condensing each paragraph by roughly 50%.`,
        'Preserve the original document structure: maintain paragraphs, headings, and list items in the same order.',
        'Retain all critical facts, novel insights, and the overall purpose of the source content.',
        'Avoid diluting specialised terminology—keep key technical terms in the original language if required for accuracy.',
        BOLD_FORMATTING_INSTRUCTION,
        'Output only the condensed translation.'
      ].join(' ')
    case 'aggressive':
      return [
        `Produce a high-level summary in ${languageLabel}, targeting roughly 30% of the original length.`,
        'You may restructure the material and merge or drop paragraphs to focus on the most important insights.',
        'Highlight primary arguments, findings, and calls to action while omitting ancillary details.',
        'Preserve crucial specialised terms in the original language if translating them would reduce clarity.',
        BOLD_FORMATTING_INSTRUCTION,
        'Return only the summarised translation.'
      ].join(' ')
    default:
      return `Translate the following text to ${languageLabel}. ${BOLD_FORMATTING_INSTRUCTION}`
  }
}
