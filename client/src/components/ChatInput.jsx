import { useState, useRef, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Mic, ArrowUp, Loader2, FileText, File, X } from 'lucide-react'

export default function ChatInput({ onSend, onUpload, isLoading }) {
  const [text, setText] = useState('')
  const [isDragging, setIsDragging] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const textareaRef = useRef(null)
  const fileInputRef = useRef(null)

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current
    if (!ta) return
    ta.style.height = 'auto'
    ta.style.height = Math.min(ta.scrollHeight, 160) + 'px'
  }, [text])

  const handleKey = useCallback(e => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }, [text])

  function handleSend() {
    const trimmed = text.trim()
    if (!trimmed || isLoading) return
    onSend?.(trimmed)
    setText('')
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }

  function handleFileSelect(e) {
    const files = Array.from(e.target.files || [])
    if (files.length) onUpload?.(files)
    e.target.value = ''
  }

  // Drag & Drop
  const onDragEnter = e => { e.preventDefault(); setIsDragging(true) }
  const onDragLeave = e => { if (!e.currentTarget.contains(e.relatedTarget)) setIsDragging(false) }
  const onDragOver = e => e.preventDefault()
  const onDrop = e => {
    e.preventDefault()
    setIsDragging(false)
    const files = Array.from(e.dataTransfer.files)
    if (files.length) onUpload?.(files)
  }

  function toggleRecording() {
    setIsRecording(r => !r)
    // In production: connect to Web Speech API
  }

  return (
    <div
      className="relative px-4 sm:px-8 pb-6 pt-3 flex-shrink-0"
      onDragEnter={onDragEnter}
      onDragLeave={onDragLeave}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      <div className="max-w-3xl mx-auto">
        {/* Drag overlay */}
        <AnimatePresence>
          {isDragging && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-50 rounded-2xl border-2 border-dashed border-blue-500/60 bg-blue-600/5 backdrop-blur-sm flex items-center justify-center pointer-events-none mx-4"
            >
              <div className="text-center">
                <FileText className="w-8 h-8 text-blue-400 mx-auto mb-2" />
                <p className="text-blue-300 font-medium text-sm">Drop files to upload</p>
                <p className="text-white/40 text-xs mt-1">PDF, DOCX, TXT supported</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Input box */}
        <div className="glass-strong rounded-2xl border border-white/10 hover:border-white/15 focus-within:border-blue-500/40 transition-all duration-300 shadow-2xl">
          <div className="flex items-end gap-2 p-3">
            {/* Plus / Upload */}
            <div className="relative flex-shrink-0 self-end mb-0.5">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,.docx,.txt"
                onChange={handleFileSelect}
                className="hidden"
                id="file-upload"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-9 h-9 rounded-xl glass hover:bg-blue-600/15 border border-white/8 hover:border-blue-500/30 flex items-center justify-center text-white/50 hover:text-blue-400 transition-all duration-200"
                title="Upload files (PDF, DOCX, TXT)"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {/* Textarea */}
            <textarea
              ref={textareaRef}
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Ask anything from your knowledge base..."
              rows={1}
              className="flex-1 bg-transparent text-white text-sm placeholder-white/25 resize-none outline-none leading-relaxed max-h-40 py-2 self-end"
              style={{ minHeight: '36px' }}
            />

            {/* Mic */}
            <button
              onClick={toggleRecording}
              className={`flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200 self-end mb-0.5 ${
                isRecording
                  ? 'bg-red-500/20 border border-red-500/40 text-red-400'
                  : 'glass border border-white/8 hover:border-white/20 text-white/40 hover:text-white/70'
              }`}
              title="Voice input"
            >
              <Mic className={`w-4 h-4 ${isRecording ? 'animate-pulse' : ''}`} />
            </button>

            {/* Send */}
            <motion.button
              onClick={handleSend}
              disabled={!text.trim() || isLoading}
              whileHover={text.trim() && !isLoading ? { scale: 1.05 } : {}}
              whileTap={text.trim() && !isLoading ? { scale: 0.95 } : {}}
              className={`flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200 self-end mb-0.5 ${
                text.trim() && !isLoading
                  ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/40'
                  : 'bg-white/5 text-white/20 cursor-not-allowed'
              }`}
              title="Send (Enter)"
            >
              {isLoading
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <ArrowUp className="w-4 h-4" />
              }
            </motion.button>
          </div>
        </div>

        {/* Footer hint */}
        <p className="text-center text-xs text-white/20 mt-2">
          Press <kbd className="px-1.5 py-0.5 glass rounded text-white/30 text-xs">Enter</kbd> to send ·{' '}
          <kbd className="px-1.5 py-0.5 glass rounded text-white/30 text-xs">Shift+Enter</kbd> for new line
        </p>
      </div>
    </div>
  )
}
