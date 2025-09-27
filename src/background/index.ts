import { registerBackgroundListeners } from './listeners'
import { primeBackgroundState } from './message-handler'
import { exposeTestingHooks } from './testing-hooks'

// Register listeners as early as possible to ensure install/update events are captured reliably
registerBackgroundListeners()
// Then prime background state (preferences, etc.)
primeBackgroundState().catch(console.error)
// Expose testing hooks after initialization
exposeTestingHooks()
