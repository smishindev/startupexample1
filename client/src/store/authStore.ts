import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { User, AuthResponse } from '@mishin-learn/shared'

interface AuthState {
  user: User | null
  token: string | null
  refreshToken: string | null
  isAuthenticated: boolean
  isLoading: boolean
}

interface AuthActions {
  login: (authData: AuthResponse) => void
  logout: () => void
  updateUser: (user: User) => void
  setLoading: (loading: boolean) => void
}

type AuthStore = AuthState & AuthActions

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      // Initial state
      user: null,
      token: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,

      // Actions
      login: (authData: AuthResponse) => {
        set({
          user: authData.user,
          token: authData.token,
          refreshToken: authData.refreshToken,
          isAuthenticated: true,
          isLoading: false,
        })
      },

      logout: () => {
        set({
          user: null,
          token: null,
          refreshToken: null,
          isAuthenticated: false,
          isLoading: false,
        })
      },

      updateUser: (user: User) => {
        set((state) => ({
          ...state,
          user,
        }))
      },

      setLoading: (isLoading: boolean) => {
        set((state) => ({
          ...state,
          isLoading,
        }))
      },
    }),
    {
      name: 'mishin-learn-auth',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)