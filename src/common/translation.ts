import { DEFAULTS } from '../config/defaults'

export const TRANSLATION_LANGUAGES = [
  { value: 'none', label: 'Do not translate' },
  { value: 'af', label: 'Afrikaans' },
  { value: 'sq', label: 'Albanian' },
  { value: 'ar', label: 'Arabic' },
  { value: 'bn', label: 'Bengali' },
  { value: 'bg', label: 'Bulgarian' },
  { value: 'ca', label: 'Catalan' },
  { value: 'zh-CN', label: 'Chinese (Simplified)' },
  { value: 'zh-TW', label: 'Chinese (Traditional)' },
  { value: 'hr', label: 'Croatian' },
  { value: 'cs', label: 'Czech' },
  { value: 'da', label: 'Danish' },
  { value: 'nl', label: 'Dutch' },
  { value: 'en', label: 'English' },
  { value: 'et', label: 'Estonian' },
  { value: 'tl', label: 'Filipino/Tagalog' },
  { value: 'fi', label: 'Finnish' },
  { value: 'fr', label: 'French' },
  { value: 'de', label: 'German' },
  { value: 'el', label: 'Greek' },
  { value: 'he', label: 'Hebrew' },
  { value: 'hi', label: 'Hindi' },
  { value: 'hu', label: 'Hungarian' },
  { value: 'id', label: 'Indonesian' },
  { value: 'it', label: 'Italian' },
  { value: 'ja', label: 'Japanese' },
  { value: 'ko', label: 'Korean' },
  { value: 'lv', label: 'Latvian' },
  { value: 'lt', label: 'Lithuanian' },
  { value: 'ms', label: 'Malay' },
  { value: 'nb', label: 'Norwegian Bokmål' },
  { value: 'fa', label: 'Persian (Farsi)' },
  { value: 'pl', label: 'Polish' },
  { value: 'pt-BR', label: 'Portuguese (Brazil)' },
  { value: 'pt', label: 'Portuguese (Portugal)' },
  { value: 'ro', label: 'Romanian' },
  { value: 'ru', label: 'Russian' },
  { value: 'sr', label: 'Serbian' },
  { value: 'sk', label: 'Slovak' },
  { value: 'sl', label: 'Slovenian' },
  { value: 'es', label: 'Spanish' },
  { value: 'sw', label: 'Swahili' },
  { value: 'sv', label: 'Swedish' },
  { value: 'th', label: 'Thai' },
  { value: 'tr', label: 'Turkish' },
  { value: 'uk', label: 'Ukrainian' },
  { value: 'ur', label: 'Urdu' },
  { value: 'vi', label: 'Vietnamese' },
  { value: 'yo', label: 'Yoruba' }
] as const

export type TranslationLanguage = typeof TRANSLATION_LANGUAGES[number]['value']

export const DEFAULT_TRANSLATION_LANGUAGE: TranslationLanguage = DEFAULTS.TRANSLATION.defaultLanguage

export function isTranslationLanguage (value: string): value is TranslationLanguage {
  return TRANSLATION_LANGUAGES.some(option => option.value === value)
}

export function getTranslationLanguageLabel (value: string): string {
  const matched = TRANSLATION_LANGUAGES.find(option => option.value === value)
  if (matched) {
    return matched.label
  }
  const fallback = TRANSLATION_LANGUAGES[0]
  return fallback.label
}
