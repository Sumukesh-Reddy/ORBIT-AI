import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import * as authService from '../services/authApi'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('orbit_user')
      return stored ? JSON.parse(stored) : null
    } catch {
      return null
    }
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Validate the session on mount if token exists
  useEffect(() => {
    async function checkAuth() {
      const token = localStorage.getItem('orbit_token')
      if (!token) {
        setLoading(false)
        return
      }
      try {
        const profile = await authService.getMe()
        setUser(profile)
        localStorage.setItem('orbit_user', JSON.stringify(profile))
      } catch (err) {
        console.error('Session validation failed:', err)
        localStorage.removeItem('orbit_token')
        localStorage.removeItem('orbit_user')
        setUser(null)
      } finally {
        setLoading(false)
      }
    }
    checkAuth()
  }, [])

  const login = useCallback(async ({ email, password }) => {
    setLoading(true)
    setError(null)
    try {
      const data = await authService.loginUser({ email, password })
      localStorage.setItem('orbit_token', data.token.access_token)
      localStorage.setItem('orbit_user', JSON.stringify(data.user))
      setUser(data.user)
      return data.user
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const signup = useCallback(async ({ name, email, password }) => {
    setLoading(true)
    setError(null)
    try {
      const data = await authService.signupUser({ name, email, password })
      return data
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const verifyOtp = useCallback(async ({ email, otp }) => {
    setLoading(true)
    setError(null)
    try {
      const data = await authService.verifyOtp({ email, otp })
      localStorage.setItem('orbit_token', data.token.access_token)
      localStorage.setItem('orbit_user', JSON.stringify(data.user))
      setUser(data.user)
      return data.user
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const logout = useCallback(async () => {
    setLoading(true)
    try {
      await authService.logoutUser()
    } catch (err) {
      console.error('Logout API failed:', err)
    } finally {
      localStorage.removeItem('orbit_token')
      localStorage.removeItem('orbit_user')
      setUser(null)
      setLoading(false)
    }
  }, [])

  const loginWithGoogle = useCallback(async (credential) => {
    setLoading(true)
    setError(null)
    try {
      const data = await authService.googleAuth(credential)
      localStorage.setItem('orbit_token', data.token.access_token)
      localStorage.setItem('orbit_user', JSON.stringify(data.user))
      setUser(data.user)
      return data.user
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const value = {
    user,
    loading,
    error,
    login,
    signup,
    verifyOtp,
    loginWithGoogle,
    logout,
    isAuthenticated: !!user,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
