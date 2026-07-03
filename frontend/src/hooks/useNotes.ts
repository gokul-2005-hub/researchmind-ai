import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { notesApi } from "@/services/api"
import { useAppStore } from "@/store/useAppStore"
import type { NoteSaveRequest } from "@/types/api"

export const useNotes = (userId?: string) => {
  const queryClient = useQueryClient()
  const { activePaperId } = useAppStore()

  // Fetch research notes for active paper
  const notesQuery = useQuery({
    queryKey: ["notes", activePaperId, userId],
    queryFn: async () => {
      if (!activePaperId) return null
      try {
        return await notesApi.get(activePaperId, userId)
      } catch (err: any) {
        // If notes don't exist yet (404), return a blank skeleton object rather than erroring out
        if (err.response && err.response.status === 404) {
          return {
            id: "",
            paper_id: activePaperId,
            title: "Research Notes",
            content: "",
            created_at: "",
            updated_at: ""
          }
        }
        throw err
      }
    },
    enabled: !!activePaperId,
  })

  // Save notes mutation (creates or updates notes)
  const saveNoteMutation = useMutation({
    mutationFn: async (payload: NoteSaveRequest) => {
      if (!activePaperId) throw new Error("No active paper selected to save notes.")
      return await notesApi.save(activePaperId, payload, userId)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notes", activePaperId, userId] })
    },
  })

  return {
    note: notesQuery.data,
    isLoadingNote: notesQuery.isLoading,
    noteError: notesQuery.error,
    saveNote: saveNoteMutation.mutateAsync,
    isSavingNote: saveNoteMutation.isPending,
  }
}
