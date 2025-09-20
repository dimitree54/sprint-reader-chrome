import { registerControls } from './controls'
import { registerMessageListener } from './messages'
import { loadSelectionContent } from './selection-loader'
import { state } from './state'

document.addEventListener('DOMContentLoaded', () => {
  loadSelectionContent().catch(console.error)
  registerControls()
  registerMessageListener()
})

if (typeof globalThis !== 'undefined') {
  (globalThis as typeof globalThis & { state?: typeof state }).state = state
}
