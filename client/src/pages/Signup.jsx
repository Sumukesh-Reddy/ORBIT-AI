import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Eye, EyeOff, Mail, Lock, User, UserPlus, Orbit, AlertCircle, Loader2, CheckCircle2 } from 'lucide-react'
import { useGoogleLogin } from '@react-oauth/google'
import AuthLayout from '../layouts/AuthLayout'
import { useAuth } from '../hooks/useAuth'

function GoogleIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  )
}

function PasswordStrength({ password }) {
  const checks = [
    { label: '8+ characters', ok: password.length >= 8 },
    { label: 'Uppercase letter', ok: /[A-Z]/.test(password) },
    { label: 'Number', ok: /\d/.test(password) },
    { label: 'Special character', ok: /[^a-zA-Z0-9]/.test(password) },
  ]
  const score = checks.filter(c => c.ok).length
  const colors = ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-emerald-500']

  if (!password) return null

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="mt-2 space-y-2"
    >
      <div className="flex gap-1">
        {[0,1,2,3].map(i => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-all duration-300 ${
              i < score ? colors[score - 1] : 'bg-white/10'
            }`}
          />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-1">
        {checks.map(c => (
          <div key={c.label} className={`flex items-center gap-1 text-xs transition-colors ${c.ok ? 'text-emerald-400' : 'text-white/30'}`}>
            <CheckCircle2 className="w-3 h-3 flex-shrink-0" />
            {c.label}
          </div>
        ))}
      </div>
    </motion.div>
  )
}

export default function Signup() {
  const { signup, loginWithGoogle, verifyOtp } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' })
  const [errors, setErrors] = useState({})
  const [showPass, setShowPass] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [submitError, setSubmitError] = useState(null)

  // OTP Verification state
  const [showOtpScreen, setShowOtpScreen] = useState(false)
  const [otp, setOtp] = useState('')
  const [otpError, setOtpError] = useState(null)
  const [otpLoading, setOtpLoading] = useState(false)

  function validate() {
    const e = {}
    if (!form.name.trim()) e.name = 'Name is required'
    if (!form.email) e.email = 'Email is required'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Invalid email'
    if (!form.password) e.password = 'Password is required'
    else if (form.password.length < 8) e.password = 'Minimum 8 characters'
    if (!form.confirm) e.confirm = 'Please confirm your password'
    else if (form.confirm !== form.password) e.confirm = 'Passwords do not match'
    return e
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    setErrors({})
    setSubmitError(null)
    setLoading(true)
    try {
      await signup({ name: form.name, email: form.email, password: form.password })
      setShowOtpScreen(true)
    } catch (err) {
      setSubmitError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleOtpSubmit(e) {
    e.preventDefault()
    if (!otp) { setOtpError('Verification code is required'); return }
    if (otp.length < 6) { setOtpError('Code must be 6 digits'); return }
    setOtpError(null)
    setOtpLoading(true)
    try {
      await verifyOtp({ email: form.email, otp })
      navigate('/chat')
    } catch (err) {
      setOtpError(err.message)
    } finally {
      setOtpLoading(false)
    }
  }

  async function handleResendOtp() {
    setOtpError(null)
    setOtpLoading(true)
    try {
      await signup({ name: form.name, email: form.email, password: form.password })
      setOtpError(null)
    } catch (err) {
      setOtpError(err.message)
    } finally {
      setOtpLoading(false)
    }
  }

  const handleGoogle = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setSubmitError(null)
      setLoading(true)
      try {
        await loginWithGoogle(tokenResponse.access_token)
        navigate('/chat')
      } catch (err) {
        setSubmitError(err.message)
        setLoading(false)
      }
    },
    onError: () => {
      setSubmitError('Google Sign-In Failed')
    }
  })

  const setField = key => e => setForm(f => ({ ...f, [key]: e.target.value }))

  if (showOtpScreen) {
    return (
      <AuthLayout>
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="glass-strong rounded-3xl p-8 sm:p-10 border border-white/10"
        >
          {/* Logo */}
          <div className="flex items-center gap-2 justify-center mb-8">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center">
              <Orbit className="w-5 h-5 text-white" />
            </div>
            <span className="font-display font-bold text-2xl text-white">
              ORBIT <span className="text-blue-400">AI</span>
            </span>
          </div>

          <h1 className="font-display text-2xl font-bold text-white text-center mb-1">
            Verify your email
          </h1>
          <p className="text-white/40 text-sm text-center mb-8">
            We've sent a 6-digit verification code to <span className="text-white/80 font-medium">{form.email}</span>
          </p>

          {/* Error Alert */}
          <AnimatePresence>
            {otpError && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl p-3.5 text-xs flex items-center gap-2 mb-4"
              >
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{otpError}</span>
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleOtpSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-white/60 mb-1.5 font-medium">Verification Code</label>
              <div className="relative">
                <input
                  type="text"
                  maxLength={6}
                  placeholder="000000"
                  value={otp}
                  onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
                  className="input-field text-center text-xl font-bold tracking-[0.25em] pl-4 py-3"
                  style={{ textIndent: '0.125em' }}
                />
              </div>
            </div>

            <motion.button
              type="submit"
              disabled={otpLoading}
              whileHover={!otpLoading ? { scale: 1.02 } : {}}
              whileTap={!otpLoading ? { scale: 0.98 } : {}}
              className="w-full btn-primary flex items-center justify-center gap-2 mt-2 py-3.5 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {otpLoading ? (
                <><Loader2 className="w-4 h-4 animate-spin" />Verifying code...</>
              ) : (
                <><CheckCircle2 className="w-4 h-4" />Verify Code</>
              )}
            </motion.button>
          </form>

          <div className="flex flex-col gap-3 items-center justify-center mt-6">
            <button
              onClick={handleResendOtp}
              disabled={otpLoading}
              className="text-sm text-blue-400 hover:text-blue-300 font-medium transition-colors disabled:opacity-50"
            >
              Resend verification code
            </button>
            <button
              onClick={() => { setShowOtpScreen(false); setOtp(''); setOtpError(null) }}
              className="text-sm text-white/30 hover:text-white/50 transition-colors"
            >
              Back to Sign Up
            </button>
          </div>
        </motion.div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout>
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="glass-strong rounded-3xl p-8 sm:p-10 border border-white/10"
      >
        {/* Logo */}
        <div className="flex items-center gap-2 justify-center mb-8">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center">
            <Orbit className="w-5 h-5 text-white" />
          </div>
          <span className="font-display font-bold text-2xl text-white">
            ORBIT <span className="text-blue-400">AI</span>
          </span>
        </div>

        <h1 className="font-display text-2xl font-bold text-white text-center mb-1">
          Create your account
        </h1>
        <p className="text-white/40 text-sm text-center mb-8">
          Start building your knowledge universe
        </p>

        {/* Google */}
        <button
          onClick={handleGoogle}
          className="w-full glass rounded-xl px-4 py-3 flex items-center justify-center gap-3 text-white/80 hover:text-white border border-white/10 hover:border-white/20 transition-all duration-300 hover:bg-white/5 mb-5 text-sm font-medium"
        >
          <GoogleIcon />
          Continue with Google
        </button>

        <div className="flex items-center gap-4 mb-5">
          <div className="flex-1 h-px bg-white/8" />
          <span className="text-white/30 text-xs">or create with email</span>
          <div className="flex-1 h-px bg-white/8" />
        </div>

        {/* Error Alert */}
        <AnimatePresence>
          {submitError && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl p-3.5 text-xs flex items-center gap-2 mb-4"
            >
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{submitError}</span>
            </motion.div>
          )}
        </AnimatePresence>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm text-white/60 mb-1.5 font-medium">Full Name</label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
              <input
                type="text"
                id="signup-name"
                placeholder="Sumukesh Reddy"
                value={form.name}
                onChange={setField('name')}
                className={`input-field pl-10 ${errors.name ? 'border-red-500/50' : ''}`}
              />
            </div>
            <AnimatePresence>
              {errors.name && (
                <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                  className="flex items-center gap-1.5 text-red-400 text-xs mt-1.5">
                  <AlertCircle className="w-3.5 h-3.5" />{errors.name}
                </motion.p>
              )}
            </AnimatePresence>
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm text-white/60 mb-1.5 font-medium">Email</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
              <input
                type="email"
                id="signup-email"
                placeholder="you@example.com"
                value={form.email}
                onChange={setField('email')}
                className={`input-field pl-10 ${errors.email ? 'border-red-500/50' : ''}`}
              />
            </div>
            <AnimatePresence>
              {errors.email && (
                <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                  className="flex items-center gap-1.5 text-red-400 text-xs mt-1.5">
                  <AlertCircle className="w-3.5 h-3.5" />{errors.email}
                </motion.p>
              )}
            </AnimatePresence>
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm text-white/60 mb-1.5 font-medium">Password</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
              <input
                type={showPass ? 'text' : 'password'}
                id="signup-password"
                placeholder="Min. 8 characters"
                value={form.password}
                onChange={setField('password')}
                className={`input-field pl-10 pr-11 ${errors.password ? 'border-red-500/50' : ''}`}
              />
              <button type="button" onClick={() => setShowPass(!showPass)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors">
                {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <AnimatePresence>
              {errors.password && (
                <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                  className="flex items-center gap-1.5 text-red-400 text-xs mt-1.5">
                  <AlertCircle className="w-3.5 h-3.5" />{errors.password}
                </motion.p>
              )}
            </AnimatePresence>
            <AnimatePresence>
              {form.password && <PasswordStrength password={form.password} />}
            </AnimatePresence>
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-sm text-white/60 mb-1.5 font-medium">Confirm Password</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
              <input
                type={showConfirm ? 'text' : 'password'}
                id="signup-confirm"
                placeholder="Re-enter password"
                value={form.confirm}
                onChange={setField('confirm')}
                className={`input-field pl-10 pr-11 ${errors.confirm ? 'border-red-500/50' : ''}`}
              />
              <button type="button" onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors">
                {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <AnimatePresence>
              {errors.confirm && (
                <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                  className="flex items-center gap-1.5 text-red-400 text-xs mt-1.5">
                  <AlertCircle className="w-3.5 h-3.5" />{errors.confirm}
                </motion.p>
              )}
            </AnimatePresence>
          </div>

          <motion.button
            type="submit"
            disabled={loading}
            whileHover={!loading ? { scale: 1.02 } : {}}
            whileTap={!loading ? { scale: 0.98 } : {}}
            className="w-full btn-primary flex items-center justify-center gap-2 mt-2 py-3.5 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {loading ? (
              <><Loader2 className="w-4 h-4 animate-spin" />Creating account...</>
            ) : (
              <><UserPlus className="w-4 h-4" />Create Account</>
            )}
          </motion.button>
        </form>

        <p className="text-center text-sm text-white/40 mt-6">
          Already have an account?{' '}
          <Link to="/login" className="text-blue-400 hover:text-blue-300 font-medium transition-colors">
            Sign in
          </Link>
        </p>
      </motion.div>
    </AuthLayout>
  )
}
