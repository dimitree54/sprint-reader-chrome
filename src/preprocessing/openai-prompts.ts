import englishPrompts from './prompts/english.json'
import spanishPrompts from './prompts/spanish.json'
import frenchPrompts from './prompts/french.json'
import portuguesePrompts from './prompts/portuguese.json'
import russianPrompts from './prompts/russian.json'
import germanPrompts from './prompts/german.json'
import turkishPrompts from './prompts/turkish.json'
import italianPrompts from './prompts/italian.json'
import polishPrompts from './prompts/polish.json'
import ukrainianPrompts from './prompts/ukrainian.json'
import dutchPrompts from './prompts/dutch.json'
import noTranslationPrompts from './prompts/no-translation.json'
import { SUMMARIZATION_LEVELS, type SummarizationLevel } from '../common/summarization'
import { getSupportedPromptLanguages, getPromptFilename, type TranslationLanguage } from '../common/translation'
import { DEFAULTS } from '../config/defaults'

// Extract the values array for iteration
const SUMMARIZATION_LEVEL_VALUES = SUMMARIZATION_LEVELS.map(s => s.value)

export const SUPPORTED_LANGUAGES = getSupportedPromptLanguages()

export type SupportedLanguage = TranslationLanguage

export type LanguagePromptSet = Record<SummarizationLevel, string>

// Map from filename to actual imported prompt data
const filenameToPrompts: Record<string, unknown> = {
  english: englishPrompts,
  spanish: spanishPrompts,
  french: frenchPrompts,
  portuguese: portuguesePrompts,
  russian: russianPrompts,
  german: germanPrompts,
  turkish: turkishPrompts,
  italian: italianPrompts,
  polish: polishPrompts,
  ukrainian: ukrainianPrompts,
  dutch: dutchPrompts
}

// Create the mapping using ISO codes
const rawLanguagePrompts: Record<SupportedLanguage, unknown> = Object.fromEntries(
  SUPPORTED_LANGUAGES.map(langCode => {
    const filename = getPromptFilename(langCode)
    if (!filename || !filenameToPrompts[filename]) {
      throw new Error(`No prompt file found for language: ${langCode}`)
    }
    return [langCode, filenameToPrompts[filename]]
  })
) as Record<SupportedLanguage, unknown>

function isLanguagePromptSet (value: unknown, checkNone = true): value is LanguagePromptSet {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  for (const level of SUMMARIZATION_LEVEL_VALUES) {
    if (!checkNone && level === 'none') {
      continue
    }
    if (typeof (value as Record<string, unknown>)[level] !== 'string') {
      return false
    }
  }

  return true
}

const promptsByLanguage: Record<SupportedLanguage, LanguagePromptSet> = Object.fromEntries(
  Object.entries(rawLanguagePrompts).map(([language, prompts]) => {
    if (!isLanguagePromptSet(prompts)) {
      throw new Error(`Invalid prompt configuration for language: ${language}`)
    }
    return [language as SupportedLanguage, prompts]
  })
) as Record<SupportedLanguage, LanguagePromptSet>

if (!isLanguagePromptSet(noTranslationPrompts, false)) {
  throw new Error('Invalid prompt configuration for no-translation prompts')
}
const NO_TRANSLATION_PROMPTS: LanguagePromptSet = noTranslationPrompts

export const LANGUAGE_PROMPTS = promptsByLanguage

export function getSystemPrompt (
  language: TranslationLanguage,
  level: SummarizationLevel,
  translationEnabled: boolean
): string {
  if (!translationEnabled) {
    return NO_TRANSLATION_PROMPTS[level]
  }

  if (language === 'none') {
    return LANGUAGE_PROMPTS.en[level]
  }

  if (SUPPORTED_LANGUAGES.includes(language)) {
    return LANGUAGE_PROMPTS[language as SupportedLanguage][level]
  }

  return LANGUAGE_PROMPTS.en[level]
}

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

  const systemContent = getSystemPrompt(targetLanguage, summarizationLevel, enabled)

  return {
    model: DEFAULTS.OPENAI.model,
    messages: [
      { role: 'system', content: systemContent },
      { role: 'user', content: normalizedText }
    ]
  }
}
