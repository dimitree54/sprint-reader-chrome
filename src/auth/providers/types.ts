import type { AuthResult, User } from '../types/user.types'

export interface AuthProvider {
  name: string
  isAvailable(): Promise<boolean>
  login(): Promise<AuthResult>
  logout(): Promise<void>
  getUser(): Promise<User | null>
  getToken(): Promise<string | null>
  isAuthenticated(): Promise<boolean>
}