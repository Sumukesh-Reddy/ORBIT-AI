import api from './api'

export async function createChat(message, attachments = []) {
  try {
    const response = await api.post('/chat/new', { message, attachments })
    return response.data // Returns { session, message }
  } catch (error) {
    const msg = error.response?.data?.detail || 'Failed to create new chat session.'
    throw new Error(msg)
  }
}

export async function getChatHistory(page = 1, limit = 20, search = '') {
  try {
    const response = await api.get('/chat/history', {
      params: { page, limit, search: search || undefined },
    })
    return response.data // Returns { sessions, total, page, limit, has_next }
  } catch (error) {
    const msg = error.response?.data?.detail || 'Failed to retrieve chat history.'
    throw new Error(msg)
  }
}

export async function getChatById(chatId) {
  try {
    const response = await api.get(`/chat/${chatId}`)
    return response.data // Returns { session, messages }
  } catch (error) {
    const msg = error.response?.data?.detail || 'Failed to fetch chat messages.'
    throw new Error(msg)
  }
}

export async function deleteChat(chatId) {
  try {
    const response = await api.delete(`/chat/${chatId}`)
    return response.data
  } catch (error) {
    const msg = error.response?.data?.detail || 'Failed to delete chat session.'
    throw new Error(msg)
  }
}

export async function renameChat(chatId, title) {
  try {
    const response = await api.patch(`/chat/${chatId}/rename`, { title })
    return response.data // Returns { session, message }
  } catch (error) {
    const msg = error.response?.data?.detail || 'Failed to rename chat session.'
    throw new Error(msg)
  }
}

export async function sendMessage({ chatId, content, attachments = [] }) {
  try {
    const response = await api.post(`/chat/${chatId}/message`, { content, attachments })
    return response.data // Returns MessageResponse: { id, sessionId, role, content, sources, createdAt }
  } catch (error) {
    const msg = error.response?.data?.detail || 'Failed to send message.'
    throw new Error(msg)
  }
}
