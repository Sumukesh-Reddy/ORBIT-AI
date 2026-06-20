import api from './api'

export async function loginUser({ email, password }) {
  try {
    const response = await api.post('/auth/login', { email, password })
    return response.data
  } catch (error) {
    const message = error.response?.data?.detail || 'Failed to sign in. Please check your credentials.'
    throw new Error(message)
  }
}

export async function signupUser({ name, email, password }) {
  try {
    const response = await api.post('/auth/register', { name, email, password })
    return response.data
  } catch (error) {
    const message = error.response?.data?.detail || 'Failed to register account.'
    throw new Error(message)
  }
}

export async function verifyOtp({ email, otp }) {
  try {
    const response = await api.post('/auth/verify-otp', { email, otp })
    return response.data
  } catch (error) {
    const message = error.response?.data?.detail || 'Failed to verify verification code.'
    throw new Error(message)
  }
}

export async function googleAuth(credential) {
  try {
    const response = await api.post('/auth/google', { credential })
    return response.data
  } catch (error) {
    const message = error.response?.data?.detail || 'Google sign-in failed.'
    throw new Error(message)
  }
}

export async function getMe() {
  try {
    const response = await api.get('/auth/me')
    return response.data
  } catch (error) {
    const message = error.response?.data?.detail || 'Failed to fetch user profile.'
    throw new Error(message)
  }
}

export async function logoutUser() {
  try {
    const response = await api.post('/auth/logout')
    return response.data
  } catch (error) {
    // Return mock success on network fail to let client log out anyway
    return { success: true, message: 'Logged out locally.' }
  }
}
