import { type TranslationLanguage } from '../common/translation'
import type { SummarizationLevel } from '../common/summarization'
import { DEFAULTS } from '../config/defaults'
import { getSystemPrompt } from './system-prompts'

export type OpenAIChatCompletionsPayload = {
  model: string;
  messages: Array<{ role: 'system' | 'user'; content: string }>;
  temperature?: number;
}

export function buildChatCompletionPayload (
  text: string,
  targetLanguage: TranslationLanguage,
  summarizationLevel: SummarizationLevel,
  enabled: boolean
): OpenAIChatCompletionsPayload {
  const normalizedText = text.trim()

  const systemContent = getSystemPrompt(summarizationLevel, enabled, targetLanguage)

  return {
    model: DEFAULTS.OPENAI.model,
    messages: [
      { role: 'system', content: systemContent },
      { role: 'user', content: normalizedText }
    ]
  }
}
