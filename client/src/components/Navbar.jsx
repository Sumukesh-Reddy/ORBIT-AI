import { Link, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Orbit, Sparkles } from 'lucide-react'
import { useState, useEffect } from 'react'

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const location = useLocation()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <motion.nav
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      className={`fixed top-0 left-0 right-0 z-50 px-6 py-4 flex items-center justify-between transition-all duration-500 ${
        scrolled ? 'glass-dark border-b border-white/5' : ''
      }`}
    >
      {/* Logo */}
      <Link to="/" className="flex items-center gap-2 group">
        <div className="relative w-9 h-9">
          <div className="absolute inset-0 rounded-full bg-blue-600/20 blur-sm group-hover:bg-blue-600/40 transition-all duration-300" />
          <div className="relative w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center shadow-lg">
            <Orbit className="w-5 h-5 text-white" />
          </div>
        </div>
        <span className="font-display font-bold text-xl tracking-tight text-white group-hover:text-blue-300 transition-colors duration-300">
          ORBIT <span className="text-blue-400">AI</span>
        </span>
      </Link>

      {/* Nav Links */}
      <div className="hidden md:flex items-center gap-8">
        {[
          { label: 'Features', href: '#features' },
          { label: 'How it Works', href: '#how-it-works' },
        ].map(({ label, href }) => (
          <a
            key={label}
            href={href}
            className="text-sm text-white/60 hover:text-white transition-colors duration-200"
          >
            {label}
          </a>
        ))}
      </div>

      {/* Auth Buttons */}
      <div className="flex items-center gap-3">
        <Link
          to="/login"
          className="hidden sm:block text-sm text-white/70 hover:text-white transition-colors duration-200 px-4 py-2"
        >
          Sign In
        </Link>
        <Link to="/signup">
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
            className="btn-primary flex items-center gap-2 text-sm py-2 px-5"
          >
            <Sparkles className="w-4 h-4" />
            Get Started
          </motion.button>
        </Link>
      </div>
    </motion.nav>
  )
}
