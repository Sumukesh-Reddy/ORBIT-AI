import { motion } from 'framer-motion'
import { CheckCircle, Quote, User, Orbit, FileText } from 'lucide-react'

import ReactMarkdown from 'react-markdown'

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1.5 px-4 py-3">
      {[0, 1, 2].map(i => (
        <div key={i} className="typing-dot" style={{ animationDelay: `${i * 0.2}s` }} />
      ))}
    </div>
  )
}

function SourceBadge({ source, documents = [] }) {
  const fileName = source.split(' · ')[0] || source;
  const doc = documents.find(d => d.fileName === fileName || d.title === fileName);
  const filePath = doc?.filePath;

  const handleClick = () => {
    if (filePath) {
      window.open(filePath, '_blank');
    }
  };

  return (
    <span
      onClick={handleClick}
      className={`inline-flex items-center gap-1.5 bg-blue-600/10 border border-blue-500/20 rounded-full px-2.5 py-1 text-xs text-blue-300 hover:bg-blue-600/20 transition-colors cursor-pointer ${
        !filePath ? 'opacity-50 cursor-not-allowed' : ''
      }`}
      title={filePath ? 'Click to open document in new tab' : 'Document not found'}
    >
      <Quote className="w-2.5 h-2.5" />
      {source}
    </span>
  )
}

function AttachmentBadge({ attachment }) {
  const ext = attachment.fileName.split('.').pop()?.toUpperCase()

  const handleClick = () => {
    if (attachment.filePath) {
      window.open(attachment.filePath, '_blank');
    }
  };

  return (
    <div
      onClick={handleClick}
      className="inline-flex items-center gap-2 bg-white/6 hover:bg-white/12 border border-white/10 hover:border-white/20 rounded-xl px-3 py-2 cursor-pointer transition-all max-w-[240px] mt-1 group"
      title="Click to view document in new tab"
    >
      <div className={`flex-shrink-0 ${
        ext === 'PDF' ? 'text-red-400 group-hover:text-red-300' : ext === 'DOCX' ? 'text-blue-400 group-hover:text-blue-300' : 'text-white/50 group-hover:text-white'
      }`}>
        <FileText className="w-4 h-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-white/80 font-medium truncate group-hover:text-white leading-tight">{attachment.fileName}</p>
      </div>
    </div>
  )
}

export default function MessageBubble({ message, documents = [] }) {
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
          ) : isUser ? (
            <div className="text-sm leading-relaxed whitespace-pre-wrap">
              {message.content}
              {message.attachments && message.attachments.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2 pt-1.5 border-t border-white/5">
                  {message.attachments.map((att, idx) => (
                    <AttachmentBadge key={idx} attachment={att} />
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="text-sm leading-relaxed">
              <ReactMarkdown
                components={{
                  ul: ({ children }) => <ul className="list-disc pl-4 mb-2">{children}</ul>,
                  ol: ({ children }) => <ol className="list-decimal pl-4 mb-2">{children}</ol>,
                  li: ({ children }) => <li className="mb-1 text-sm">{children}</li>,
                  p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                  strong: ({ children }) => <strong className="font-semibold text-white">{children}</strong>,
                  code: ({ children }) => <code className="bg-white/10 rounded px-1 py-0.5 text-xs font-mono">{children}</code>
                }}
              >
                {message.content}
              </ReactMarkdown>
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
              <SourceBadge key={i} source={src} documents={documents} />
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
