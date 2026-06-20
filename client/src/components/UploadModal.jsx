import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, FileText, File, CheckCircle, Loader2, Clock, Cpu, Upload, Info
} from 'lucide-react'

const STATUSES = ['queued', 'processing', 'embedding', 'completed']

const STATUS_CONFIG = {
  queued:     { label: 'Queued',     icon: Clock,       color: 'text-white/40',   bg: 'bg-white/5' },
  processing: { label: 'Processing', icon: Loader2,      color: 'text-blue-400',   bg: 'bg-blue-500/10' },
  embedding:  { label: 'Embedding',  icon: Cpu,          color: 'text-violet-400', bg: 'bg-violet-500/10' },
  completed:  { label: 'Completed',  icon: CheckCircle,  color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
}

function FileItem({ file, onRemove }) {
  const [status, setStatus] = useState('queued')
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    let step = 0
    const advance = () => {
      if (step >= STATUSES.length) return
      const delay = [800, 1200, 1600, 2000][step] || 1000
      setTimeout(() => {
        setStatus(STATUSES[step])
        setProgress(((step + 1) / STATUSES.length) * 100)
        step++
        if (step < STATUSES.length) advance()
      }, delay)
    }
    advance()
  }, [])

  const cfg = STATUS_CONFIG[status]
  const StatusIcon = cfg.icon
  const isLoading = status === 'processing' || status === 'embedding'

  const ext = file.name.split('.').pop()?.toLowerCase()

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
      className="glass rounded-xl p-3 border border-white/8"
    >
      <div className="flex items-center gap-3">
        {/* File icon */}
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
          ext === 'pdf' ? 'bg-red-500/15 text-red-400' :
          ext === 'docx' ? 'bg-blue-500/15 text-blue-400' :
          'bg-white/10 text-white/50'
        }`}>
          {ext === 'pdf' ? <FileText className="w-5 h-5" /> : <File className="w-5 h-5" />}
        </div>

        {/* File info */}
        <div className="flex-1 min-w-0">
          <p className="text-sm text-white font-medium truncate">{file.name}</p>
          <p className="text-xs text-white/30 mt-0.5">
            {(file.size / 1024).toFixed(1)} KB · {ext?.toUpperCase()}
          </p>

          {/* Progress bar */}
          <div className="mt-2 h-1 bg-white/8 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              className={`h-full rounded-full ${
                status === 'completed' ? 'bg-emerald-500' :
                status === 'embedding' ? 'bg-violet-500' :
                'bg-blue-500'
              }`}
            />
          </div>
        </div>

        {/* Status badge */}
        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full ${cfg.bg} flex-shrink-0`}>
          <StatusIcon className={`w-3 h-3 ${cfg.color} ${isLoading ? 'animate-spin' : ''}`} />
          <span className={`text-xs font-medium ${cfg.color}`}>{cfg.label}</span>
        </div>

        {/* Remove */}
        {status === 'completed' && (
          <button
            onClick={() => onRemove?.(file.name)}
            className="w-6 h-6 rounded-md hover:bg-white/10 flex items-center justify-center text-white/30 hover:text-white/60 transition-all"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </motion.div>
  )
}

export default function UploadModal({ isOpen, onClose, initialFiles = [] }) {
  const [files, setFiles] = useState([])
  const [isDragging, setIsDragging] = useState(false)

  useEffect(() => {
    if (isOpen && initialFiles.length > 0) {
      setFiles(prev => {
        const existingNames = new Set(prev.map(f => f._uid))
        const incoming = initialFiles.map(f => Object.assign(f, { _uid: `${f.name}_${f.size}_${Date.now()}_${Math.random()}` }))
        return [...prev, ...incoming.filter(f => !existingNames.has(f._uid))]
      })
    }
  }, [isOpen, initialFiles])

  function handleDrop(e) {
    e.preventDefault()
    setIsDragging(false)
    const dropped = Array.from(e.dataTransfer.files).filter(f =>
      ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain']
        .includes(f.type) || f.name.match(/\.(pdf|docx|txt)$/i)
    )
    const tagged = dropped.map(f => Object.assign(f, { _uid: `${f.name}_${f.size}_${Date.now()}_${Math.random()}` }))
    setFiles(prev => [...prev, ...tagged])
  }

  function handleFileSelect(e) {
    const selected = Array.from(e.target.files || []).map(f =>
      Object.assign(f, { _uid: `${f.name}_${f.size}_${Date.now()}_${Math.random()}` })
    )
    setFiles(prev => [...prev, ...selected])
    e.target.value = ''
  }

  function removeFile(name) {
    setFiles(prev => prev.filter(f => f.name !== name))
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, y: 60, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 60, scale: 0.95 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 w-full max-w-lg z-50 px-4"
          >
            <div className="glass-strong rounded-3xl border border-white/10 overflow-hidden shadow-2xl">
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-white/8">
                <div className="flex items-center gap-2">
                  <Upload className="w-5 h-5 text-blue-400" />
                  <h2 className="font-display font-semibold text-white">Upload Documents</h2>
                </div>
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-lg hover:bg-white/8 flex items-center justify-center text-white/50 hover:text-white transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto chat-scroll">
                {/* Drop Zone */}
                <div
                  onDragEnter={() => setIsDragging(true)}
                  onDragLeave={() => setIsDragging(false)}
                  onDragOver={e => e.preventDefault()}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all duration-300 cursor-pointer ${
                    isDragging
                      ? 'border-blue-500/70 bg-blue-600/10'
                      : 'border-white/10 hover:border-blue-500/30 hover:bg-white/3'
                  }`}
                  onClick={() => document.getElementById('modal-file-input')?.click()}
                >
                  <input
                    type="file"
                    id="modal-file-input"
                    multiple
                    accept=".pdf,.docx,.txt"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <Upload className={`w-8 h-8 mx-auto mb-3 transition-colors ${isDragging ? 'text-blue-400' : 'text-white/20'}`} />
                  <p className="text-white/60 font-medium text-sm mb-1">
                    {isDragging ? 'Drop files here' : 'Drag & drop files or click to browse'}
                  </p>
                  <div className="flex items-center justify-center gap-2 mt-2">
                    {['PDF', 'DOCX', 'TXT'].map(ext => (
                      <span key={ext} className="px-2.5 py-1 glass rounded-full text-xs text-white/40 border border-white/8">
                        {ext}
                      </span>
                    ))}
                  </div>
                </div>

                {/* File list */}
                <AnimatePresence>
                  {files.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="space-y-2"
                    >
                      <p className="text-xs text-white/30 font-medium uppercase tracking-widest">Processing Queue</p>
                      {files.map(f => (
                        <FileItem key={f._uid || `${f.name}_${f.size}`} file={f} onRemove={removeFile} />
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Celery badge */}
                {files.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex items-center gap-2 glass rounded-xl px-4 py-3 border border-white/8"
                  >
                    <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <Info className="w-3.5 h-3.5 text-white/40" />
                    <span className="text-xs text-white/40">
                      Processed using <span className="text-emerald-400 font-medium">Celery Background Workers</span>
                    </span>
                  </motion.div>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
