import type { AuthProvider } from './providers/types'
import type { AuthResult, User } from './types/user.types'
import { useAuthStore, getAuthState } from './state/auth.store'
import { storageService } from '../core/storage.service'
import { getAuthConfig } from './config/auth.config'

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
        await this.refreshUserData('login')
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
      await storageService.clearAuthData()
      store.setUser(null)
    } finally {
      store.setLoading(false)
    }
  }

  async refreshUserData(source?: string): Promise<User | null> {
    try {
      const user = await this.provider.getUser()
      const store = getAuthState()
      store.setUser(user)

      if (user) {
        await this.checkSubscriptionStatus(source)
      }

      return getAuthState().user
    } catch (error) {
      console.error('Error refreshing user data:', error)
      return null
    }
  }



  private async checkSubscriptionStatus(source?: string): Promise<'pro' | 'free'> {
    console.log(`checkSubscriptionStatus called from ${source || 'unknown'}`);
    const store = getAuthState()
    try {
      const token = await this.getToken()
      if (!token) {
        return 'free'
      }

      const config = getAuthConfig()
      const domain = config.kinde.domain.replace(/^https?:\/\//, '')
      const entitlementsUrl = `https://${domain}/account_api/v1/entitlements`

      const res = await fetch(entitlementsUrl, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (!res.ok) {
        console.warn(`Kinde API returned status ${res.status}. Using cached subscription status.`)
        const cachedUser = await storageService.readAuthUser()
        if (cachedUser?.subscriptionStatus) {
          return cachedUser.subscriptionStatus
        }
        console.warn(`Kinde API returned status ${res.status} and no cached user subscription status found.`)
        return 'free'
      }

      const responseData = await res.json()
      const entitlements = responseData.data?.entitlements ?? []
      const hasPermission = entitlements.some((e: any) => e.feature_key === 'ai_preprocessing')
      
      const status = hasPermission ? 'pro' : 'free'
      store.setSubscriptionStatus(status)

      const user = store.user
      if (user) {
        await storageService.writeAuthUser({ ...user, subscriptionStatus: status })
      }

      return status
    } catch (error) {
      console.error("Error checking subscription status:", error)
      return 'free'
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

  async initializeAuth(source?: string): Promise<void> {
    const store = getAuthState()
    store.setLoading(true)

    try {
      const isAuthenticated = await this.provider.isAuthenticated()

      if (isAuthenticated) {
        await this.refreshUserData(source || 'initializeAuth')
      } else {
        await storageService.clearAuthData()
        store.setUser(null)
      }
    } catch (error) {
      console.error('Error initializing auth:', error)
      await storageService.clearAuthData()
      store.setUser(null)
    } finally {
      store.setLoading(false)
    }
  }

  getAuthState() {
    return getAuthState()
  }

  subscribe(callback: (state: ReturnType<typeof getAuthState>) => void) {
    return useAuthStore.subscribe(callback)
  }
}
