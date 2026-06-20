import { Link } from 'react-router-dom'
import { Home } from 'lucide-react'
import StarBackground from '../components/StarBackground'

export default function AuthLayout({ children }) {
  return (
    <div className="relative min-h-screen bg-orbit-bg flex items-center justify-center px-4">
      <StarBackground />

      {/* Floating Home Button */}
      <Link
        to="/"
        className="fixed top-6 left-6 z-50 flex items-center gap-2 px-3.5 py-2 rounded-xl border border-white/10 glass hover:border-white/20 hover:bg-white/5 text-white/75 hover:text-white transition-all duration-300 text-sm font-medium"
      >
        <Home className="w-4 h-4" />
        Home
      </Link>

      {/* Background gradients */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-blue-600/8 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-2/3 right-1/4 w-[300px] h-[300px] bg-violet-600/6 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 w-full max-w-md">
        {children}
      </div>
    </div>
  )
}
