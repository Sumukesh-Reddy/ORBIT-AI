import { useRef, useEffect } from 'react'
import MessageBubble from './MessageBubble'
import { motion } from 'framer-motion'

export default function ChatWindow({ messages, documents = [] }) {
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  return (
    <div className="flex-1 overflow-y-auto chat-scroll px-4 sm:px-8 py-6">
      <div className="max-w-3xl mx-auto">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
        >
          {messages.map(msg => (
            <MessageBubble key={msg.id} message={msg} documents={documents} />
          ))}
          <div ref={bottomRef} />
        </motion.div>
      </div>
    </div>
  )
}
