import React, { useEffect, useState } from "react"
import { usePapers } from "@/hooks/usePapers"
import { useChats } from "@/hooks/useChats"
import { useAppStore } from "@/store/useAppStore"
import { FileUploader } from "@/features/upload/FileUploader"
import { ChatPane } from "@/features/chat/ChatPane"
import { NotesEditor } from "@/features/notes/NotesEditor"
import { Button } from "@/components/ui/Button"
import { Card } from "@/components/ui/Card"
import { 
  FileText, 
  Trash2, 
  MessageSquare, 
  BookOpen, 
  Plus, 
  UploadCloud, 
  Columns,
  Info,
  FileEdit,
  User,
  Calendar,
  Layers,
  ChevronLeft,
  RefreshCw,
  BrainCircuit,
  Eye
} from "lucide-react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { authApi, papersApi } from "@/services/api"

export const DashboardPage: React.FC = () => {
  const { user } = useAppStore()
  const isAdmin = user?.username === "admin"
  const queryClient = useQueryClient()

  const [selectedUserFilter, setSelectedUserFilter] = useState<{ id: string; username: string } | null>(null)
  const { papers, deletePaper, isLoadingPapers } = usePapers(selectedUserFilter?.id)

  const [workspaceUserId, setWorkspaceUserId] = useState<string | undefined>(undefined)
  const [workspacePaperId, setWorkspacePaperId] = useState<string | null>(null)
  const { sessions, createSession, deleteSession, isFetchedSessions } = useChats(workspaceUserId)

  const { 
    activePaperId, 
    setActivePaperId, 
    activeSessionId, 
    setActiveSessionId 
  } = useAppStore()

  const [showUploadModal, setShowUploadModal] = useState(false)
  const [layoutMode, setLayoutMode] = useState<"split" | "editor" | "chat">("split")
  const [showMetaDrawer, setShowMetaDrawer] = useState(false)
  const [showAgentsModal, setShowAgentsModal] = useState(false)

  const handleDeleteUser = async (userId: string, username: string) => {
    if (username === "admin") return
    if (!window.confirm(`Are you sure you want to delete the user profile "${username}"? All their papers, chats, and notes will be permanently deleted.`)) {
      return
    }
    try {
      await authApi.deleteUser(userId)
      queryClient.invalidateQueries({ queryKey: ["registeredUsers"] })
      if (selectedUserFilter?.id === userId) {
        setSelectedUserFilter(null)
      }
      alert(`User profile "${username}" deleted successfully.`)
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to delete user profile.")
    }
  }

  const renderAgentsModal = () => {
    if (!showAgentsModal) return null
    return (
      <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in" onClick={() => setShowAgentsModal(false)}>
        <div 
          className="bg-white dark:bg-slate-905 w-full max-w-2xl rounded-2xl border border-slate-200 dark:border-slate-850 overflow-hidden shadow-2xl p-6 relative z-50 animate-scale-up"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Modal Header */}
          <div className="flex justify-between items-start mb-6 border-b border-slate-100 dark:border-slate-850 pb-4">
            <div className="flex items-center gap-2">
              <BrainCircuit className="text-indigo-500 shrink-0 animate-pulse" size={20} />
              <div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-150">System Multi-Agents Directory</h3>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                  Detailed guide to our LangGraph multi-agent cognitive architecture.
                </p>
              </div>
            </div>
            <button 
              onClick={() => setShowAgentsModal(false)}
              className="text-slate-400 hover:text-slate-650 dark:hover:text-slate-200 font-medium text-lg leading-none"
            >
              &times;
            </button>
          </div>
          
          {/* Modal Content */}
          <div className="space-y-4 max-h-[400px] overflow-y-auto pr-1 scrollbar-thin">
            <div className="p-3.5 bg-slate-50 dark:bg-slate-950/20 border border-slate-150/50 dark:border-slate-900 rounded-xl">
              <h4 className="text-xs font-bold text-indigo-650 dark:text-indigo-400 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-ping"></span>
                Supervisor Agent (Orchestrator)
              </h4>
              <p className="text-[11px] text-slate-650 dark:text-slate-400 mt-1.5 leading-relaxed">
                The central routing hub of the workspace. It analyzes user queries and decides which specialist agent should answer and whether to trigger a semantic search retrieval against the vector index.
              </p>
            </div>

            <div className="p-3.5 bg-slate-50 dark:bg-slate-950/20 border border-slate-150/50 dark:border-slate-900 rounded-xl">
              <h4 className="text-xs font-bold text-indigo-650 dark:text-indigo-400 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                Retrieval Agent
              </h4>
              <p className="text-[11px] text-slate-650 dark:text-slate-400 mt-1.5 leading-relaxed">
                Performs high-speed semantic queries on ChromaDB to pull the top 5 relevant chunks from the uploaded PDF, formatting them with page and section sources as grounding context for specialists.
              </p>
            </div>

            <div className="p-3.5 bg-slate-50 dark:bg-slate-950/20 border border-slate-150/50 dark:border-slate-900 rounded-xl">
              <h4 className="text-xs font-bold text-indigo-650 dark:text-indigo-400 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                QA Agent
              </h4>
              <p className="text-[11px] text-slate-650 dark:text-slate-400 mt-1.5 leading-relaxed">
                Handles general questions and answers, analyzing content, retrieving details, and tracing source citations to page sections.
              </p>
            </div>

            <div className="p-3.5 bg-slate-50 dark:bg-slate-950/20 border border-slate-150/50 dark:border-slate-900 rounded-xl">
              <h4 className="text-xs font-bold text-indigo-650 dark:text-indigo-400 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                Explainer Agent
              </h4>
              <p className="text-[11px] text-slate-650 dark:text-slate-400 mt-1.5 leading-relaxed">
                Specializes in unpackaging dense mathematical formulations, LaTeX equation representations, algorithms, formulas, and code snippet explanations.
              </p>
            </div>

            <div className="p-3.5 bg-slate-50 dark:bg-slate-950/20 border border-slate-150/50 dark:border-slate-900 rounded-xl">
              <h4 className="text-xs font-bold text-indigo-650 dark:text-indigo-400 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                Contribution Agent
              </h4>
              <p className="text-[11px] text-slate-650 dark:text-slate-400 mt-1.5 leading-relaxed">
                Evaluates the scientific contributions, novelty statements, experiment findings, research boundaries/limitations, and suggested future research directions.
              </p>
            </div>

            <div className="p-3.5 bg-slate-50 dark:bg-slate-950/20 border border-slate-150/50 dark:border-slate-900 rounded-xl">
              <h4 className="text-xs font-bold text-indigo-650 dark:text-indigo-400 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                Citation & Reference Agent
              </h4>
              <p className="text-[11px] text-slate-650 dark:text-slate-400 mt-1.5 leading-relaxed">
                Extracts reference bibliography lists, quotes referencing contexts, years, venues, and constructs clickable DOI urls.
              </p>
            </div>

            <div className="p-3.5 bg-slate-50 dark:bg-slate-950/20 border border-slate-150/50 dark:border-slate-900 rounded-xl">
              <h4 className="text-xs font-bold text-indigo-650 dark:text-indigo-400 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                Summary Agent
              </h4>
              <p className="text-[11px] text-slate-650 dark:text-slate-400 mt-1.5 leading-relaxed">
                Generates multi-section executive summaries, scientifically structured findings, and outlines the paper's section-by-section contents.
              </p>
            </div>
          </div>
          
          {/* Footer */}
          <div className="flex justify-end gap-2 mt-6 border-t border-slate-100 dark:border-slate-850 pt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAgentsModal(false)}
              className="h-8 rounded-lg text-xs"
            >
              Close Directory
            </Button>
          </div>
        </div>
      </div>
    )
  }

  const activePaper = papers.find(p => p.id === activePaperId)

  // Query registered users (Admin-only)
  const { data: registeredUsers = [], isLoading: isLoadingUsers } = useQuery({
    queryKey: ["registeredUsers"],
    queryFn: async () => {
      if (!isAdmin) return []
      return await authApi.listUsers()
    },
    enabled: isAdmin,
  })

  // Auto-set the workspaceUserId to the paper's owner when paper changes (ONLY for non-admins, or when clearing activePaperId)
  useEffect(() => {
    if (!activePaperId) {
      setWorkspaceUserId(undefined)
      setWorkspacePaperId(null)
    } else if (!isAdmin && activePaper) {
      setWorkspaceUserId(user?.id)
    }
  }, [activePaperId, activePaper, isAdmin, user])

  // Auto-load sessions when paper changes
  useEffect(() => {
    if (activePaperId && sessions.length > 0 && !activeSessionId) {
      setActiveSessionId(sessions[0].id)
    }
  }, [activePaperId, sessions, activeSessionId, setActiveSessionId])

  // Auto-create and select session if empty
  useEffect(() => {
    if (activePaperId && isFetchedSessions && sessions.length === 0) {
      createSession({ paperId: activePaperId, title: "Discussion Thread #1" })
    }
  }, [activePaperId, sessions, isFetchedSessions, createSession])

  const handleCreateChatSession = async () => {
    if (!activePaperId) return
    try {
      const idx = sessions.length + 1
      await createSession({ paperId: activePaperId, title: `Discussion Thread #${idx}` })
    } catch (err) {
      console.error("Failed to create chat thread", err)
    }
  }

  const handleDeletePaper = async (e: React.MouseEvent, paperId: string) => {
    e.stopPropagation()
    if (!window.confirm("Are you sure you want to delete this paper, its chat history, and its vector database index?")) {
      return
    }
    try {
      if (activePaperId === paperId) {
        setActivePaperId(null)
        setActiveSessionId(null)
      }
      await deletePaper(paperId)
    } catch (err) {
      console.error("Delete paper failed", err)
    }
  }

  const handleDeleteSession = async (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation()
    if (!window.confirm("Are you sure you want to delete this discussion thread?")) {
      return
    }
    try {
      await deleteSession(sessionId)
    } catch (err) {
      console.error("Delete session failed", err)
    }
  }

  // --- RENDERING VIEWS ---

  // 1. If an active paper is selected, show the Split Workstation View
  if (activePaperId && activePaper) {
    const selectedWorkspaceUser = registeredUsers.find(u => u.id === workspaceUserId)
    const activePaperOwner = registeredUsers.find(u => u.id === activePaper.user_id)

    return (
      <div className="h-full flex flex-col min-h-0">
        {/* Workstation Header */}
        <div className="border-b border-slate-150 dark:border-slate-900 pb-3 mb-4 space-y-3 shrink-0">
          {/* Row 1: Nav buttons + Title */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2.5 min-w-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setActivePaperId(null)
                  setActiveSessionId(null)
                  setWorkspaceUserId(undefined)
                  setWorkspacePaperId(null)
                }}
                className="h-8 rounded-lg text-xs flex items-center gap-1.5 px-3 shrink-0"
              >
                <ChevronLeft size={14} />
                Library
              </Button>

              {isAdmin && workspaceUserId && workspacePaperId && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setWorkspacePaperId(null)
                    setActiveSessionId(null)
                  }}
                  className="h-8 rounded-lg text-xs flex items-center gap-1.5 px-3 border-indigo-200/60 dark:border-indigo-900/50 text-indigo-655 hover:bg-indigo-50/50 shrink-0"
                >
                  <ChevronLeft size={14} />
                  Papers List
                </Button>
              )}

              {isAdmin && workspaceUserId && !workspacePaperId && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setWorkspaceUserId(undefined)
                  }}
                  className="h-8 rounded-lg text-xs flex items-center gap-1.5 px-3 border-indigo-200/60 dark:border-indigo-900/50 text-indigo-655 hover:bg-indigo-50/50 shrink-0"
                >
                  <ChevronLeft size={14} />
                  Workspaces
                </Button>
              )}

              <div className="min-w-0">
                <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-150 flex items-center gap-1.5 truncate font-display">
                  <FileText size={16} className="text-indigo-500 shrink-0" />
                  {workspaceUserId && workspacePaperId 
                    ? activePaper.title 
                    : workspaceUserId 
                      ? `${selectedWorkspaceUser?.username || "Researcher"}'s Workspace Catalog` 
                      : "ResearchMind Workspace Initialization"}
                </h2>
                <p className="text-[10px] text-slate-450 dark:text-slate-550 truncate mt-0.5">
                  {workspaceUserId && workspacePaperId 
                    ? `Authors: ${activePaper.authors.join(", ")} ${activePaper.publication_year ? `(${activePaper.publication_year})` : ""}`
                    : workspaceUserId
                      ? `Select a paper below to view ${selectedWorkspaceUser?.username || "researcher"}'s workspace notes and questions`
                      : "Please select a user workspace below to begin session analysis"}
                </p>
              </div>
            </div>
            
            {/* Metadata Drawer Toggle */}
            {workspaceUserId && workspacePaperId && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowMetaDrawer(!showMetaDrawer)}
                className={`h-8 w-8 p-0 rounded-lg flex items-center justify-center transition shrink-0 ${
                  showMetaDrawer 
                    ? "bg-indigo-50/80 dark:bg-indigo-950/20 border-indigo-400/40 text-indigo-500" 
                    : ""
                }`}
                title="Show Paper Metadata"
              >
                <Info size={14} />
              </Button>
            )}
          </div>

          {/* Row 2: Controls */}
          {workspaceUserId && workspacePaperId && (
            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <div className="flex items-center gap-2">
                {/* Workspace User Toggles for Admin */}
                {isAdmin && activePaper.user_id && activePaper.user_id !== user?.id && (
                  <div className="flex items-center rounded-lg border border-slate-200 dark:border-slate-800 p-0.5 bg-slate-100 dark:bg-slate-900 text-[10px]">
                    <button
                      onClick={() => {
                        setWorkspaceUserId(activePaper.user_id)
                        setActiveSessionId(null)
                      }}
                      className={`p-1 px-2.5 rounded-md font-semibold transition cursor-pointer ${
                        workspaceUserId === activePaper.user_id
                          ? "bg-white dark:bg-slate-800 text-indigo-650 dark:text-indigo-400 shadow-sm"
                          : "text-slate-455 hover:text-slate-800 dark:hover:text-slate-250"
                      }`}
                    >
                      {activePaperOwner?.username || "Researcher"}'s Work
                    </button>
                    <button
                      onClick={() => {
                        setWorkspaceUserId(user?.id)
                        setActiveSessionId(null)
                      }}
                      className={`p-1 px-2.5 rounded-md font-semibold transition cursor-pointer ${
                        workspaceUserId === user?.id
                          ? "bg-white dark:bg-slate-800 text-indigo-650 dark:text-indigo-400 shadow-sm"
                          : "text-slate-455 hover:text-slate-800 dark:hover:text-slate-250"
                      }`}
                    >
                      My Workspace (Admin)
                    </button>
                  </div>
                )}

                {/* System Agents Info Button */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAgentsModal(true)}
                  className="h-8 rounded-lg text-xs flex items-center gap-1.5 px-3 bg-indigo-50/40 border-indigo-200/50 text-indigo-655 hover:bg-indigo-50 dark:bg-indigo-950/10 dark:border-indigo-900/50 dark:text-indigo-400 dark:hover:bg-indigo-950/20"
                  title="Show System Agents Information"
                >
                  <BrainCircuit size={14} className="text-indigo-500" />
                  <span>Agents</span>
                </Button>
              </div>

              <div className="flex items-center gap-2">
                {/* Layout Toggles */}
                <div className="flex items-center rounded-lg border border-slate-200 dark:border-slate-800 p-0.5 bg-slate-100 dark:bg-slate-900">
                  <button
                    onClick={() => setLayoutMode("editor")}
                    className={`p-1.5 rounded-md transition cursor-pointer ${
                      layoutMode === "editor"
                        ? "bg-white dark:bg-slate-800 text-indigo-650 dark:text-indigo-400 shadow-sm"
                        : "text-slate-450 hover:text-slate-800 dark:hover:text-slate-250"
                    }`}
                    title="Notes Editor Mode"
                  >
                    <FileEdit size={12} />
                  </button>
                  <button
                    onClick={() => setLayoutMode("split")}
                    className={`p-1.5 rounded-md transition cursor-pointer ${
                      layoutMode === "split"
                        ? "bg-white dark:bg-slate-800 text-indigo-650 dark:text-indigo-400 shadow-sm"
                        : "text-slate-450 hover:text-slate-800 dark:hover:text-slate-250"
                    }`}
                    title="Split Screen Mode"
                  >
                    <Columns size={12} />
                  </button>
                  <button
                    onClick={() => setLayoutMode("chat")}
                    className={`p-1.5 rounded-md transition cursor-pointer ${
                      layoutMode === "chat"
                        ? "bg-white dark:bg-slate-800 text-indigo-650 dark:text-indigo-400 shadow-sm"
                        : "text-slate-450 hover:text-slate-800 dark:hover:text-slate-250"
                    }`}
                    title="AI Chat Mode"
                  >
                    <MessageSquare size={12} />
                  </button>
                </div>

                {/* New Thread Button */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCreateChatSession}
                  className="h-8 text-[10px] font-semibold flex items-center gap-1 bg-white hover:bg-slate-50 dark:bg-slate-950 dark:hover:bg-slate-900 border-slate-200 dark:border-slate-800"
                >
                  <Plus size={12} />
                  New Thread
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Collapsible Metadata Drawer Panel */}
        {showMetaDrawer && (
          <div className="mb-4 p-4 bg-slate-50 dark:bg-slate-950/20 border border-slate-200 dark:border-slate-900 rounded-2xl animate-scale-up text-xs shrink-0 flex flex-col md:flex-row gap-6">
            <div className="flex-1 space-y-2">
              <div>
                <span className="font-semibold text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Journal Venue / Venue</span>
                <span className="text-slate-800 dark:text-slate-200 mt-0.5 block">{activePaper.journal_venue || "Academic Venue Not Specified"}</span>
              </div>
              <div>
                <span className="font-semibold text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Digital Object Identifier (DOI)</span>
                {activePaper.doi ? (
                  <a 
                    href={`https://doi.org/${activePaper.doi}`} 
                    target="_blank" 
                    rel="noreferrer" 
                    className="text-indigo-500 hover:underline hover:text-indigo-400 mt-0.5 inline-block font-mono"
                  >
                    {activePaper.doi}
                  </a>
                ) : (
                  <span className="text-slate-400 dark:text-slate-600 italic block">No DOI link indexed</span>
                )}
              </div>
            </div>
            <div className="flex-1 space-y-2">
              <div>
                <span className="font-semibold text-[10px] text-slate-400 dark:text-slate-550 uppercase tracking-wider block">Relational Identifiers</span>
                <span className="font-mono text-[10px] text-slate-500 block">ID: {activePaper.id}</span>
                <span className="text-slate-500 block mt-0.5">Uploaded at: {new Date(activePaper.uploaded_at).toLocaleString()}</span>
              </div>
            </div>
          </div>
        )}

        {/* Workstation Split Screen Layout */}
        {!workspaceUserId ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-12 bg-slate-50/50 dark:bg-slate-950/20 border border-slate-200/50 dark:border-slate-900 rounded-3xl max-w-xl mx-auto my-16 animate-scale-up">
            <BrainCircuit className="text-indigo-500 mb-4 animate-bounce" size={48} />
            <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200 mb-2 font-display">Select User Workspace</h3>
            <p className="text-xs text-slate-455 dark:text-slate-500 max-w-sm leading-relaxed mb-6">
              Which user's agent workspace context, discussion history, and research notes do you want to inspect for this paper?
            </p>
            <div className="flex flex-wrap justify-center gap-3 w-full">
              {registeredUsers.map((u) => (
                <Button
                  key={u.id}
                  onClick={() => {
                    setWorkspaceUserId(u.id)
                    setWorkspacePaperId(null) // Reset paper selection
                  }}
                  className="bg-indigo-650 hover:bg-indigo-700 text-white rounded-xl text-xs px-4 py-2 flex items-center gap-1.5 shadow-md shadow-indigo-600/10 transition cursor-pointer"
                >
                  <User size={12} />
                  <span>{u.username === user?.username ? "My Workspace (Admin)" : `${u.username}'s Workspace`}</span>
                </Button>
              ))}
            </div>
          </div>
        ) : !workspacePaperId ? (
          /* Render all papers uploaded by this specific user */
          <div className="flex-1 flex flex-col min-h-0 animate-scale-up">
            <div className="mb-4 flex items-center justify-between shrink-0">
              <div>
                <h3 className="font-bold text-xs text-slate-800 dark:text-slate-150 uppercase tracking-wider">
                  {selectedWorkspaceUser?.username}'s Uploaded Publications ({papers.filter(p => p.user_id === workspaceUserId).length})
                </h3>
                <p className="text-[10px] text-slate-455 dark:text-slate-500 mt-1">
                  Click on any paper below to view the chats, questions asked, and notes prepared by this researcher.
                </p>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto min-h-0 pr-1 scrollbar-thin">
              {papers.filter(p => p.user_id === workspaceUserId).length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-12 bg-slate-50/50 dark:bg-slate-950/20 border border-slate-200/50 dark:border-slate-900 rounded-3xl max-w-xl mx-auto my-10 animate-scale-up">
                  <BookOpen size={36} className="text-slate-350 dark:text-slate-650 mb-3 animate-pulse" />
                  <h4 className="font-bold text-xs text-slate-700 dark:text-slate-300">No Publications Found</h4>
                  <p className="text-[10px] text-slate-450 dark:text-slate-550 max-w-xs mt-1">
                    This user profile has not uploaded any research literature yet.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 pb-6">
                  {papers.filter(p => p.user_id === workspaceUserId).map((p) => (
                    <Card
                      key={p.id}
                      onClick={() => {
                        setWorkspacePaperId(p.id)
                        setActivePaperId(p.id)
                        setLayoutMode("split")
                      }}
                      className="group relative p-4 bg-white dark:bg-slate-905 border-slate-200 dark:border-slate-900 hover:border-indigo-500/40 dark:hover:border-indigo-500/30 hover:shadow-md cursor-pointer flex flex-col justify-between min-h-[140px] transition duration-200"
                    >
                      <div>
                        <div className="h-7 w-7 rounded-lg bg-indigo-500/10 dark:bg-indigo-500/20 flex items-center justify-center text-indigo-500 mb-2">
                          <FileText size={14} />
                        </div>
                        <h4 className="font-semibold text-xs text-slate-800 dark:text-slate-250 line-clamp-2 leading-snug group-hover:text-indigo-500 transition-colors">
                          {p.title}
                        </h4>
                        <p className="text-[9px] text-slate-455 dark:text-slate-500 mt-1 line-clamp-1">
                          {p.authors.join(", ")}
                        </p>
                      </div>
                      <div className="border-t border-slate-100 dark:border-slate-850 mt-3 pt-2 text-[9px] text-indigo-550 font-semibold flex items-center justify-between">
                        <span>Inspect Workspace</span>
                        <ChevronLeft size={10} className="rotate-180" />
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 min-h-0">
            {/* Left Column: Sessions sidebar + Notes Editor */}
            {(layoutMode === "split" || layoutMode === "editor") && (
              <div className={`${layoutMode === "editor" ? "lg:col-span-12" : "lg:col-span-6"} flex flex-col gap-4 min-h-0`}>
                {/* Thread Selector Dashboard */}
                <Card className="p-3 bg-slate-50/50 dark:bg-slate-950/20 border-slate-150/40 dark:border-slate-900 shrink-0">
                  <span className="text-[10px] font-bold text-slate-400 dark:text-slate-550 uppercase tracking-wider block mb-2">
                    Active Discussion Threads
                  </span>
                  <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
                    {sessions.map(s => (
                      <div
                        key={s.id}
                        onClick={() => setActiveSessionId(s.id)}
                        className={`flex items-center gap-1.5 p-1.5 px-3 rounded-xl cursor-pointer text-xs font-medium border shrink-0 transition ${
                          activeSessionId === s.id
                            ? "bg-indigo-650/10 border-indigo-500/30 text-indigo-600 dark:text-indigo-400"
                            : "bg-white dark:bg-slate-905 border-slate-200 dark:border-slate-850 hover:bg-slate-50 dark:hover:bg-slate-905 text-slate-600 dark:text-slate-400"
                        }`}
                      >
                        <MessageSquare size={12} />
                        <span className="truncate max-w-[80px]">{s.title}</span>
                        <button
                          onClick={(e) => handleDeleteSession(e, s.id)}
                          className="ml-1 text-slate-400 hover:text-red-500 transition-colors"
                        >
                          &times;
                        </button>
                      </div>
                    ))}
                    {sessions.length === 0 && (
                      <span className="text-[10px] italic text-slate-455 dark:text-slate-555 py-1">
                        No active chat threads. Click New Thread to begin.
                      </span>
                    )}
                  </div>
                </Card>

                {/* Markdown Notes Editor */}
                <div className="flex-1 min-h-0">
                  <NotesEditor userId={workspaceUserId} />
                </div>
              </div>
            )}

            {/* Right Column: Dynamic Agent Chat Interface */}
            {(layoutMode === "split" || layoutMode === "chat") && (
              <div className={`${layoutMode === "chat" ? "lg:col-span-12" : "lg:col-span-6"} min-h-0 flex flex-col h-full`}>
                <ChatPane userId={workspaceUserId} />
              </div>
            )}
          </div>
        )}
        {renderAgentsModal()}
      </div>
    )
  }

  // 2. Otherwise, show the Literature Library Dashboard (Grid List)
  return (
    <div className="h-full flex flex-col min-h-0">
      {/* Library Dashboard Header */}
      <div className="flex items-center justify-between pb-6 border-b border-slate-100 dark:border-slate-900 mb-6 shrink-0">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Layers className="text-indigo-600" />
            Literature Library
          </h1>
          <p className="text-xs text-slate-400 dark:text-slate-500">
            Select or upload academic research literature to query with Agentic AI.
          </p>
        </div>
        {(!isAdmin || (selectedUserFilter && selectedUserFilter.id === user?.id)) && (
          <Button
            onClick={() => setShowUploadModal(true)}
            className="bg-indigo-650 hover:bg-indigo-700 text-white rounded-xl flex items-center gap-1.5 shadow-md shadow-indigo-650/15"
          >
            <UploadCloud size={16} />
            Upload PDF
          </Button>
        )}
      </div>

      {/* Library Grid View / Layout Split for Admin */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-0 overflow-hidden">
        <div className={`${isAdmin ? "lg:col-span-9" : "lg:col-span-12"} flex flex-col min-h-0 overflow-y-auto pr-1`}>
          {selectedUserFilter && (
            <div className="mb-4 p-3 bg-indigo-555/10 border border-indigo-500/15 rounded-xl flex items-center justify-between text-xs text-indigo-600 dark:text-indigo-400 shrink-0">
              <span>Showing papers uploaded by: <strong>{selectedUserFilter.username}</strong></span>
              <button 
                onClick={() => setSelectedUserFilter(null)}
                className="hover:underline font-bold cursor-pointer"
              >
                Clear Filter
              </button>
            </div>
          )}
          {isLoadingPapers ? (
            <div className="h-full flex flex-col items-center justify-center p-10">
              <RefreshCw className="animate-spin text-indigo-500 mb-2" size={24} />
              <span className="text-xs text-slate-500">Retrieving library catalogue...</span>
            </div>
          ) : papers.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-12 bg-slate-50/50 dark:bg-slate-950/20 border border-slate-200/50 dark:border-slate-900 rounded-3xl max-w-xl mx-auto my-10">
              <BookOpen size={48} className="text-slate-350 dark:text-slate-650 mb-4" />
              <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200 mb-1">Your Library is Empty</h3>
              <p className="text-xs text-slate-400 dark:text-slate-500 max-w-xs leading-relaxed mb-6">
                Drop academic journals, papers, or conference publications in PDF format to build your vector database.
              </p>
              <Button
                onClick={() => setShowUploadModal(true)}
                className="bg-indigo-650 hover:bg-indigo-700 text-white"
              >
                Upload your first paper
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 pb-10">
              {papers.map((p) => (
                <Card
                  key={p.id}
                  onClick={() => {
                    setActivePaperId(p.id)
                    setWorkspacePaperId(p.id)
                    setWorkspaceUserId(p.user_id || user?.id)
                    setLayoutMode("split")
                  }}
                  className="group relative p-5 bg-white dark:bg-slate-905 border-slate-200 dark:border-slate-900 hover:border-indigo-500/40 dark:hover:border-indigo-500/30 hover:shadow-md hover:shadow-indigo-500/5 cursor-pointer flex flex-col justify-between min-h-[160px] transition duration-200 animate-scale-up"
                >
                  <div>
                    {/* File Metadata */}
                    <div className="flex justify-between items-start mb-2">
                      <div className="h-8 w-8 rounded-lg bg-indigo-500/10 dark:bg-indigo-500/20 border border-indigo-500/10 flex items-center justify-center text-indigo-500">
                        <FileText size={16} />
                      </div>
                      
                      <div className="flex items-center gap-1">
                        {/* View PDF option */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            papersApi.viewPdf(p.id)
                          }}
                          className="p-1.5 text-slate-400 hover:text-indigo-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition cursor-pointer"
                          title="Read PDF in browser"
                        >
                          <Eye size={14} />
                        </button>

                        {/* Download PDF option */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            papersApi.download(p.id, p.title.toLowerCase().endsWith(".pdf") ? p.title : `${p.title}.pdf`)
                          }}
                          className="p-1.5 text-slate-400 hover:text-indigo-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition cursor-pointer"
                          title="Download raw PDF"
                        >
                          <UploadCloud size={14} className="rotate-180" />
                        </button>

                        {/* Delete Trigger */}
                        <button
                          onClick={(e) => handleDeletePaper(e, p.id)}
                          className="p-1.5 text-slate-450 hover:text-red-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition cursor-pointer"
                          title="Delete Paper"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    {/* Title & Author Info */}
                    <h3 className="font-semibold text-xs text-slate-800 dark:text-slate-250 line-clamp-2 leading-snug group-hover:text-indigo-500 transition-colors">
                      {p.title}
                    </h3>
                    <p className="text-[10px] text-slate-455 dark:text-slate-500 mt-1 line-clamp-1">
                      {p.authors.join(", ")}
                    </p>
                  </div>

                  {/* Footer Details */}
                  <div className="border-t border-slate-100 dark:border-slate-850 mt-4 pt-3 flex items-center justify-between text-[9px] text-slate-400 dark:text-slate-500">
                    <span className="flex items-center gap-1">
                      <Calendar size={10} />
                      {p.publication_year ? `Pub: ${p.publication_year}` : "Pub: N/A"}
                    </span>
                    <span className="flex items-center gap-1 text-indigo-500 font-semibold group-hover:translate-x-0.5 transition-transform">
                      Analyze Paper &rarr;
                    </span>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Admin-only Users list column */}
        {isAdmin && (
          <div className="lg:col-span-3 min-h-0 h-full pb-10">
            <Card className="p-5 bg-white dark:bg-slate-905 border-slate-200 dark:border-slate-900 rounded-2xl shadow-xl flex flex-col h-full overflow-hidden shrink-0">
              <div className="flex items-center gap-2 pb-4 border-b border-slate-100 dark:border-slate-900 mb-4 shrink-0">
                <div className="h-8 w-8 rounded-lg bg-indigo-500/10 text-indigo-500 flex items-center justify-center shrink-0">
                  <User size={16} />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider leading-none">
                    Registered Users
                  </h3>
                  <p className="text-[9px] text-slate-450 dark:text-slate-500 mt-1.5 leading-none">
                    Active workspace profiles logs.
                  </p>
                </div>
              </div>
              
              {isLoadingUsers ? (
                <div className="flex-1 flex items-center justify-center text-xs text-slate-450 dark:text-slate-550 italic">
                  Retrieving users list...
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto space-y-2 pr-1 scrollbar-thin">
                  {registeredUsers.map((u, i) => {
                    const isSelected = selectedUserFilter?.id === u.id
                    return (
                      <div 
                        key={i}
                        onClick={() => {
                          if (isSelected) {
                            setSelectedUserFilter(null)
                          } else {
                            setSelectedUserFilter({ id: u.id, username: u.username })
                          }
                        }}
                        className={`flex items-center justify-between p-2.5 rounded-xl cursor-pointer border transition animate-scale-up ${
                          isSelected
                            ? "bg-indigo-50/80 dark:bg-indigo-950/25 border-indigo-500/50 text-indigo-600 dark:text-indigo-450 font-bold"
                            : "bg-slate-50 dark:bg-slate-950/20 border-slate-150/30 dark:border-slate-900 hover:bg-slate-100 dark:hover:bg-slate-900/60 text-slate-700 dark:text-slate-300"
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate pr-2">
                          <div className={`h-6 w-6 rounded-lg flex items-center justify-center font-bold text-[10px] shrink-0 ${
                            isSelected 
                              ? "bg-indigo-600 text-white" 
                              : "bg-indigo-500/10 text-indigo-500"
                          }`}>
                            {u.username.slice(0, 2).toUpperCase()}
                          </div>
                          <span className="text-xs truncate">
                            {u.username}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-200/50 dark:bg-slate-800 text-slate-505 dark:text-slate-450 shrink-0">
                            {u.role}
                          </span>
                          {u.username !== "admin" && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleDeleteUser(u.id, u.username)
                              }}
                              className="p-1 text-slate-400 hover:text-red-500 hover:bg-slate-200/35 dark:hover:bg-slate-800/40 rounded transition duration-150 cursor-pointer"
                              title="Delete User Profile"
                            >
                              <Trash2 size={12} />
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </Card>
          </div>
        )}
      </div>

      {/* Upload Dialog Modal Overlay */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div 
            className="bg-white dark:bg-slate-905 w-full max-w-lg rounded-2xl border border-slate-200 dark:border-slate-850 overflow-hidden shadow-2xl p-6 relative animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-150">Upload Literature</h3>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
                  Upload PDF files to start indexing and multi-agent summaries.
                </p>
              </div>
              <button 
                onClick={() => setShowUploadModal(false)}
                className="text-slate-400 hover:text-slate-650 dark:hover:text-slate-200 font-medium text-lg leading-none"
              >
                &times;
              </button>
            </div>
            
            {/* File Uploader area */}
            <FileUploader />
            
            {/* Footer */}
            <div className="flex justify-end gap-2 mt-6 border-t border-slate-100 dark:border-slate-850 pt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowUploadModal(false)}
                className="h-8 rounded-lg text-xs"
              >
                Close Dialog
              </Button>
            </div>
          </div>
        </div>
      )}

      {renderAgentsModal()}
    </div>
  )
}
