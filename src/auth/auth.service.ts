import type { AuthProvider } from './providers/types'
import type { AuthResult, User } from './types/user.types'
import { useAuthStore, getAuthState } from './state/auth.store'
import { storageService } from '../core/storage.service'

export class AuthService {
  constructor(private readonly provider: AuthProvider) {}

  async login(): Promise<AuthResult> {
    const store = getAuthState()
    store.setLoading(true)
    store.clearError()

    try {
      const isAvailable = await this.provider.isAvailable()
      if (!isAvailable) {
        const error = 'Authentication provider is not properly configured'
        store.setError(error)
        return { success: false, error }
      }

      const result = await this.provider.login()
      if (result.success) {
        // After successful login, try to get user data
        await this.refreshUserData()
      } else {
        store.setError(result.error || 'Login failed')
      }

      return result
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      store.setError(errorMessage)
      return { success: false, error: errorMessage }
    } finally {
      store.setLoading(false)
    }
  }

  async logout(): Promise<void> {
    const store = getAuthState()
    store.setLoading(true)

    try {
      await this.provider.logout()
      await storageService.clearAuthData()
      store.setUser(null)
    } catch (error) {
      console.error('Logout error:', error)
      // Clear local state even if logout call fails
      await storageService.clearAuthData()
      store.setUser(null)
    } finally {
      store.setLoading(false)
    }
  }

  async refreshUserData(): Promise<User | null> {
    try {
      const user = await this.provider.getUser()
      const store = getAuthState()
      store.setUser(user)
      return user
    } catch (error) {
      console.error('Error refreshing user data:', error)
      return null
    }
  }

  async getToken(): Promise<string | null> {
    try {
      return await this.provider.getToken()
    } catch (error) {
      console.error('Error getting token:', error)
      return null
    }
  }

  async isAuthenticated(): Promise<boolean> {
    try {
      return await this.provider.isAuthenticated()
    } catch (error) {
      console.error('Error checking authentication:', error)
      return false
    }
  }

  async initializeAuth(): Promise<void> {
    const store = getAuthState()
    store.setLoading(true)

    try {
      // Check if user is authenticated with provider
      const isAuthenticated = await this.provider.isAuthenticated()

      if (isAuthenticated) {
        // Get fresh user data from provider
        await this.refreshUserData()
      } else {
        // Clear any stale local data
        await storageService.clearAuthData()
        store.setUser(null)
      }
    } catch (error) {
      console.error('Error initializing auth:', error)
      // Clear local data on error
      await storageService.clearAuthData()
      store.setUser(null)
    } finally {
      store.setLoading(false)
    }
  }

  // Get current authentication state
  getAuthState() {
    return getAuthState()
  }

  // Subscribe to auth state changes
  subscribe(callback: (state: ReturnType<typeof getAuthState>) => void) {
    return useAuthStore.subscribe(callback)
  }
}