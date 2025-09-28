import { create } from 'zustand'
import type { User } from '../types/user.types'

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null

  // Actions
  setUser: (user: User | null) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  clearError: () => void
  reset: () => void
}

const initialState = {
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null
}

export const useAuthStore = create<AuthState>((set) => ({
  ...initialState,

  setUser: (user: User | null) =>
    set(() => ({
      user,
      isAuthenticated: user !== null,
      error: null
    })),

  setLoading: (isLoading: boolean) =>
    set(() => ({ isLoading })),

  setError: (error: string | null) =>
    set(() => ({ error, isLoading: false })),

  clearError: () =>
    set(() => ({ error: null })),

  reset: () =>
    set(() => initialState)
}))

// Export store state for non-React components
export const getAuthState = () => useAuthStore.getState()