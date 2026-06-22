import { useState, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Orbit, Search, Plus, MessageSquare, MoreHorizontal, Pin,
  Pencil, Trash2, LogOut, ChevronLeft, ChevronRight,
  User, Clock, X
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import * as chatApi from '../services/chatApi'

function ChatItem({ chat, isActive, onClick, onDelete, onPin, onRename }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [titleInput, setTitleInput] = useState(chat.title)

  useEffect(() => {
    setTitleInput(chat.title)
  }, [chat.title])

  function openMenu(e) {
    e.stopPropagation()
    setMenuOpen(true)
  }

  const handleSave = async (e) => {
    if (e) e.stopPropagation()
    setIsEditing(false)
    if (titleInput.trim() && titleInput.trim() !== chat.title) {
      try {
        await onRename(chat.id, titleInput.trim())
      } catch (err) {
        setTitleInput(chat.title)
      }
    } else {
      setTitleInput(chat.title)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSave()
    } else if (e.key === 'Escape') {
      setIsEditing(false)
      setTitleInput(chat.title)
    }
  }

  return (
    <div
      onClick={onClick}
      className={`group relative flex items-center gap-2 px-3 py-2.5 rounded-xl cursor-pointer transition-all duration-200 ${
        isActive
          ? 'bg-blue-600/15 border border-blue-500/20 text-white'
          : 'hover:bg-white/5 text-white/60 hover:text-white'
      }`}
    >
      {chat.pinned && (
        <Pin className="w-3 h-3 text-blue-400 flex-shrink-0" />
      )}
      <MessageSquare className="w-3.5 h-3.5 flex-shrink-0 opacity-60" />
      <div className="flex-1 min-w-0" onClick={e => isEditing && e.stopPropagation()}>
        {isEditing ? (
          <input
            type="text"
            value={titleInput}
            onChange={e => setTitleInput(e.target.value)}
            onBlur={handleSave}
            onKeyDown={handleKeyDown}
            autoFocus
            className="w-full bg-white/10 border border-blue-500/30 rounded px-1.5 py-0.5 text-sm text-white outline-none focus:ring-1 focus:ring-blue-500/50"
          />
        ) : (
          <>
            <p className="text-sm truncate font-medium">{chat.title}</p>
            <p className="text-xs text-white/30 flex items-center gap-1 mt-0.5">
              <Clock className="w-2.5 h-2.5" />
              {chat.time}
            </p>
          </>
        )}
      </div>

      {/* Three-dot menu trigger */}
      {!isEditing && (
        <button
          onClick={openMenu}
          className="opacity-0 group-hover:opacity-100 p-1 rounded-md hover:bg-white/10 transition-all duration-200 flex-shrink-0"
        >
          <MoreHorizontal className="w-3.5 h-3.5" />
        </button>
      )}

      {/* Dropdown Menu */}
      <AnimatePresence>
        {menuOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: -8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: -8 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 top-8 z-50 glass-strong rounded-xl border border-white/10 overflow-hidden shadow-2xl min-w-[150px]"
              onClick={e => e.stopPropagation()}
            >
              {[
                { icon: Pencil, label: 'Rename', action: () => { setIsEditing(true); setMenuOpen(false) } },
                { icon: Pin, label: chat.pinned ? 'Unpin' : 'Pin', action: () => { onPin?.(chat.id); setMenuOpen(false) } },
                { icon: Trash2, label: 'Delete', action: () => { onDelete?.(chat.id); setMenuOpen(false) }, danger: true },
              ].map(({ icon: Icon, label, action, danger }) => (
                <button
                  key={label}
                  onClick={action}
                  className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors hover:bg-white/5 ${
                    danger ? 'text-red-400 hover:text-red-300' : 'text-white/70 hover:text-white'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {label}
                </button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function Sidebar({ collapsed, setCollapsed, activeChatId, setActiveChatId, refreshTrigger }) {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const [chats, setChats] = useState([])
  const [search, setSearch] = useState('')

  // Format datetimes to relative text
  const formatTime = (dateStr) => {
    try {
      const now = new Date()
      const date = new Date(dateStr)
      const diffMs = now - date
      const diffMins = Math.floor(diffMs / (1000 * 60))
      const diffHrs = Math.floor(diffMs / (1000 * 60 * 60))

      if (diffMins < 1) return 'Just now'
      if (diffMins < 60) return `${diffMins} min ago`
      if (diffHrs < 24) return `${diffHrs} hr${diffHrs > 1 ? 's' : ''} ago`
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
    } catch {
      return 'Recently'
    }
  }

  // Load chat history from backend
  const loadChats = useCallback(async () => {
    try {
      const res = await chatApi.getChatHistory(1, 100)
      const mapped = res.sessions.map(s => ({
        id: s.id,
        title: s.title,
        time: formatTime(s.updatedAt),
        pinned: false,
      }))
      setChats(mapped)
    } catch (err) {
      console.error('Failed to load chat history:', err)
    }
  }, [])

  useEffect(() => {
    loadChats()
  }, [loadChats, activeChatId, refreshTrigger])

  const deleteChat = useCallback(async (id) => {
    try {
      await chatApi.deleteChat(id)
      setChats(prev => prev.filter(c => c.id !== id))
      if (activeChatId === id) {
        setActiveChatId(null)
      }
    } catch (err) {
      console.error('Failed to delete chat:', err)
    }
  }, [activeChatId, setActiveChatId])

  const pinChat = useCallback((id) => {
    setChats(prev => prev.map(c => c.id === id ? { ...c, pinned: !c.pinned } : c))
  }, [])

  const renameChat = useCallback(async (id, newTitle) => {
    try {
      await chatApi.renameChat(id, newTitle)
      setChats(prev => prev.map(c => c.id === id ? { ...c, title: newTitle } : c))
    } catch (err) {
      console.error('Failed to rename chat:', err)
      throw err
    }
  }, [])

  const handleSignOut = useCallback(async () => {
    await logout()
    navigate('/login')
  }, [logout, navigate])

  const filtered = chats.filter(c =>
    c.title.toLowerCase().includes(search.toLowerCase())
  )
  const pinned = filtered.filter(c => c.pinned)
  const recent = filtered.filter(c => !c.pinned)

  return (
    <motion.aside
      animate={{ width: collapsed ? 72 : 280 }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
      className="relative h-full glass-dark border-r border-white/5 flex flex-col overflow-hidden flex-shrink-0"
    >
      {/* Collapse Button */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-6 z-20 w-6 h-6 rounded-full glass-strong border border-white/10 flex items-center justify-center hover:border-blue-500/30 transition-all duration-200 hover:bg-blue-600/10"
      >
        {collapsed
          ? <ChevronRight className="w-3 h-3 text-white/60" />
          : <ChevronLeft className="w-3 h-3 text-white/60" />
        }
      </button>

      {/* Logo */}
      <div className="flex items-center gap-3 p-4 pt-5 flex-shrink-0">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center flex-shrink-0 shadow-lg">
          <Orbit className="w-5 h-5 text-white" />
        </div>
        <AnimatePresence>
          {!collapsed && (
            <motion.span
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
              className="font-display font-bold text-lg text-white whitespace-nowrap"
            >
              ORBIT <span className="text-blue-400">AI</span>
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {/* New Chat */}
      <div className="px-3 mb-3 flex-shrink-0">
        <button
          onClick={() => setActiveChatId(null)}
          className={`w-full flex items-center gap-2 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/20 hover:border-blue-500/40 transition-all duration-200 text-blue-300 hover:text-blue-200 font-medium text-sm ${
            collapsed ? 'justify-center p-2.5' : 'px-3 py-2.5'
          }`}
        >
          <Plus className="w-4 h-4 flex-shrink-0" />
          <AnimatePresence>
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="whitespace-nowrap"
              >
                New Chat
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </div>

      {/* Search */}
      <AnimatePresence>
        {!collapsed && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="px-3 mb-4 flex-shrink-0"
          >
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
              <input
                type="text"
                placeholder="Search chats..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full bg-white/5 border border-white/8 rounded-lg pl-8 pr-3 py-2 text-xs text-white placeholder-white/30 outline-none focus:border-blue-500/40 transition-all"
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2">
                  <X className="w-3 h-3 text-white/40 hover:text-white/70" />
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto px-2 space-y-1 chat-scroll">
        <AnimatePresence>
          {!collapsed && pinned.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <p className="text-xs text-white/25 font-medium px-2 py-1.5 uppercase tracking-widest">Pinned</p>
              {pinned.map(chat => (
                <ChatItem
                  key={chat.id}
                  chat={chat}
                  isActive={activeChatId === chat.id}
                  onClick={() => setActiveChatId(chat.id)}
                  onDelete={deleteChat}
                  onPin={pinChat}
                  onRename={renameChat}
                />
              ))}
              <div className="h-px bg-white/5 my-2" />
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {!collapsed && recent.length > 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <p className="text-xs text-white/25 font-medium px-2 py-1.5 uppercase tracking-widest">Recent</p>
              {recent.map(chat => (
                <ChatItem
                  key={chat.id}
                  chat={chat}
                  isActive={activeChatId === chat.id}
                  onClick={() => setActiveChatId(chat.id)}
                  onDelete={deleteChat}
                  onPin={pinChat}
                  onRename={renameChat}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Collapsed - just icons */}
        {collapsed && (
          <div className="space-y-1">
            {chats.slice(0, 8).map(chat => (
              <button
                key={chat.id}
                onClick={() => setActiveChatId(chat.id)}
                className={`w-full flex items-center justify-center p-2.5 rounded-xl transition-all duration-200 ${
                  activeChatId === chat.id ? 'bg-blue-600/15 text-blue-300' : 'hover:bg-white/5 text-white/40'
                }`}
                title={chat.title}
              >
                <MessageSquare className="w-4 h-4" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Bottom Section */}
      <div className="flex-shrink-0 border-t border-white/5 p-3 space-y-1">
        {[
          { icon: LogOut, label: 'Sign Out', action: handleSignOut, danger: true },
        ].map(({ icon: Icon, label, action, danger }) => (
          <button
            key={label}
            onClick={action}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 text-sm ${
              collapsed ? 'justify-center' : ''
            } ${
              danger
                ? 'text-red-400/70 hover:text-red-400 hover:bg-red-500/5'
                : 'text-white/50 hover:text-white hover:bg-white/5'
            }`}
            title={label}
          >
            <Icon className="w-4 h-4 flex-shrink-0" />
            <AnimatePresence>
              {!collapsed && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="whitespace-nowrap"
                >
                  {label}
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        ))}

        {/* Profile */}
        <div className={`flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 cursor-pointer transition-all duration-200 ${collapsed ? 'justify-center' : ''}`}>
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center flex-shrink-0">
            <User className="w-4 h-4 text-white" />
          </div>
          <AnimatePresence>
            {!collapsed && user && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="min-w-0 font-display"
              >
                <p className="text-sm text-white font-medium truncate">{user.name}</p>
                <p className="text-xs text-white/30 truncate">{user.email}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.aside>
  )
}
