import { useState, useCallback, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, FileText, File, X, CheckCircle, Loader2, Clock, Cpu } from 'lucide-react'
import Sidebar from '../components/Sidebar'
import ChatWindow from '../components/ChatWindow'
import * as chatApi from '../services/chatApi'
import * as documentApi from '../services/documentApi'

// ─── Inline ChatInput (with file chips above textarea) ──────────────────────
import { Plus, Mic, ArrowUp } from 'lucide-react'

const STATUS_CONFIG = {
  queued:     { label: 'Uploading',  icon: Clock,       color: 'text-white/50' },
  UPLOADED:   { label: 'Uploaded',   icon: Clock,       color: 'text-white/50' },
  PROCESSING: { label: 'Processing', icon: Loader2,     color: 'text-blue-400', spin: true },
  EMBEDDING:  { label: 'Embedding',  icon: Cpu,         color: 'text-violet-400', spin: true },
  COMPLETED:  { label: null,         icon: CheckCircle, color: 'text-emerald-400' },
  FAILED:     { label: 'Failed',     icon: X,           color: 'text-red-400' },
}

function FileChip({ file, onRemove }) {
  const status = file.status || 'queued'
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.queued
  const StatusIcon = cfg.icon
  const ext = file.name.split('.').pop()?.toUpperCase()

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.85, y: 6 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.85, y: 6 }}
      transition={{ duration: 0.2 }}
      className="flex items-center gap-2 bg-white/6 border border-white/10 rounded-xl px-3 py-2 max-w-[200px]"
    >
      <div className={`flex-shrink-0 ${
        ext === 'PDF' ? 'text-red-400' : ext === 'DOCX' ? 'text-blue-400' : 'text-white/50'
      }`}>
        <FileText className="w-4 h-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-white/80 font-medium truncate leading-tight">{file.name}</p>
        <p className={`text-[10px] flex items-center gap-1 mt-0.5 ${cfg.color}`}>
          <StatusIcon className={`w-2.5 h-2.5 ${cfg.spin ? 'animate-spin' : ''}`} />
          {cfg.label ?? 'Ready'}
        </p>
      </div>
      <button
        type="button"
        onClick={() => onRemove(file._uid)}
        className="flex-shrink-0 text-white/25 hover:text-white/60 transition-colors"
      >
        <X className="w-3 h-3" />
      </button>
    </motion.div>
  )
}

function ChatInputWithFiles({ onSend, isLoading }) {
  const [text, setText] = useState('')
  const [attachedFiles, setAttachedFiles] = useState([])
  const [isDragging, setIsDragging] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const textareaRef = useRef(null)
  const fileInputRef = useRef(null)
  const intervalsRef = useRef({})

  // Clean up all running intervals on unmount
  useEffect(() => {
    return () => {
      if (intervalsRef.current) {
        Object.values(intervalsRef.current).forEach(clearInterval)
      }
    }
  }, [])

  // Auto-resize textarea
  const resizeTextarea = () => {
    const ta = textareaRef.current
    if (!ta) return
    ta.style.height = 'auto'
    ta.style.height = Math.min(ta.scrollHeight, 160) + 'px'
  }

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  function handleSend() {
    const trimmed = text.trim()
    if (!trimmed || isLoading) return
    onSend?.(trimmed)
    setText('')
    setAttachedFiles([])
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
  }

  // Upload and Poll file status
  const uploadAndPollFile = useCallback(async (file, uid) => {
    try {
      const res = await documentApi.uploadDocument(file)
      const doc = res.document
      const docId = doc.id

      // Update file state to UPLOADED or current backend state
      setAttachedFiles(prev =>
        prev.map(f => (f._uid === uid ? { ...f, status: doc.status, id: docId } : f))
      )

      // Start status polling
      const interval = setInterval(async () => {
        try {
          const statusRes = await documentApi.getDocumentStatus(docId)
          const currentStatus = statusRes.status

          setAttachedFiles(prev =>
            prev.map(f => {
              if (f._uid === uid) {
                if (currentStatus === 'COMPLETED' || currentStatus === 'FAILED') {
                  clearInterval(interval)
                  delete intervalsRef.current[uid]
                }
                return { ...f, status: currentStatus }
              }
              return f
            })
          )
        } catch (pollErr) {
          console.error('Polling error:', pollErr)
          clearInterval(interval)
          delete intervalsRef.current[uid]
          setAttachedFiles(prev =>
            prev.map(f => (f._uid === uid ? { ...f, status: 'FAILED' } : f))
          )
        }
      }, 1500)

      intervalsRef.current[uid] = interval
    } catch (uploadErr) {
      console.error('Upload error:', uploadErr)
      setAttachedFiles(prev =>
        prev.map(f => (f._uid === uid ? { ...f, status: 'FAILED' } : f))
      )
    }
  }, [])

  function addFiles(rawFiles) {
    const tagged = Array.from(rawFiles).map(f => {
      const uid = `${f.name}_${f.size}_${Date.now()}_${Math.random()}`
      uploadAndPollFile(f, uid)
      return {
        _uid: uid,
        name: f.name,
        size: f.size,
        status: 'queued',
      }
    })
    setAttachedFiles(prev => [...prev, ...tagged])
  }

  function removeFile(uid) {
    if (intervalsRef.current[uid]) {
      clearInterval(intervalsRef.current[uid])
      delete intervalsRef.current[uid]
    }
    setAttachedFiles(prev => prev.filter(f => f._uid !== uid))
  }

  const onDragEnter = e => { e.preventDefault(); setIsDragging(true) }
  const onDragLeave = e => { if (!e.currentTarget.contains(e.relatedTarget)) setIsDragging(false) }
  const onDragOver = e => e.preventDefault()
  const onDrop = e => {
    e.preventDefault()
    setIsDragging(false)
    const files = Array.from(e.dataTransfer.files).filter(f => f.name.match(/\.(pdf|docx|txt)$/i))
    if (files.length) addFiles(files)
  }

  return (
    <div
      className="relative px-4 sm:px-8 pb-6 pt-2 flex-shrink-0"
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
              className="absolute inset-0 z-50 rounded-2xl border-2 border-dashed border-blue-500/60 bg-blue-600/5 flex items-center justify-center pointer-events-none mx-4"
            >
              <div className="text-center">
                <FileText className="w-7 h-7 text-blue-400 mx-auto mb-2" />
                <p className="text-blue-300 text-sm font-medium">Drop files to attach</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Container card */}
        <div className="glass-strong rounded-2xl border border-white/10 hover:border-white/15 focus-within:border-blue-500/40 transition-all duration-300 shadow-2xl">

          {/* File chips row — above textarea, inside the card */}
          <AnimatePresence>
            {attachedFiles.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="flex flex-wrap gap-2 px-3 pt-3"
              >
                {attachedFiles.map(f => (
                  <FileChip key={f._uid} file={f} onRemove={removeFile} />
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Input row */}
          <div className="flex items-end gap-2 p-3">
            {/* Attach button */}
            <div className="flex-shrink-0 self-end mb-0.5">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,.docx,.txt"
                onChange={e => { addFiles(e.target.files); e.target.value = '' }}
                className="hidden"
                id="file-upload"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-9 h-9 rounded-xl glass hover:bg-blue-600/15 border border-white/8 hover:border-blue-500/30 flex items-center justify-center text-white/50 hover:text-blue-400 transition-all duration-200"
                title="Attach files (PDF, DOCX, TXT)"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {/* Textarea */}
            <textarea
              ref={textareaRef}
              value={text}
              onChange={e => { setText(e.target.value); resizeTextarea() }}
              onKeyDown={handleKey}
              placeholder="Ask anything..."
              rows={1}
              className="flex-1 bg-transparent text-white text-sm placeholder-white/25 resize-none outline-none leading-relaxed max-h-40 py-2 self-end"
              style={{ minHeight: '36px' }}
            />

            {/* Mic */}
            <button
              onClick={() => setIsRecording(r => !r)}
              className={`flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200 self-end mb-0.5 ${
                isRecording
                  ? 'bg-red-500/20 border border-red-500/40 text-red-400'
                  : 'glass border border-white/8 hover:border-white/20 text-white/40 hover:text-white/70'
              }`}
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
            >
              {isLoading
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <ArrowUp className="w-4 h-4" />
              }
            </motion.button>
          </div>
        </div>

        <p className="text-center text-xs text-white/20 mt-2">
          <kbd className="px-1.5 py-0.5 glass rounded text-white/25 text-xs">Enter</kbd> to send ·{' '}
          <kbd className="px-1.5 py-0.5 glass rounded text-white/25 text-xs">Shift+Enter</kbd> for new line
        </p>
      </div>
    </div>
  )
}

// ─── Empty State ─────────────────────────────────────────────────────────────
function EmptyState() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="flex-1 flex flex-col items-center justify-center px-8 pb-16"
    >
      {/* Orbit icon */}
      <motion.div
        animate={{ scale: [1, 1.06, 1] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500/20 to-violet-600/20 border border-blue-500/20 flex items-center justify-center mb-6"
      >
        <Sparkles className="w-7 h-7 text-blue-400" />
      </motion.div>

      <h2 className="font-display text-3xl font-bold text-white mb-3 text-center">
        How can I help you?
      </h2>
      <p className="text-white/35 text-sm text-center max-w-sm leading-relaxed">
        Upload your documents, websites, or videos and start asking questions.
      </p>
    </motion.div>
  )
}

function getTime() {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function formatMsgTime(dateStr) {
  try {
    const d = new Date(dateStr)
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  } catch {
    return getTime()
  }
}

// ─── Main Chat Page ───────────────────────────────────────────────────────────
export default function Chat() {
  const [collapsed, setCollapsed] = useState(false)
  const [activeChatId, setActiveChatId] = useState(null)
  const [messages, setMessages] = useState([])
  const [isLoading, setIsLoading] = useState(false)

  // Load chat messages when activeChatId changes
  useEffect(() => {
    if (activeChatId) {
      setIsLoading(true)
      chatApi.getChatById(activeChatId)
        .then(res => {
          const formatted = res.messages.map(m => ({
            id: m.id,
            role: m.role,
            content: m.content,
            sources: m.sources || [],
            timestamp: formatMsgTime(m.createdAt),
          }))
          setMessages(formatted)
        })
        .catch(err => {
          console.error('Failed to load chat details:', err)
        })
        .finally(() => {
          setIsLoading(false)
        })
    } else {
      setMessages([])
    }
  }, [activeChatId])

  const handleSend = useCallback(async (text) => {
    setIsLoading(true)

    // 1. User is initiating a brand new chat session
    if (!activeChatId) {
      // Add user message locally
      const tempUserMsg = {
        id: 'temp-user-id',
        role: 'user',
        content: text,
        timestamp: getTime(),
      }
      setMessages([tempUserMsg])

      try {
        const res = await chatApi.createChat(text)
        // Automatically selects the new chat session (which will fire the load message useEffect)
        setActiveChatId(res.session.id)
      } catch (err) {
        console.error('Failed to start chat:', err)
        setIsLoading(false)
      }
      return
    }

    // 2. Appending message to an active chat session
    const userMsg = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      timestamp: getTime(),
    }
    setMessages(prev => [...prev, userMsg])

    const typingId = (Date.now() + 1).toString()
    setMessages(prev => [...prev, { id: typingId, role: 'assistant', isTyping: true }])

    try {
      const reply = await chatApi.sendMessage({ chatId: activeChatId, content: text })
      const assistantMsg = {
        id: reply.id,
        role: 'assistant',
        content: reply.content,
        sources: reply.sources || [],
        timestamp: formatMsgTime(reply.createdAt),
      }
      setMessages(prev => [
        ...prev.filter(m => m.id !== typingId),
        assistantMsg,
      ])
    } catch (err) {
      console.error('Failed to send message:', err)
      setMessages(prev => prev.filter(m => m.id !== typingId))
    } finally {
      setIsLoading(false)
    }
  }, [activeChatId])

  return (
    <div className="flex h-screen bg-orbit-bg overflow-hidden">
      <Sidebar
        collapsed={collapsed}
        setCollapsed={setCollapsed}
        activeChatId={activeChatId}
        setActiveChatId={setActiveChatId}
      />

      {/* Main column */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {messages.length === 0 ? (
          <EmptyState />
        ) : (
          <ChatWindow messages={messages} />
        )}

        <ChatInputWithFiles
          onSend={handleSend}
          isLoading={isLoading}
        />
      </div>
    </div>
  )
}
