import { registerControls } from './controls'
import { registerMessageListener } from './messages'
import { loadSelectionContent } from './selection-loader'
import { state } from './state'
import { DEFAULTS } from '../config/defaults'

function initializeCSSVariables(): void {
  const root = document.documentElement
  root.style.setProperty('--reader-default-font-size', DEFAULTS.UI.optimalFontSize)
}

document.addEventListener('DOMContentLoaded', () => {
  initializeCSSVariables()
  loadSelectionContent().catch(console.error)
  registerControls()
  registerMessageListener()
})

if (typeof globalThis !== 'undefined') {
  (globalThis as typeof globalThis & { state?: typeof state }).state = state
}
