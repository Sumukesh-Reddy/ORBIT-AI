import api from './api'

export async function uploadDocument(file) {
  try {
    const formData = new FormData()
    formData.append('file', file)

    const response = await api.post('/documents/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data // Returns { document, message }
  } catch (error) {
    const msg = error.response?.data?.detail || 'Failed to upload document.'
    throw new Error(msg)
  }
}

export async function getDocumentStatus(documentId) {
  try {
    const response = await api.get(`/documents/${documentId}/status`)
    return response.data // Returns { id, status, taskId, errorMessage, updatedAt }
  } catch (error) {
    const msg = error.response?.data?.detail || 'Failed to fetch document status.'
    throw new Error(msg)
  }
}

export async function listDocuments(page = 1, limit = 20) {
  try {
    const response = await api.get('/documents', {
      params: { page, limit },
    })
    return response.data // Returns { documents, total, page, limit, has_next }
  } catch (error) {
    const msg = error.response?.data?.detail || 'Failed to list documents.'
    throw new Error(msg)
  }
}

export async function deleteDocument(documentId) {
  try {
    const response = await api.delete(`/documents/${documentId}`)
    return response.data // Returns { message }
  } catch (error) {
    const msg = error.response?.data?.detail || 'Failed to delete document.'
    throw new Error(msg)
  }
}
