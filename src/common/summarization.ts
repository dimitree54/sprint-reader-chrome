import { DEFAULTS } from '../config/defaults'

export const SUMMARIZATION_LEVELS = [
  { value: 'none', label: 'No summarization', sliderIndex: 0 } as const,
  { value: 'moderate', label: 'Moderate summarization', sliderIndex: 1 } as const,
  { value: 'aggressive', label: 'Significant summarization', sliderIndex: 2 } as const
]

export type SummarizationLevel = typeof SUMMARIZATION_LEVELS[number]['value']

export const DEFAULT_SUMMARIZATION_LEVEL: SummarizationLevel = DEFAULTS.SUMMARIZATION.defaultLevel

export function isSummarizationLevel (value: string): value is SummarizationLevel {
  return SUMMARIZATION_LEVELS.some(level => level.value === value)
}

export function getSummarizationLevelLabel (value: SummarizationLevel): string {
  const level = SUMMARIZATION_LEVELS.find(item => item.value === value)
  return level ? level.label : SUMMARIZATION_LEVELS[0].label
}

export function sliderIndexToSummarizationLevel (index: number): SummarizationLevel {
  const level = SUMMARIZATION_LEVELS.find(item => item.sliderIndex === index)
  return level ? level.value : DEFAULT_SUMMARIZATION_LEVEL
}

export function summarizationLevelToSliderIndex (value: SummarizationLevel): number {
  const level = SUMMARIZATION_LEVELS.find(item => item.value === value)
  return level ? level.sliderIndex : 0
}
