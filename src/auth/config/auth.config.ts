import type { KindeConfig } from '../types/user.types'

// Get the proper extension URL for redirect (chromiumapp.org format for Kinde)
const getExtensionRedirectUri = (): string => {
  try {
    // Generate redirect URI from the current extension ID.
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id) {
      return `https://${chrome.runtime.id}.chromiumapp.org/`
    }

    // Last resort fallback
    return 'https://unknown.chromiumapp.org/'
  } catch {
    return 'https://unknown.chromiumapp.org/'
  }
}

export const AUTH_CONFIG = {
  enableAuthentication: true,
  kinde: {
    clientId: process.env.VITE_KINDE_CLIENT_ID || '',
    domain: process.env.VITE_KINDE_DOMAIN || '',
    getRedirectUri: getExtensionRedirectUri
  }
} as const

export const getAuthConfig = () => ({
  kinde: {
    clientId: AUTH_CONFIG.kinde.clientId,
    domain: AUTH_CONFIG.kinde.domain,
    redirectUri: AUTH_CONFIG.kinde.getRedirectUri()
  }
})

export const getKindeConfig = (): KindeConfig => ({
  clientId: AUTH_CONFIG.kinde.clientId,
  domain: AUTH_CONFIG.kinde.domain,
  redirectUri: AUTH_CONFIG.kinde.getRedirectUri()
})

export const validateAuthConfig = () => {
  const config = getAuthConfig()
  const missingFields: string[] = []

  if (!config.kinde.clientId) {
    missingFields.push('VITE_KINDE_CLIENT_ID')
  }

  if (!config.kinde.domain) {
    missingFields.push('VITE_KINDE_DOMAIN')
  }

  return {
    isValid: missingFields.length === 0,
    missingFields
  }
}