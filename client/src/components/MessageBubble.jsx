import { motion } from 'framer-motion'
import { CheckCircle, Quote, User, Orbit } from 'lucide-react'

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1.5 px-4 py-3">
      {[0, 1, 2].map(i => (
        <div key={i} className="typing-dot" style={{ animationDelay: `${i * 0.2}s` }} />
      ))}
    </div>
  )
}

function SourceBadge({ source }) {
  return (
    <span className="inline-flex items-center gap-1.5 bg-blue-600/10 border border-blue-500/20 rounded-full px-2.5 py-1 text-xs text-blue-300 hover:bg-blue-600/20 transition-colors cursor-pointer">
      <Quote className="w-2.5 h-2.5" />
      {source}
    </span>
  )
}

export default function MessageBubble({ message }) {
  const isUser = message.role === 'user'
  const isTyping = message.isTyping

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'} items-end mb-6`}
    >
      {/* Avatar */}
      <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mb-1 ${
        isUser
          ? 'bg-gradient-to-br from-blue-500 to-blue-700'
          : 'bg-gradient-to-br from-violet-500 to-blue-600'
      }`}>
        {isUser
          ? <User className="w-4 h-4 text-white" />
          : <Orbit className="w-4 h-4 text-white" />
        }
      </div>

      {/* Bubble */}
      <div className={`max-w-[75%] ${isUser ? 'items-end' : 'items-start'} flex flex-col gap-2`}>
        {/* Name */}
        <span className={`text-xs text-white/30 font-medium ${isUser ? 'text-right' : 'text-left'} px-1`}>
          {isUser ? 'You' : 'ORBIT AI'}
        </span>

        <div className={`rounded-2xl px-4 py-3 ${
          isUser
            ? 'bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-br-sm shadow-lg shadow-blue-900/30'
            : 'glass border border-white/8 text-white/90 rounded-bl-sm'
        }`}>
          {isTyping ? (
            <TypingIndicator />
          ) : (
            <div className="text-sm leading-relaxed whitespace-pre-wrap">
              {message.content}
            </div>
          )}
        </div>

        {/* Sources */}
        {!isUser && !isTyping && message.sources && message.sources.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex flex-wrap gap-2 px-1"
          >
            <span className="text-xs text-white/25 flex items-center gap-1">
              <CheckCircle className="w-3 h-3 text-emerald-500" />
              Sources:
            </span>
            {message.sources.map((src, i) => (
              <SourceBadge key={i} source={src} />
            ))}
          </motion.div>
        )}

        {/* Timestamp */}
        {!isTyping && (
          <span className={`text-xs text-white/20 px-1 ${isUser ? 'text-right' : 'text-left'}`}>
            {message.timestamp}
          </span>
        )}
      </div>
    </motion.div>
  )
}
