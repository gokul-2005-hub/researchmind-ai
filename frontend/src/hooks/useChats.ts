import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { chatsApi } from "@/services/api"
import { useAppStore } from "@/store/useAppStore"

export const useChats = (userId?: string) => {
  const queryClient = useQueryClient()
  const { 
    activePaperId, 
    activeSessionId, 
    setActiveSessionId,
    setSessions,
    setIsResponding 
  } = useAppStore()

  // 1. Fetch chat sessions for active paper
  const sessionsQuery = useQuery({
    queryKey: ["sessions", activePaperId, userId],
    queryFn: async () => {
      if (!activePaperId) return []
      const data = await chatsApi.listSessions(activePaperId, userId)
      setSessions(data) // Sync with Zustand
      return data
    },
    enabled: !!activePaperId,
  })

  // 2. Fetch messages for active chat session
  const messagesQuery = useQuery({
    queryKey: ["messages", activeSessionId],
    queryFn: async () => {
      if (!activeSessionId) return []
      return await chatsApi.listMessages(activeSessionId)
    },
    enabled: !!activeSessionId,
  })

  // 3. Create session mutation
  const createSessionMutation = useMutation({
    mutationFn: async (payload: { paperId: string; title?: string }) => {
      return await chatsApi.createSession(payload.paperId, payload.title, userId)
    },
    onSuccess: (newSession) => {
      queryClient.invalidateQueries({ queryKey: ["sessions", activePaperId, userId] })
      setActiveSessionId(newSession.id) // Automatically set as active chat
    },
  })

  // 4. Delete session mutation
  const deleteSessionMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      return await chatsApi.deleteSession(sessionId)
    },
    onSuccess: (_, deletedSessionId) => {
      queryClient.invalidateQueries({ queryKey: ["sessions", activePaperId, userId] })
      if (activeSessionId === deletedSessionId) {
        setActiveSessionId(null)
      }
    },
  })

  // 5. Query Agent workflow mutation (sends question to LangGraph)
  const queryAgentMutation = useMutation({
    mutationFn: async (payload: { sessionId: string; userQuery: string }) => {
      setIsResponding(true)
      try {
        // Optimistically update message cache if wanted, but simpler to refetch on success
        return await chatsApi.queryAgent(payload.sessionId, payload.userQuery)
      } finally {
        setIsResponding(false)
      }
    },
    onSuccess: () => {
      // Invalidate messages query to load user query + agent answer
      queryClient.invalidateQueries({ queryKey: ["messages", activeSessionId] })
    },
  })

  return {
    sessions: sessionsQuery.data || [],
    isLoadingSessions: sessionsQuery.isLoading,
    isFetchedSessions: sessionsQuery.isFetched,
    messages: messagesQuery.data || [],
    isLoadingMessages: messagesQuery.isLoading,
    createSession: createSessionMutation.mutateAsync,
    isCreatingSession: createSessionMutation.isPending,
    deleteSession: deleteSessionMutation.mutateAsync,
    queryAgent: queryAgentMutation.mutateAsync,
    isResponding: queryAgentMutation.isPending,
  }
}
