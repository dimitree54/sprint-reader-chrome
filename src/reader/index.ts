import { bindControls } from './ui/controls'
import { registerMessageListener } from './messages'
import { loadSelectionContent } from './selection-loader'
import { useReaderStore } from './state/reader.store'
import { DEFAULTS } from '../config/defaults'
import { initRenderer } from './ui/renderer'
import { authService } from '../auth'
import { applyExtensionName } from '../common/app-name'
import { initCtaButton } from './ui/cta';

function initializeCSSVariables(): void {
  const root = document.documentElement
  root.style.setProperty('--reader-default-font-size', DEFAULTS.UI.optimalFontSize)
}

document.addEventListener('DOMContentLoaded', () => {
  applyExtensionName()
  initializeCSSVariables()
  // Initialize authentication state in reader context
  authService.initializeAuth('reader').catch(console.error)
  loadSelectionContent().catch(console.error)
  registerMessageListener()
  // Initialize store-driven renderer and capture unsubscribe
  const unsubscribe = initRenderer()
  const { chunkSize } = useReaderStore.getState()
  console.info('[Reader] chunkSize:', chunkSize, 'maxWordLengthForGrouping:', DEFAULTS.WORD_PROCESSING.maxWordLengthForGrouping)
  bindControls()
  initCtaButton()
  // Register beforeunload to cleanup store subscriptions
  window.addEventListener('beforeunload', () => unsubscribe())
})

if (typeof globalThis !== 'undefined' && process.env.NODE_ENV !== 'production') {
  (globalThis as typeof globalThis & { readerStore?: typeof useReaderStore }).readerStore = useReaderStore
}
