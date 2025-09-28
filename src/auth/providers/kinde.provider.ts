import type { AuthProvider } from './types'
import type { AuthResult, User } from '../types/user.types'
import { storageService } from '../../core/storage.service'
import { getAuthConfig } from '../config/auth.config'

export class KindeProvider implements AuthProvider {
  name = 'kinde'

  async isAvailable(): Promise<boolean> {
    try {
      const config = getAuthConfig()
      return !!(config.kinde.clientId && config.kinde.domain)
    } catch (error) {
      console.error('Error checking Kinde availability:', error)
      return false
    }
  }

  async login(): Promise<AuthResult> {
    try {
      const config = getAuthConfig()

      if (!config.kinde.clientId || !config.kinde.domain) {
        return {
          success: false,
          error: 'Kinde configuration missing. Please check your environment variables.'
        }
      }

      const authUrl = await this.buildAuthUrl(config)

      if (!chrome?.identity?.launchWebAuthFlow) {
        return {
          success: false,
          error: 'Chrome Identity API not available'
        }
      }

      const redirectUrl = await this.launchWebAuthFlow(authUrl)

      const authCode = this.extractAuthCode(redirectUrl)
      if (!authCode) {
        return {
          success: false,
          error: 'No authorization code received'
        }
      }

      const tokens = await this.exchangeCodeForTokens(authCode, config)
      const user = await this.getUserFromToken(tokens.access_token, config)

      await storageService.writeAuthToken(tokens.access_token)
      if (user) {
        await storageService.writeAuthUser(user)
      }

      return {
        success: true,
        ...(user && { user }),
        token: tokens.access_token
      }
    } catch (error) {
      console.error('Kinde login error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Login failed'
      }
    }
  }

  async logout(): Promise<void> {
    try {
      const config = getAuthConfig()
      const domain = config.kinde.domain.replace(/^https?:\/\//, '')
      
      // The redirect URI for logout should be the same as for login
      const postLogoutRedirectUri = config.kinde.redirectUri
      
      const logoutUrl = `https://${domain}/logout?post_logout_redirect_uri=${encodeURIComponent(postLogoutRedirectUri)}`

      // Open the logout URL in a new window.
      // We don't need to do anything with the result, just open it.
      await this.launchWebAuthFlow(logoutUrl)

      // Clear stored auth data
      await storageService.writeAuthToken(null)
      await storageService.writeAuthUser(null)

      console.log('User logged out successfully from Kinde and extension')
    } catch (error) {
      // Don't throw error if user closes the window
      if (error instanceof Error && error.message.includes('closed by the user')) {
        console.log('Logout window closed by user.');
      } else {
        console.error('Kinde logout error:', error)
      }
      // Still attempt to clear local data
      await storageService.writeAuthToken(null)
      await storageService.writeAuthUser(null)
    }
  }

  async getUser(): Promise<User | null> {
    try {
      return await storageService.readAuthUser()
    } catch (error) {
      console.error('Error getting Kinde user:', error)
      return null
    }
  }

  async getToken(): Promise<string | null> {
    try {
      return await storageService.readAuthToken()
    } catch (error) {
      console.error('Error getting Kinde token:', error)
      return null
    }
  }

  async isAuthenticated(): Promise<boolean> {
    try {
      const token = await this.getToken()
      const user = await this.getUser()
      return !!(token && user)
    } catch (error) {
      console.error('Error checking Kinde authentication:', error)
      return false
    }
  }

  private async buildAuthUrl(config: ReturnType<typeof getAuthConfig>): Promise<string> {
    const { codeVerifier, codeChallenge } = await this.generatePKCE()
    await this.storeCodeVerifier(codeVerifier)

    const state = this.generateRandomString(32)

    const params = new URLSearchParams({
      client_id: config.kinde.clientId,
      redirect_uri: config.kinde.redirectUri,
      response_type: 'code',
      scope: 'openid profile email',
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
      state
    })

    const domain = config.kinde.domain.replace(/^https?:\/\//, '')
    return `https://${domain}/oauth2/auth?${params.toString()}`
  }

  private async launchWebAuthFlow(authUrl: string): Promise<string> {
    return new Promise((resolve, reject) => {
      chrome.identity.launchWebAuthFlow(
        {
          url: authUrl,
          interactive: true
        },
        (redirectUrl) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message))
          } else if (redirectUrl) {
            resolve(redirectUrl)
          } else {
            reject(new Error('No redirect URL received'))
          }
        }
      )
    })
  }

  private extractAuthCode(redirectUrl: string): string | null {
    try {
      const url = new URL(redirectUrl)
      return url.searchParams.get('code')
    } catch (error) {
      console.error('Error parsing redirect URL:', error)
      return null
    }
  }

  private async exchangeCodeForTokens(authCode: string, config: ReturnType<typeof getAuthConfig>): Promise<{
    access_token: string;
    token_type: string;
    expires_in: number;
    refresh_token?: string;
  }> {
    const codeVerifier = await this.getStoredCodeVerifier()
    const domain = config.kinde.domain.replace(/^https?:\/\//, '')

    const response = await fetch(`https://${domain}/oauth2/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: config.kinde.clientId,
        code: authCode,
        redirect_uri: config.kinde.redirectUri,
        code_verifier: codeVerifier || ''
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Token exchange failed: ${response.status} - ${errorText}`)
    }

    return await response.json()
  }

  private async getUserFromToken(accessToken: string, config: ReturnType<typeof getAuthConfig>): Promise<User | null> {
    try {
      const domain = config.kinde.domain.replace(/^https?:\/\//, '')

      const response = await fetch(`https://${domain}/oauth2/user_profile`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      })

      if (!response.ok) {
        console.error('Failed to get user profile:', response.status)
        return null
      }

      const kindeUser = await response.json()

      const user: User = {
        id: kindeUser.sub || kindeUser.id || '',
        email: kindeUser.email,
        given_name: kindeUser.given_name,
        family_name: kindeUser.family_name,
        picture: kindeUser.picture,
        username: kindeUser.preferred_username
      }

      return user
    } catch (error) {
      console.error('Error getting user from token:', error)
      return null
    }
  }

  private generateRandomString(length: number): string {
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    let text = ''
    for (let i = 0; i < length; i++) {
      text += possible.charAt(Math.floor(Math.random() * possible.length))
    }
    return text
  }

  private async generatePKCE(): Promise<{ codeVerifier: string; codeChallenge: string }> {
    const codeVerifier = this.generateRandomString(128)
    const codeChallenge = await this.base64URLEncode(await this.sha256(codeVerifier))
    return { codeVerifier, codeChallenge }
  }

  private async storeCodeVerifier(codeVerifier: string): Promise<void> {
    await chrome.storage.local.set({ kinde_code_verifier: codeVerifier })
  }

  private async getStoredCodeVerifier(): Promise<string | null> {
    const result = await chrome.storage.local.get('kinde_code_verifier')
    return result.kinde_code_verifier || null
  }

  private async sha256(plain: string): Promise<ArrayBuffer> {
    const encoder = new TextEncoder()
    const data = encoder.encode(plain)
    return crypto.subtle.digest('SHA-256', data)
  }

  private async base64URLEncode(buffer: ArrayBuffer): Promise<string> {
    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve((reader.result as string).split(',')[1])
      reader.onerror = (error) => reject(error)
      reader.readAsDataURL(new Blob([buffer]))
    })
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
  }
}
