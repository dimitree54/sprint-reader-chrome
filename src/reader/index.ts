import { registerControls } from './controls'
import { registerMessageListener } from './messages'
import { loadSelectionContent } from './selection-loader'
import { renderCurrentWord } from './render'
import { registerRenderCallback } from './text'
import { state } from './state'
import { DEFAULTS } from '../config/defaults'
import { initRenderer } from './ui/renderer'
import { initStoreBoundControls } from './ui/store-controls'

function initializeCSSVariables(): void {
  const root = document.documentElement
  root.style.setProperty('--reader-default-font-size', DEFAULTS.UI.optimalFontSize)
}

document.addEventListener('DOMContentLoaded', () => {
  initializeCSSVariables()
  registerRenderCallback(renderCurrentWord)
  loadSelectionContent().catch(console.error)
  registerControls()
  registerMessageListener()
  // Initialize store-driven renderer and controls (non-breaking augmentation)
  try { initRenderer() } catch (e) { console.warn('Renderer init failed', e) }
  try { initStoreBoundControls() } catch (e) { console.warn('Controls binding init failed', e) }
})

if (typeof globalThis !== 'undefined') {
  (globalThis as typeof globalThis & { state?: typeof state }).state = state
}
