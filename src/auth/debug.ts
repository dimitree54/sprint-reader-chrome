/**
 * Debug utilities for Kinde authentication
 * Only available in development mode
 */

import { getAuthConfig, validateAuthConfig } from './config/auth.config'
import { authService } from './index'

export class AuthDebugger {
  static logConfiguration(): void {
    if (process.env.NODE_ENV !== 'development') {
      return
    }

    console.group('🔐 Kinde Authentication Debug')

    // Log configuration
    const config = getAuthConfig()
    console.log('📋 Configuration:')
    console.log('  Client ID:', config.kinde.clientId ? '✅ Set' : '❌ Missing')
    console.log('  Domain:', config.kinde.domain || '❌ Missing')
    console.log('  Redirect URI:', config.kinde.redirectUri)

    // Log validation
    const validation = validateAuthConfig()
    console.log('🔍 Validation:', validation.isValid ? '✅ Valid' : '❌ Invalid')
    if (!validation.isValid) {
      console.warn('  Missing:', validation.missingFields)
    }

    // Log Chrome APIs
    console.log('🌐 Chrome APIs:')
    console.log('  Identity API:', chrome?.identity ? '✅ Available' : '❌ Missing')
    console.log('  Extension ID:', chrome?.runtime?.id || '❌ Missing')

    console.groupEnd()
  }

  static async logAuthState(): Promise<void> {
    if (process.env.NODE_ENV !== 'development') {
      return
    }

    console.group('👤 Authentication State')

    try {
      const authState = authService.getAuthState()
      console.log('🔒 Auth State:')
      console.log('  Authenticated:', authState.isAuthenticated ? '✅ Yes' : '❌ No')
      console.log('  Loading:', authState.isLoading ? '⏳ Yes' : '✅ No')
      console.log('  Error:', authState.error || 'None')
      console.log('  User:', authState.user ? '✅ Present' : '❌ Missing')

      if (authState.user) {
        console.log('👤 User Details:')
        console.log('  ID:', authState.user.id)
        console.log('  Email:', authState.user.email || 'Not provided')
        console.log('  Name:', `${authState.user.given_name || ''} ${authState.user.family_name || ''}`.trim() || 'Not provided')
      }

      const token = await authService.getToken()
      console.log('🎫 Token:', token ? '✅ Present' : '❌ Missing')

    } catch (error) {
      console.error('Error logging auth state:', error)
    }

    console.groupEnd()
  }

  static async testAuthentication(): Promise<void> {
    if (process.env.NODE_ENV !== 'development') {
      return
    }

    console.group('🧪 Authentication Test')

    try {
      // Log current state
      await this.logAuthState()

      // Test provider availability
      console.log('🔍 Testing provider availability...')
      // Access the provider directly (this is a bit hacky but for debugging)
      const kindeProvider = (authService as { provider: { isAvailable(): Promise<boolean> } }).provider
      const isAvailable = await kindeProvider.isAvailable()
      console.log('Provider available:', isAvailable ? '✅ Yes' : '❌ No')

      if (!isAvailable) {
        console.warn('❌ Provider not available. Check configuration.')
        return
      }

      console.log('✅ Ready for authentication test')
      console.log('💡 Click the "Sign In" button in settings to test the flow')

    } catch (error) {
      console.error('Error testing authentication:', error)
    }

    console.groupEnd()
  }
}

// Expose debug utilities globally in development
if (process.env.NODE_ENV === 'development') {
  (globalThis as typeof globalThis & { authDebug: typeof AuthDebugger }).authDebug = AuthDebugger
  console.log('🔧 Auth debugging available via: authDebug.logConfiguration(), authDebug.logAuthState(), authDebug.testAuthentication()')
}