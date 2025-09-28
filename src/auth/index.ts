// Main service and provider exports
export { AuthService } from './auth.service'
export { KindeProvider } from './providers/kinde.provider'

// Types and interfaces
export type { AuthProvider } from './providers/types'
export type { User, AuthResult, KindeConfig } from './types/user.types'

// Store
export { useAuthStore, getAuthState } from './state/auth.store'

// Configuration
export { AUTH_CONFIG, getKindeConfig } from './config/auth.config'

// Create default auth service instance
import { AuthService } from './auth.service'
import { KindeProvider } from './providers/kinde.provider'

export const authService = new AuthService(new KindeProvider())