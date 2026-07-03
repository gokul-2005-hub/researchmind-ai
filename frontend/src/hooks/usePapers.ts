import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { papersApi } from "@/services/api"
import { useAppStore } from "@/store/useAppStore"

export const usePapers = (userId?: string) => {
  const queryClient = useQueryClient()
  const { setPapers, setIsUploading } = useAppStore()

  const papersQuery = useQuery({
    queryKey: ["papers", userId],
    queryFn: async () => {
      const data = await papersApi.list(userId)
      setPapers(data) // Sync with Zustand store
      return data
    },
  })

  const uploadPaperMutation = useMutation({
    mutationFn: async (file: File) => {
      setIsUploading(true)
      try {
        return await papersApi.upload(file)
      } finally {
        setIsUploading(false)
      }
    },
    onSuccess: () => {
      // Invalidate papers list to trigger reload
      queryClient.invalidateQueries({ queryKey: ["papers"] })
    },
  })

  const deletePaperMutation = useMutation({
    mutationFn: async (id: string) => {
      return await papersApi.delete(id)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["papers"] })
    },
  })

  return {
    papers: papersQuery.data || [],
    isLoadingPapers: papersQuery.isLoading,
    papersError: papersQuery.error,
    uploadPaper: uploadPaperMutation.mutateAsync,
    isUploading: uploadPaperMutation.isPending,
    deletePaper: deletePaperMutation.mutateAsync,
    isDeleting: deletePaperMutation.isPending,
  }
}
