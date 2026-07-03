import axios from "axios"
import type { 
  Paper, 
  ChatSession, 
  Message, 
  QueryResponse, 
  Note, 
  NoteSaveRequest 
} from "@/types/api"

// Default backend API URL. Supports custom environment overrides.
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api/v1"

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
})

// Axios Authorization Request Interceptor
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("rm_auth_token")
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

export const authApi = {
  login: async (username: string, password: string) => {
    const { data } = await apiClient.post<{ 
      access_token: string; 
      token_type: string; 
      user: { id: string; username: string; role: string } 
    }>("/auth/login", { username, password })
    return data
  },
  register: async (username: string, password: string) => {
    const { data } = await apiClient.post<{ message: string }>("/auth/register", { username, password })
    return data
  },
  listUsers: async () => {
    const { data } = await apiClient.get<Array<{ id: string; username: string; role: string }>>("/auth/users")
    return data
  },
  deleteUser: async (userId: string) => {
    const { data } = await apiClient.delete<{ message: string }>(`/auth/users/${userId}`)
    return data
  }
}

export const papersApi = {
  list: async (userId?: string): Promise<Paper[]> => {
    const { data } = await apiClient.get<Paper[]>("/papers/", {
      params: userId ? { user_id: userId } : {}
    })
    return data
  },

  get: async (id: string): Promise<Paper> => {
    const { data } = await apiClient.get<Paper>(`/papers/${id}`)
    return data
  },

  upload: async (file: File): Promise<Paper> => {
    const formData = new FormData()
    formData.append("file", file)
    const { data } = await apiClient.post<Paper>("/papers/", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    })
    return data
  },

  delete: async (id: string): Promise<{ paper_id: string; message: string }> => {
    const { data } = await apiClient.delete<{ paper_id: string; message: string }>(`/papers/${id}`)
    return data
  },

  download: async (id: string, filename: string): Promise<void> => {
    const response = await apiClient.get(`/papers/${id}/download`, {
      responseType: "blob"
    })
    const url = window.URL.createObjectURL(new Blob([response.data]))
    const link = document.createElement("a")
    link.href = url
    const pdfFilename = filename.toLowerCase().endsWith(".pdf") 
      ? filename 
      : `${filename}.pdf`
    link.setAttribute("download", pdfFilename)
    document.body.appendChild(link)
    link.click()
    link.parentNode?.removeChild(link)
  },

  viewPdf: async (id: string): Promise<void> => {
    const response = await apiClient.get(`/papers/${id}/view`, {
      responseType: "blob"
    })
    const file = new Blob([response.data], { type: "application/pdf" })
    const fileURL = URL.createObjectURL(file)
    window.open(fileURL, "_blank")
  }
}

export const chatsApi = {
  listSessions: async (paperId: string, userId?: string): Promise<ChatSession[]> => {
    const { data } = await apiClient.get<ChatSession[]>(`/chats/${paperId}/sessions`, {
      params: userId ? { user_id: userId } : {}
    })
    return data
  },

  createSession: async (paperId: string, title?: string, userId?: string): Promise<ChatSession> => {
    const params: Record<string, string> = {}
    if (title) params.title = title
    if (userId) params.user_id = userId
    const { data } = await apiClient.post<ChatSession>(`/chats/${paperId}/sessions`, null, { params })
    return data
  },

  deleteSession: async (sessionId: string): Promise<{ session_id: string; message: string }> => {
    const { data } = await apiClient.delete<{ session_id: string; message: string }>(`/chats/sessions/${sessionId}`)
    return data
  },

  listMessages: async (sessionId: string): Promise<Message[]> => {
    const { data } = await apiClient.get<Message[]>(`/chats/sessions/${sessionId}/messages`)
    return data
  },

  queryAgent: async (sessionId: string, userQuery: string): Promise<QueryResponse> => {
    const { data } = await apiClient.post<QueryResponse>(`/chats/sessions/${sessionId}/query`, {
      user_query: userQuery,
    })
    return data
  },
}

export const notesApi = {
  get: async (paperId: string, userId?: string): Promise<Note> => {
    const { data } = await apiClient.get<Note>(`/notes/${paperId}`, {
      params: userId ? { user_id: userId } : {}
    })
    return data
  },

  save: async (paperId: string, payload: NoteSaveRequest, userId?: string): Promise<Note> => {
    const { data } = await apiClient.post<Note>(`/notes/${paperId}`, payload, {
      params: userId ? { user_id: userId } : {}
    })
    return data
  },
}
