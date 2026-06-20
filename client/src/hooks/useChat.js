import { useState, useCallback, useRef } from 'react'

let msgId = 100

function getTime() {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

const MOCK_RESPONSES = [
  { content: 'Based on your knowledge base, here is a comprehensive answer with relevant insights from your documents.', sources: ['doc1.pdf · p.5', 'notes.txt'] },
  { content: 'I found several relevant sections across your uploaded materials. Let me synthesize the key points for you.', sources: ['research_paper.pdf · p.12'] },
  { content: 'Great question! According to the sources in your knowledge base, there are multiple perspectives to consider here.', sources: ['textbook.pdf · Ch.3', 'article.txt'] },
]
let ri = 0

export function useChat() {
  const [messages, setMessages] = useState([])
  const [isTyping, setIsTyping] = useState(false)
  const [chatHistory, setChatHistory] = useState([])

  const sendMessage = useCallback(async (content) => {
    const userMsg = {
      id: (++msgId).toString(),
      role: 'user',
      content,
      timestamp: getTime(),
    }
    setMessages(prev => [...prev, userMsg])

    // Typing indicator
    const typingId = (++msgId).toString()
    setIsTyping(true)
    setMessages(prev => [...prev, { id: typingId, role: 'assistant', isTyping: true }])

    await new Promise(r => setTimeout(r, 1500 + Math.random() * 800))

    const resp = MOCK_RESPONSES[ri++ % MOCK_RESPONSES.length]
    setMessages(prev => [
      ...prev.filter(m => m.id !== typingId),
      { id: typingId, role: 'assistant', content: resp.content, sources: resp.sources, timestamp: getTime() },
    ])
    setIsTyping(false)
  }, [])

  const clearMessages = useCallback(() => setMessages([]), [])

  return { messages, isTyping, sendMessage, clearMessages, chatHistory }
}
