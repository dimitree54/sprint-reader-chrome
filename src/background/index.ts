import { registerBackgroundListeners } from './listeners'
import { primeBackgroundState } from './message-handler'
import { exposeTestingHooks } from './testing-hooks'
import { authService } from '../auth'

// Register listeners as early as possible to ensure install/update events are captured reliably
registerBackgroundListeners()
// Then prime background state (preferences, etc.)
primeBackgroundState().catch(console.error)
// Initialize authentication state
authService.initializeAuth().catch(console.error)
// Expose testing hooks after initialization
exposeTestingHooks()