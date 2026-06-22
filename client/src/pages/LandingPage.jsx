import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  FileText, Globe, PlayCircle, GitBranch, Search, Brain,
  Network, BookOpen, Quote, Sparkles, ArrowRight,
  Zap, Database, MessageSquare, CheckCircle, ChevronRight
} from 'lucide-react'
import StarBackground from '../components/StarBackground'
import Navbar from '../components/Navbar'
import FeatureCard from '../components/FeatureCard'

// Hero Orbit Illustration
function OrbitIllustration() {
  const nodes = [
    { icon: FileText, label: 'PDF', angle: 0, ring: 1, color: 'text-red-400 bg-red-500/10 border-red-500/20' },
    { icon: Globe, label: 'Websites', angle: 60, ring: 1, color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
    { icon: PlayCircle, label: 'YouTube', angle: 120, ring: 1, color: 'text-rose-400 bg-rose-500/10 border-rose-500/20' },
    { icon: GitBranch, label: 'GitHub', angle: 180, ring: 1, color: 'text-white/60 bg-white/5 border-white/10' },
    { icon: Brain, label: 'AI', angle: 240, ring: 1 },
    { icon: Database, label: 'Store', angle: 300, ring: 1 },
    { icon: Search, label: 'Search', angle: 30, ring: 2 },
    { icon: Network, label: 'Graph', angle: 150, ring: 2 },
    { icon: BookOpen, label: 'Notes', angle: 270, ring: 2 },
  ]

  const ring1R = 110
  const ring2R = 175

  return (
    <div className="relative w-96 h-96 mx-auto">
      {/* Outer glow */}
      <div className="absolute inset-0 rounded-full bg-blue-600/5 blur-3xl" />

      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 384 384">
        {/* Ring 1 */}
        <circle
          cx="192" cy="192" r={ring1R}
          fill="none"
          stroke="rgba(59,130,246,0.2)"
          strokeWidth="1"
          strokeDasharray="4 6"
          className="orbit-ring"
          style={{ transformOrigin: '192px 192px' }}
        />
        {/* Ring 2 */}
        <circle
          cx="192" cy="192" r={ring2R}
          fill="none"
          stroke="rgba(139,92,246,0.15)"
          strokeWidth="1"
          strokeDasharray="3 8"
          className="orbit-ring-2"
          style={{ transformOrigin: '192px 192px' }}
        />
        {/* Ring 3 decorative */}
        <circle
          cx="192" cy="192" r="80"
          fill="none"
          stroke="rgba(96,165,250,0.1)"
          strokeWidth="1"
          strokeDasharray="2 10"
          className="orbit-ring-3"
          style={{ transformOrigin: '192px 192px' }}
        />

        {/* Connection lines */}
        {nodes.slice(0, 6).map((n, i) => {
          const rad = (n.angle * Math.PI) / 180
          const x = 192 + ring1R * Math.cos(rad)
          const y = 192 + ring1R * Math.sin(rad)
          return (
            <line
              key={i}
              x1="192" y1="192"
              x2={x} y2={y}
              stroke="rgba(59,130,246,0.08)"
              strokeWidth="1"
            />
          )
        })}
      </svg>

      {/* Core */}
      <div className="absolute inset-0 flex items-center justify-center">
        <motion.div
          animate={{ scale: [1, 1.08, 1] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          className="orbit-core w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 via-blue-600 to-violet-700 flex items-center justify-center relative"
        >
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-blue-400 to-violet-600 blur-xl opacity-70" />
          <Sparkles className="w-9 h-9 text-white relative z-10" />
        </motion.div>
      </div>

      {/* Ring 1 Nodes */}
      {nodes.slice(0, 6).map((n, i) => {
        const rad = (n.angle * Math.PI) / 180
        const x = 192 + ring1R * Math.cos(rad)
        const y = 192 + ring1R * Math.sin(rad)
        const Icon = n.icon
        return (
          <motion.div
            key={i}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4 + i * 0.1, type: 'spring' }}
            className="absolute w-9 h-9 glass rounded-xl flex items-center justify-center border border-blue-500/30"
            style={{
              left: `${(x / 384) * 100}%`,
              top: `${(y / 384) * 100}%`,
              transform: 'translate(-50%, -50%)',
            }}
          >
            <Icon className="w-4 h-4 text-blue-400" />
          </motion.div>
        )
      })}

      {/* Ring 2 Nodes */}
      {nodes.slice(6).map((n, i) => {
        const rad = (n.angle * Math.PI) / 180
        const x = 192 + ring2R * Math.cos(rad)
        const y = 192 + ring2R * Math.sin(rad)
        const Icon = n.icon
        return (
          <motion.div
            key={i}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.8 + i * 0.12, type: 'spring' }}
            className="absolute w-8 h-8 glass rounded-lg flex items-center justify-center border border-violet-500/25"
            style={{
              left: `${(x / 384) * 100}%`,
              top: `${(y / 384) * 100}%`,
              transform: 'translate(-50%, -50%)',
            }}
          >
            <Icon className="w-3.5 h-3.5 text-violet-400" />
          </motion.div>
        )
      })}
    </div>
  )
}

const features = [
  {
    icon: FileText,
    title: 'Multi-Source Ingestion',
    description: 'Upload PDFs, DOCX files, websites, YouTube videos, and GitHub repositories into a unified knowledge base.',
    gradient: 'bg-gradient-to-br from-blue-500 to-blue-700',
    delay: 0,
  },
  {
    icon: Search,
    title: 'Hybrid Retrieval',
    description: 'Combine semantic search, keyword search, and intelligent re-ranking for the most accurate answers.',
    gradient: 'bg-gradient-to-br from-cyan-500 to-blue-600',
    delay: 0.05,
  },
  {
    icon: Network,
    title: 'Knowledge Graph',
    description: 'Automatically visualize concepts, entities, and their relationships across your entire knowledge base.',
    gradient: 'bg-gradient-to-br from-violet-500 to-purple-700',
    delay: 0.1,
  },
  {
    icon: Brain,
    title: 'AI Research Assistant',
    description: 'Compare topics, generate in-depth research reports, and synthesize knowledge across multiple sources.',
    gradient: 'bg-gradient-to-br from-fuchsia-500 to-violet-700',
    delay: 0.15,
  },
  {
    icon: BookOpen,
    title: 'Smart Notes Generator',
    description: 'Automatically generate notes, flashcards, interview questions, and cheat sheets from your content.',
    gradient: 'bg-gradient-to-br from-emerald-500 to-teal-700',
    delay: 0.2,
  },
  {
    icon: Quote,
    title: 'Source Citations',
    description: 'Every AI answer includes precise citations, page numbers, and direct links back to your source documents.',
    gradient: 'bg-gradient-to-br from-orange-500 to-amber-700',
    delay: 0.25,
  },
]

const steps = [
  {
    icon: Database,
    title: 'Upload Knowledge Sources',
    desc: 'Add PDFs, websites, YouTube videos, GitHub repos, or any document.',
    color: 'from-blue-500 to-blue-600',
  },
  {
    icon: Zap,
    title: 'AI Processes Content',
    desc: 'Our AI pipeline extracts, cleans, and structures your content automatically.',
    color: 'from-cyan-500 to-blue-500',
  },
  {
    icon: Network,
    title: 'Embeddings Generated',
    desc: 'High-dimensional vector embeddings capture the semantic meaning of every chunk.',
    color: 'from-violet-500 to-purple-600',
  },
  {
    icon: Database,
    title: 'Knowledge Stored',
    desc: 'Vectors and metadata stored in a hybrid vector database for lightning-fast retrieval.',
    color: 'from-fuchsia-500 to-violet-600',
  },
  {
    icon: MessageSquare,
    title: 'Ask Questions',
    desc: 'Chat naturally with your knowledge base using plain language.',
    color: 'from-emerald-500 to-teal-600',
  },
  {
    icon: CheckCircle,
    title: 'Get Accurate Answers',
    desc: 'Receive precise answers with citations, sources, and confidence scores.',
    color: 'from-orange-500 to-amber-600',
  },
]

export default function LandingPage() {
  return (
    <div className="relative min-h-screen bg-orbit-bg overflow-hidden">
      <StarBackground />
      <Navbar />

      {/* Hero */}
      <section className="relative z-10 min-h-screen flex flex-col items-center justify-center px-6 pt-24 pb-16">
        {/* Background gradients */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-blue-600/8 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/3 left-1/4 w-[400px] h-[400px] bg-violet-600/6 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto w-full grid lg:grid-cols-2 gap-16 items-center">
          {/* Left: Text */}
          <div className="text-center lg:text-left">
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="hidden"
            >
            </motion.div>

            {/* Title */}
            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="font-display text-6xl sm:text-7xl lg:text-8xl font-black mb-4 leading-none tracking-tight"
            >
              <span className="text-white">ORBIT</span>
              <br />
              <span className="gradient-text">AI</span>
            </motion.h1>

            {/* Tagline */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="font-display text-xl sm:text-2xl text-white/80 font-semibold mb-4"
            >
              Your Personal Knowledge Operating System
            </motion.p>

            {/* Description */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="text-white/50 text-base sm:text-lg leading-relaxed mb-10 max-w-xl mx-auto lg:mx-0"
            >
              ORBIT AI transforms PDFs, websites, YouTube videos, GitHub repositories, and documents
              into an intelligent searchable knowledge base using Hybrid RAG, Knowledge Graphs, and
              AI-powered research workflows.
            </motion.p>

            {/* CTA Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="flex flex-wrap gap-4 justify-center lg:justify-start"
            >
              <Link to="/signup">
                <motion.button
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.97 }}
                  className="btn-primary flex items-center gap-2 text-base px-8 py-3.5"
                >
                  <Sparkles className="w-5 h-5" />
                  Get Started Free
                  <ArrowRight className="w-4 h-4" />
                </motion.button>
              </Link>
              <Link to="/login">
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  className="btn-ghost text-base px-8 py-3.5"
                >
                  Sign In
                </motion.button>
              </Link>
            </motion.div>

            {/* Stats */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.7 }}
              className="flex gap-8 mt-12 justify-center lg:justify-start"
            >
              {[
                { value: 'Hybrid', label: 'RAG Engine' },
                
              ].map(({ value, label }) => (
                <div key={label} className="text-center lg:text-left">
                  <div className="font-display font-bold text-2xl text-blue-400">{value}</div>
                  <div className="text-xs text-white/40 mt-1">{label}</div>
                </div>
              ))}
            </motion.div>
          </div>

          {/* Right: Illustration */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.3, type: 'spring' }}
            className="flex justify-center items-center"
          >
            <OrbitIllustration />
          </motion.div>
        </div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
          className="absolute bottom-10 left-1/2 -translate-x-1/2"
        >
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            className="flex flex-col items-center gap-2"
          >
            <span className="text-xs text-white/30">Scroll to explore</span>
            <div className="w-px h-8 bg-gradient-to-b from-white/30 to-transparent" />
          </motion.div>
        </motion.div>
      </section>

      {/* Features Section */}
      <section id="features" className="relative z-10 py-28 px-6">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <div className="inline-flex items-center gap-2 glass rounded-full px-4 py-2 mb-6 border border-violet-500/20">
              <Zap className="w-3.5 h-3.5 text-violet-400" />
              <span className="text-xs text-white/70 font-medium">Powerful Features</span>
            </div>
            <h2 className="font-display text-4xl sm:text-5xl font-bold text-white mb-4">
              Everything You Need to{' '}
              <span className="gradient-text">Master Knowledge</span>
            </h2>
            <p className="text-white/40 text-lg max-w-2xl mx-auto">
              ORBIT AI brings together the best of AI research, knowledge management, and intelligent retrieval.
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f) => (
              <FeatureCard key={f.title} {...f} />
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="relative z-10 py-28 px-6">
        <div className="absolute inset-0 bg-radial-blue opacity-20 pointer-events-none" />
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-20"
          >
            <div className="inline-flex items-center gap-2 glass rounded-full px-4 py-2 mb-6 border border-blue-500/20">
              <ChevronRight className="w-3.5 h-3.5 text-blue-400" />
              <span className="text-xs text-white/70 font-medium">How It Works</span>
            </div>
            <h2 className="font-display text-4xl sm:text-5xl font-bold text-white mb-4">
              From Upload to{' '}
              <span className="gradient-text">Insight in Seconds</span>
            </h2>
            <p className="text-white/40 text-lg">
              Our AI pipeline handles everything automatically.
            </p>
          </motion.div>

          {/* Timeline */}
          <div className="relative">
            {/* Vertical line */}
            <div className="absolute left-8 top-0 bottom-0 w-px bg-gradient-to-b from-blue-500/50 via-violet-500/50 to-transparent hidden sm:block" />

            <div className="space-y-8">
              {steps.map((step, i) => {
                const Icon = step.icon
                return (
                  <motion.div
                    key={step.title}
                    initial={{ opacity: 0, x: -30 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true, margin: '-60px' }}
                    transition={{ duration: 0.5, delay: i * 0.08 }}
                    className="flex gap-6 items-start sm:pl-6 group"
                  >
                    {/* Step circle */}
                    <div className="relative flex-shrink-0">
                      <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${step.color} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                        <Icon className="w-7 h-7 text-white" />
                      </div>
                      <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-orbit-bg border-2 border-blue-500 flex items-center justify-center">
                        <span className="text-blue-400 text-xs font-bold">{i + 1}</span>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="glass rounded-2xl p-5 flex-1 group-hover:border-blue-500/20 transition-colors duration-300">
                      <h3 className="font-display font-semibold text-white text-lg mb-1">
                        {step.title}
                      </h3>
                      <p className="text-white/50 text-sm leading-relaxed">{step.desc}</p>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative z-10 py-28 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="glass rounded-3xl p-16 relative overflow-hidden border border-blue-500/10"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-blue-600/5 to-violet-600/5" />
            <div className="absolute -top-20 -right-20 w-64 h-64 bg-blue-600/10 rounded-full blur-3xl" />
            <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-violet-600/10 rounded-full blur-3xl" />

            <div className="relative z-10">
              <Sparkles className="w-10 h-10 text-blue-400 mx-auto mb-6" />
              <h2 className="font-display text-4xl sm:text-5xl font-bold text-white mb-4">
                Ready to orbit your <br />
                <span className="gradient-text">knowledge universe?</span>
              </h2>
              <p className="text-white/50 text-lg mb-10 max-w-xl mx-auto">
                Join thousands of researchers, students, and professionals who use ORBIT AI
                to supercharge their learning.
              </p>
              <div className="flex flex-wrap gap-4 justify-center">
                <Link to="/signup">
                  <motion.button
                    whileHover={{ scale: 1.05, y: -2 }}
                    whileTap={{ scale: 0.97 }}
                    className="btn-primary flex items-center gap-2 text-base px-8 py-3.5"
                  >
                    <Sparkles className="w-5 h-5" />
                    Start for Free
                    <ArrowRight className="w-4 h-4" />
                  </motion.button>
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/5 py-10 px-6">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center">
              <Network className="w-4 h-4 text-white" />
            </div>
            <span className="font-display font-bold text-white/80">ORBIT AI</span>
          </div>
          <p className="text-white/30 text-sm">
            © {new Date().getFullYear()} ORBIT AI. All rights reserved.
          </p>
          <div className="flex gap-6">
            <a href="https://www.sumukesh.app" target="_blank" rel="noopener noreferrer" className="text-white/30 hover:text-white/60 text-sm transition-colors duration-200">
              Contact
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}
