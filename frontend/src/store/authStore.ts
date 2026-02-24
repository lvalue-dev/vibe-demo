import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface AuthState {
  token: string | null
  email: string | null
  nickname: string | null
  isAuthenticated: boolean
  setAuth: (token: string, email: string, nickname: string) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      email: null,
      nickname: null,
      isAuthenticated: false,
      setAuth: (token, email, nickname) => {
        localStorage.setItem('token', token)
        set({ token, email, nickname, isAuthenticated: true })
      },
      logout: () => {
        localStorage.removeItem('token')
        set({ token: null, email: null, nickname: null, isAuthenticated: false })
      },
    }),
    { name: 'auth-storage' }
  )
)
