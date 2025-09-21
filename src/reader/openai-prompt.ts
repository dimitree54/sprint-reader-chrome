import { getTranslationLanguageLabel, type TranslationLanguage } from '../common/translation'
import type { SummarizationLevel } from '../common/summarization'
import { DEFAULTS } from '../config/defaults'

export type OpenAIResponsesPayload = {
  model: string;
  /**
   * System behavior/instructions for the model (equivalent to a "system" message).
   */
  instructions?: string;
  /**
   * Responses API chat-style input. For simple text, one user turn is sufficient.
   */
  input: { role: 'user' | 'system'; content: string }[];
  /** Sampling temperature (optional). */
  temperature?: number;
  /** Optional reasoning control (minimal | low | medium | high). Omit to not constrain. */
  reasoning?: { effort?: 'minimal' | 'low' | 'medium' | 'high' };
  /** Optional processing tier. "flex" is cheaper/slower; "priority" faster (if enabled). */
  service_tier?: 'auto' | 'default' | 'flex' | 'priority' | 'scale';
}

const BOLD_FORMATTING_INSTRUCTION = 'Format the most important words and phrases with **bold** (use **word** format only, no other markdown syntax).'

export function buildTranslationPromptPayload (
  text: string,
  targetLanguage: TranslationLanguage,
  summarizationLevel: SummarizationLevel
): OpenAIResponsesPayload {
  const languageLabel = getTranslationLanguageLabel(targetLanguage)
  const normalizedText = text.trim()

  const systemContent = getSystemPrompt(languageLabel, summarizationLevel)

  return {
    model: DEFAULTS.OPENAI.model,
    instructions: systemContent,
    service_tier: DEFAULTS.OPENAI.service_tier,
    reasoning: DEFAULTS.OPENAI.reasoning,
    input: [
      {
        role: 'user',
        content: normalizedText
      }
    ]
  }
}

function getSystemPrompt (languageLabel: string, level: SummarizationLevel): string {
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
