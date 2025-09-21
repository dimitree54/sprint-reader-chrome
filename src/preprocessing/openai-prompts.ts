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

export const SUMMARIZATION_LEVELS = ['none', 'moderate', 'aggressive'] as const
export type SummarizationLevel = typeof SUMMARIZATION_LEVELS[number]

export const SUPPORTED_LANGUAGES = [
  'english',
  'spanish',
  'french',
  'portuguese',
  'russian',
  'german',
  'turkish',
  'italian',
  'polish',
  'ukrainian',
  'dutch'
] as const satisfies readonly string[]

export type SupportedLanguage = typeof SUPPORTED_LANGUAGES[number]

export type LanguagePromptSet = Record<SummarizationLevel, string>

const rawLanguagePrompts: Record<SupportedLanguage, unknown> = {
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

function isLanguagePromptSet (value: unknown): value is LanguagePromptSet {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  for (const level of SUMMARIZATION_LEVELS) {
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

export const LANGUAGE_PROMPTS = promptsByLanguage

export function getSystemPrompt (language: SupportedLanguage, level: SummarizationLevel): string {
  return LANGUAGE_PROMPTS[language][level]
}
