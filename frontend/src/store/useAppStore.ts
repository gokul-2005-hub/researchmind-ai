import { create } from "zustand"
import type { Paper, ChatSession } from "@/types/api"

interface User {
  id: string
  username: string
  role: string
}

interface AppState {
  theme: "light" | "dark"
  activePaperId: string | null
  activeSessionId: string | null
  papers: Paper[]
  sessions: ChatSession[]
  isUploading: boolean
  isResponding: boolean
  pendingNotesAppend: string | null
  
  // Auth state
  user: User | null
  token: string | null
  
  // Actions
  toggleTheme: () => void
  setTheme: (theme: "light" | "dark") => void
  setActivePaperId: (id: string | null) => void
  setActiveSessionId: (id: string | null) => void
  setPapers: (papers: Paper[]) => void
  setSessions: (sessions: ChatSession[]) => void
  setIsUploading: (isUploading: boolean) => void
  setIsResponding: (isResponding: boolean) => void
  setPendingNotesAppend: (text: string | null) => void
  
  // Auth Actions
  login: (id: string, username: string, token: string, role: string) => void
  logout: () => void
  resetStore: () => void
}

// Read initial auth states from localStorage
const storedToken = localStorage.getItem("rm_auth_token")
const storedUser = localStorage.getItem("rm_auth_user")
let parsedUser: User | null = null

try {
  if (storedUser) {
    parsedUser = JSON.parse(storedUser)
  }
} catch {
  // Ignore malformed JSON
}

export const useAppStore = create<AppState>((set) => ({
  theme: "dark", // Sleek dark mode by default
  activePaperId: null,
  activeSessionId: null,
  papers: [],
  sessions: [],
  isUploading: false,
  isResponding: false,
  pendingNotesAppend: null,
  
  user: parsedUser,
  token: storedToken,

  toggleTheme: () => set((state) => {
    const nextTheme = state.theme === "light" ? "dark" : "light"
    if (nextTheme === "dark") {
      document.documentElement.classList.add("dark")
    } else {
      document.documentElement.classList.remove("dark")
    }
    return { theme: nextTheme }
  }),

  setTheme: (theme) => {
    if (theme === "dark") {
      document.documentElement.classList.add("dark")
    } else {
      document.documentElement.classList.remove("dark")
    }
    set({ theme })
  },

  setActivePaperId: (id) => set({ activePaperId: id }),
  setActiveSessionId: (id) => set({ activeSessionId: id }),
  setPapers: (papers) => set({ papers }),
  setSessions: (sessions) => set({ sessions }),
  setIsUploading: (isUploading) => set({ isUploading }),
  setIsResponding: (isResponding) => set({ isResponding }),
  setPendingNotesAppend: (text) => set({ pendingNotesAppend: text }),

  // Auth logins
  login: (id, username, token, role) => {
    const userPayload = { id, username, role }
    localStorage.setItem("rm_auth_token", token)
    localStorage.setItem("rm_auth_user", JSON.stringify(userPayload))
    set({ user: userPayload, token })
  },

  logout: () => {
    localStorage.removeItem("rm_auth_token")
    localStorage.removeItem("rm_auth_user")
    set({ 
      user: null, 
      token: null,
      activePaperId: null,
      activeSessionId: null,
      papers: [],
      sessions: []
    })
    // Force a complete browser refresh to clear memory cache, React Query cache, and reset layout states
    window.location.href = "/"
  },

  resetStore: () => set({
    activePaperId: null,
    activeSessionId: null,
    papers: [],
    sessions: [],
    isUploading: false,
    isResponding: false,
  })
}))
