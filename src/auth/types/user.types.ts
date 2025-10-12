export interface User {
  id: string
  email?: string
  given_name?: string
  family_name?: string
  picture?: string
  username?: string
  subscriptionStatus: 'pro' | 'free' | null
}

export interface AuthResult {
  success: boolean
  user?: User
  token?: string
  error?: string
}

export interface KindeConfig {
  clientId: string
  domain: string
  redirectUri: string
  orgCode?: string
}
