import { bindControls } from './ui/controls'
import { registerMessageListener } from './messages'
import { loadSelectionContent } from './selection-loader'
import { useReaderStore } from './state/reader.store'
import { DEFAULTS } from '../config/defaults'
import { initRenderer } from './ui/renderer'

function initializeCSSVariables(): void {
  const root = document.documentElement
  root.style.setProperty('--reader-default-font-size', DEFAULTS.UI.optimalFontSize)
}

document.addEventListener('DOMContentLoaded', () => {
  initializeCSSVariables()
  loadSelectionContent().catch(console.error)
  bindControls()
  registerMessageListener()
  // Initialize store-driven renderer and controls
  initRenderer()
})

if (typeof globalThis !== 'undefined') {
  (globalThis as typeof globalThis & { readerStore?: typeof useReaderStore }).readerStore = useReaderStore
}
