import type { ReaderTheme } from './storage'

export type ThemeOptions = {
  lightClass: string;
  darkClass: string;
  dataAttribute?: string;
}

export function applyThemeToElement (
  element: HTMLElement | null,
  theme: ReaderTheme,
  options: ThemeOptions
): void {
  if (!element) {
    return
  }

  const { lightClass, darkClass, dataAttribute = 'theme' } = options
  element.classList.toggle(lightClass, theme === 'light')
  element.classList.toggle(darkClass, theme !== 'light')

  if (dataAttribute) {
    element.dataset[dataAttribute] = theme
  }
}
