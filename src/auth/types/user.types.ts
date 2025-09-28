export interface User {
  id: string
  email?: string
  given_name?: string
  family_name?: string
  picture?: string
  username?: string
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
}