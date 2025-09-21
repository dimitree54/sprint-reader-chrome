import { registerBackgroundListeners } from './listeners'
import { primeBackgroundState } from './message-handler'
import { exposeTestingHooks } from './testing-hooks'

primeBackgroundState().catch(console.error)
registerBackgroundListeners()
exposeTestingHooks()
