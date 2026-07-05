import React, { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
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
  Eye,
  ArrowRight
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
      <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowAgentsModal(false)}>
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="bg-white dark:bg-[#090e1a] w-full max-w-2xl rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xl p-6 relative"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Modal Header */}
          <div className="flex justify-between items-start mb-6 border-b border-slate-100 dark:border-slate-800 pb-4">
            <div className="flex items-center gap-2.5">
              <BrainCircuit className="text-brand-500 shrink-0" size={20} />
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Multi-Agent AI Cognitive Framework</h3>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                  Detailed guide to our LangGraph multi-agent cognitive architecture.
                </p>
              </div>
            </div>
            <button 
              onClick={() => setShowAgentsModal(false)}
              className="text-slate-400 hover:text-slate-650 dark:hover:text-slate-200 font-medium text-lg leading-none cursor-pointer"
            >
              &times;
            </button>
          </div>
          
          {/* Modal Content */}
          <div className="space-y-3.5 max-h-[380px] overflow-y-auto pr-1">
            <div className="p-3.5 bg-slate-50/50 dark:bg-slate-950/20 border border-slate-200/60 dark:border-slate-850 rounded-2xl">
              <h4 className="text-xs font-bold text-brand-650 dark:text-brand-400 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-500 animate-ping"></span>
                Supervisor Agent (Orchestrator)
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
                The central routing hub of the workspace. It analyzes user queries and decides which specialist agent should answer and whether to trigger a semantic search retrieval against the vector index.
              </p>
            </div>

            <div className="p-3.5 bg-slate-50/50 dark:bg-slate-950/20 border border-slate-200/60 dark:border-slate-850 rounded-2xl">
              <h4 className="text-xs font-bold text-brand-655 dark:text-brand-400 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-500"></span>
                Retrieval Agent
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
                Performs high-speed semantic queries on ChromaDB to pull the top 5 relevant chunks from the uploaded PDF, formatting them with page and section sources as grounding context for specialists.
              </p>
            </div>

            <div className="p-3.5 bg-slate-50/50 dark:bg-slate-950/20 border border-slate-200/60 dark:border-slate-850 rounded-2xl">
              <h4 className="text-xs font-bold text-brand-655 dark:text-brand-400 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-500"></span>
                QA Agent
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
                Handles general questions and answers, analyzing content, retrieving details, and tracing source citations to page sections.
              </p>
            </div>

            <div className="p-3.5 bg-slate-50/50 dark:bg-slate-950/20 border border-slate-200/60 dark:border-slate-850 rounded-2xl">
              <h4 className="text-xs font-bold text-brand-655 dark:text-brand-400 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-500"></span>
                Explainer Agent
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
                Specializes in unpackaging dense mathematical formulations, LaTeX equation representations, algorithms, formulas, and code snippet explanations.
              </p>
            </div>

            <div className="p-3.5 bg-slate-50/50 dark:bg-slate-950/20 border border-slate-200/60 dark:border-slate-850 rounded-2xl">
              <h4 className="text-xs font-bold text-brand-655 dark:text-brand-400 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-500"></span>
                Contribution Agent
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
                Evaluates the scientific contributions, novelty statements, experiment findings, research boundaries/limitations, and suggested future research directions.
              </p>
            </div>

            <div className="p-3.5 bg-slate-50/50 dark:bg-slate-950/20 border border-slate-200/60 dark:border-slate-850 rounded-2xl">
              <h4 className="text-xs font-bold text-brand-655 dark:text-brand-400 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-500"></span>
                Citation & Reference Agent
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
                Extracts reference bibliography lists, quotes referencing contexts, years, venues, and constructs clickable DOI urls.
              </p>
            </div>

            <div className="p-3.5 bg-slate-50/50 dark:bg-slate-950/20 border border-slate-200/60 dark:border-slate-850 rounded-2xl">
              <h4 className="text-xs font-bold text-brand-655 dark:text-brand-400 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-500"></span>
                Summary Agent
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
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
              className="h-9 rounded-xl text-xs px-4 cursor-pointer"
            >
              Close Directory
            </Button>
          </div>
        </motion.div>
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

  // Auto-set the workspaceUserId to the paper's owner when paper changes
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
        <div className="border-b border-slate-200/80 dark:border-slate-800/80 pb-3 mb-4 space-y-3 shrink-0">
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
                className="h-9 rounded-xl text-xs flex items-center gap-1.5 px-3.5 shrink-0 cursor-pointer"
              >
                <ChevronLeft size={15} />
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
                  className="h-9 rounded-xl text-xs flex items-center gap-1.5 px-3.5 border-brand-500/10 text-brand-650 hover:bg-brand-50/50 shrink-0 cursor-pointer"
                >
                  <ChevronLeft size={15} />
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
                  className="h-9 rounded-xl text-xs flex items-center gap-1.5 px-3.5 border-brand-500/10 text-brand-650 hover:bg-brand-50/50 shrink-0 cursor-pointer"
                >
                  <ChevronLeft size={15} />
                  Workspaces
                </Button>
              )}

              <div className="min-w-0 pl-1">
                <h2 className="text-sm font-bold text-slate-850 dark:text-white flex items-center gap-1.5 truncate">
                  <FileText size={16} className="text-brand-500 shrink-0" />
                  {workspaceUserId && workspacePaperId 
                    ? activePaper.title 
                    : workspaceUserId 
                      ? `${selectedWorkspaceUser?.username || "Researcher"}'s Workspace Catalog` 
                      : "ResearchMind Workspace Initialization"}
                </h2>
                <p className="text-[10px] text-slate-450 dark:text-slate-500 truncate mt-0.5 font-medium">
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
                className={`h-9 w-9 p-0 rounded-xl flex items-center justify-center transition shrink-0 cursor-pointer ${
                  showMetaDrawer 
                    ? "bg-brand-500/10 border-brand-500/30 text-brand-600 dark:text-brand-400" 
                    : ""
                }`}
                title="Show Paper Metadata"
              >
                <Info size={15} />
              </Button>
            )}
          </div>

          {/* Controls */}
          {workspaceUserId && workspacePaperId && (
            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <div className="flex items-center gap-2">
                {/* Workspace User Toggles for Admin */}
                {isAdmin && activePaper.user_id && activePaper.user_id !== user?.id && (
                  <div className="flex items-center rounded-xl border border-slate-200/80 dark:border-slate-850 p-0.5 bg-slate-100 dark:bg-slate-950/60 text-[10px]">
                    <button
                      onClick={() => {
                        setWorkspaceUserId(activePaper.user_id)
                        setActiveSessionId(null)
                      }}
                      className={`p-1.5 px-3 rounded-lg font-bold transition-all cursor-pointer ${
                        workspaceUserId === activePaper.user_id
                          ? "bg-white dark:bg-slate-800 text-brand-650 dark:text-brand-400 shadow-xs"
                          : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                      }`}
                    >
                      {activePaperOwner?.username || "Researcher"}'s Work
                    </button>
                    <button
                      onClick={() => {
                        setWorkspaceUserId(user?.id)
                        setActiveSessionId(null)
                      }}
                      className={`p-1.5 px-3 rounded-lg font-bold transition-all cursor-pointer ${
                        workspaceUserId === user?.id
                          ? "bg-white dark:bg-slate-800 text-brand-650 dark:text-brand-400 shadow-xs"
                          : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
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
                  className="h-8.5 rounded-xl text-[11px] font-semibold flex items-center gap-1.5 px-3.5 bg-brand-50/40 border-brand-200/20 text-brand-750 hover:bg-brand-50 dark:bg-brand-500/10 dark:border-brand-500/20 dark:text-brand-400 cursor-pointer"
                  title="Show System Agents Information"
                >
                  <BrainCircuit size={14} className="text-brand-500" />
                  <span>Agents Directory</span>
                </Button>
              </div>

              <div className="flex items-center gap-2">
                {/* Layout Toggles */}
                <div className="flex items-center rounded-xl border border-slate-200/80 dark:border-slate-850 p-0.5 bg-slate-100 dark:bg-slate-950/60">
                  <button
                    onClick={() => setLayoutMode("editor")}
                    className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                      layoutMode === "editor"
                        ? "bg-white dark:bg-slate-800 text-brand-650 dark:text-brand-400 shadow-xs"
                        : "text-slate-450 hover:text-slate-800 dark:hover:text-slate-200"
                    }`}
                    title="Notes Editor Mode"
                  >
                    <FileEdit size={13} />
                  </button>
                  <button
                    onClick={() => setLayoutMode("split")}
                    className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                      layoutMode === "split"
                        ? "bg-white dark:bg-slate-800 text-brand-650 dark:text-brand-400 shadow-xs"
                        : "text-slate-450 hover:text-slate-800 dark:hover:text-slate-200"
                    }`}
                    title="Split Screen Mode"
                  >
                    <Columns size={13} />
                  </button>
                  <button
                    onClick={() => setLayoutMode("chat")}
                    className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                      layoutMode === "chat"
                        ? "bg-white dark:bg-slate-800 text-brand-650 dark:text-brand-400 shadow-xs"
                        : "text-slate-450 hover:text-slate-800 dark:hover:text-slate-200"
                    }`}
                    title="AI Chat Mode"
                  >
                    <MessageSquare size={13} />
                  </button>
                </div>

                {/* New Thread Button */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCreateChatSession}
                  className="h-8.5 text-[11px] font-bold flex items-center gap-1.5 bg-white hover:bg-slate-50 dark:bg-slate-950 dark:hover:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-xl cursor-pointer"
                >
                  <Plus size={13} />
                  New Thread
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Collapsible Metadata Drawer Panel */}
        <AnimatePresence>
          {showMetaDrawer && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-4 p-4 bg-slate-50/50 dark:bg-slate-950/20 border border-slate-200/80 dark:border-slate-900 rounded-2xl text-[11px] shrink-0 flex flex-col md:flex-row gap-6 overflow-hidden"
            >
              <div className="flex-1 space-y-2.5">
                <div>
                  <span className="font-bold text-[9px] text-slate-400 dark:text-slate-500 uppercase tracking-widest block">Academic Journal/Venue</span>
                  <span className="text-slate-800 dark:text-slate-200 font-semibold mt-0.5 block">{activePaper.journal_venue || "Academic Venue Not Specified"}</span>
                </div>
                <div>
                  <span className="font-bold text-[9px] text-slate-400 dark:text-slate-500 uppercase tracking-widest block">Digital Object Identifier (DOI)</span>
                  {activePaper.doi ? (
                    <a 
                      href={`https://doi.org/${activePaper.doi}`} 
                      target="_blank" 
                      rel="noreferrer" 
                      className="text-brand-600 dark:text-brand-400 hover:underline mt-0.5 inline-block font-mono font-medium"
                    >
                      {activePaper.doi}
                    </a>
                  ) : (
                    <span className="text-slate-400 dark:text-slate-650 italic block mt-0.5">No DOI link indexed</span>
                  )}
                </div>
              </div>
              <div className="flex-1 space-y-2.5">
                <div>
                  <span className="font-bold text-[9px] text-slate-400 dark:text-slate-500 uppercase tracking-widest block">Relational Identifiers</span>
                  <span className="font-mono text-[10px] text-slate-500 block mt-0.5">Paper ID: {activePaper.id}</span>
                  <span className="text-slate-500 block mt-0.5">Uploaded at: {new Date(activePaper.uploaded_at).toLocaleString()}</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Workstation Split Screen Layout */}
        {!workspaceUserId ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-12 bg-white/40 dark:bg-slate-900/10 border border-slate-200/80 dark:border-slate-805/80 backdrop-blur-md rounded-3xl max-w-xl mx-auto my-16">
            <BrainCircuit className="text-brand-500 mb-4 animate-bounce" size={44} />
            <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200 mb-2">Select User Workspace</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm leading-relaxed mb-6 font-medium">
              Which user's agent workspace context, discussion history, and research notes do you want to inspect for this paper?
            </p>
            <div className="flex flex-wrap justify-center gap-3.5 w-full">
              {registeredUsers.map((u) => (
                <Button
                  key={u.id}
                  onClick={() => {
                    setWorkspaceUserId(u.id)
                    setWorkspacePaperId(null)
                  }}
                  className="bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs px-4 py-2.5 flex items-center gap-1.5 shadow-md shadow-brand-500/10 transition active:scale-95 cursor-pointer font-bold"
                >
                  <User size={13} />
                  <span>{u.username === user?.username ? "My Workspace (Admin)" : `${u.username}'s Workspace`}</span>
                </Button>
              ))}
            </div>
          </div>
        ) : !workspacePaperId ? (
          /* Render all papers uploaded by this specific user */
          <div className="flex-1 flex flex-col min-h-0">
            <div className="mb-4 flex items-center justify-between shrink-0 pl-1">
              <div>
                <h3 className="font-bold text-xs text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                  {selectedWorkspaceUser?.username}'s Uploaded Publications ({papers.filter(p => p.user_id === workspaceUserId).length})
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-450 mt-1 font-medium">
                  Click on any paper below to view the chats, questions asked, and notes prepared by this researcher.
                </p>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto min-h-0 pr-1">
              {papers.filter(p => p.user_id === workspaceUserId).length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-12 bg-white/40 dark:bg-slate-900/10 border border-slate-200/80 dark:border-slate-805/80 backdrop-blur-md rounded-3xl max-w-xl mx-auto my-10 animate-pulse">
                  <BookOpen size={36} className="text-slate-400 dark:text-slate-600 mb-3" />
                  <h4 className="font-bold text-xs text-slate-800 dark:text-slate-200">No Publications Found</h4>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 max-w-xs mt-1 leading-relaxed">
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
                      className="group relative p-5 bg-white dark:bg-slate-900/10 border-slate-200 dark:border-slate-805/80 hover:border-brand-500/40 dark:hover:border-brand-500/30 hover:shadow-lg hover:shadow-brand-500/5 cursor-pointer flex flex-col justify-between min-h-[140px] transition-all duration-200 rounded-2xl"
                    >
                      <div>
                        <div className="h-8 w-8 rounded-lg bg-brand-500/10 dark:bg-brand-500/20 flex items-center justify-center text-brand-500 mb-3 shadow-xs">
                          <FileText size={15} />
                        </div>
                        <h4 className="font-bold text-xs text-slate-850 dark:text-slate-200 line-clamp-2 leading-snug group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                          {p.title}
                        </h4>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1.5 line-clamp-1 font-medium">
                          {p.authors.join(", ")}
                        </p>
                      </div>
                      <div className="border-t border-slate-100 dark:border-slate-850 mt-4 pt-3 text-[10px] text-brand-600 dark:text-brand-400 font-bold flex items-center justify-between">
                        <span>Inspect Workspace</span>
                        <ArrowRight size={12} className="group-hover:translate-x-1 transition-transform" />
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
                <Card className="p-3 bg-slate-50/50 dark:bg-slate-950/20 border-slate-200/60 dark:border-slate-850 shrink-0 rounded-2xl">
                  <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-2 px-1">
                    Active Discussion Threads
                  </span>
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {sessions.map(s => (
                      <div
                        key={s.id}
                        onClick={() => setActiveSessionId(s.id)}
                        className={`flex items-center gap-1.5 p-1.5 px-3 rounded-xl cursor-pointer text-xs font-semibold border shrink-0 transition-all duration-200 ${
                          activeSessionId === s.id
                            ? "bg-brand-500/10 border-brand-500/20 text-brand-650 dark:text-brand-400 shadow-xs"
                            : "bg-white dark:bg-slate-900/10 border-slate-250 dark:border-slate-805/85 hover:bg-slate-50 dark:hover:bg-slate-800/20 text-slate-600 dark:text-slate-400"
                        }`}
                      >
                        <MessageSquare size={12} />
                        <span className="truncate max-w-[90px]">{s.title}</span>
                        <button
                          onClick={(e) => handleDeleteSession(e, s.id)}
                          className="ml-1 text-slate-400 hover:text-red-500 transition-colors cursor-pointer"
                        >
                          &times;
                        </button>
                      </div>
                    ))}
                    {sessions.length === 0 && (
                      <span className="text-[10px] italic text-slate-455 dark:text-slate-555 py-1 px-1">
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
      <div className="flex items-center justify-between pb-5 border-b border-slate-200/80 dark:border-slate-800/80 mb-6 shrink-0">
        <div>
          <h1 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Layers className="text-brand-650 dark:text-brand-500" size={18} />
            Literature Library
          </h1>
          <p className="text-xs text-slate-450 dark:text-slate-450 font-medium">
            Select or upload academic research literature to query with Agentic AI.
          </p>
        </div>
        {(!isAdmin || (selectedUserFilter && selectedUserFilter.id === user?.id)) && (
          <Button
            onClick={() => setShowUploadModal(true)}
            className="bg-brand-600 hover:bg-brand-700 text-white rounded-xl flex items-center gap-1.5 shadow-md shadow-brand-500/10 cursor-pointer transition active:scale-95 px-4"
          >
            <UploadCloud size={15} />
            Upload PDF
          </Button>
        )}
      </div>

      {/* Library Grid View / Layout Split for Admin */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-0 overflow-hidden">
        <div className={`${isAdmin ? "lg:col-span-9" : "lg:col-span-12"} flex flex-col min-h-0 overflow-y-auto pr-1`}>
          {selectedUserFilter && (
            <div className="mb-4 p-3 bg-brand-500/10 border border-brand-500/15 rounded-xl flex items-center justify-between text-xs text-brand-650 dark:text-brand-450 shrink-0 font-medium">
              <span>Showing papers uploaded by: <strong>{selectedUserFilter.username}</strong></span>
              <button 
                onClick={() => setSelectedUserFilter(null)}
                className="hover:underline font-bold cursor-pointer text-brand-650 dark:text-brand-400"
              >
                Clear Filter
              </button>
            </div>
          )}
          {isLoadingPapers ? (
            <div className="h-full flex flex-col items-center justify-center p-10">
              <RefreshCw className="animate-spin text-brand-500 mb-2" size={22} />
              <span className="text-xs text-slate-500">Retrieving library catalogue...</span>
            </div>
          ) : papers.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-12 bg-white/40 dark:bg-slate-900/10 border border-slate-200/80 dark:border-slate-805/80 backdrop-blur-md rounded-3xl max-w-xl mx-auto my-10">
              <BookOpen size={40} className="text-slate-400 dark:text-slate-650 mb-4 animate-pulse" />
              <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200 mb-1.5">Your Library is Empty</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs leading-relaxed mb-6 font-medium">
                Drop academic journals, papers, or conference publications in PDF format to build your vector database.
              </p>
              <Button
                onClick={() => setShowUploadModal(true)}
                className="bg-brand-600 hover:bg-brand-700 text-white rounded-xl px-4 cursor-pointer font-bold"
              >
                Upload your first paper
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 pb-10">
              {papers.map((p) => (
                <motion.div
                  key={p.id}
                  whileHover={{ scale: 1.008, y: -1 }}
                  className="group relative p-5 bg-white dark:bg-slate-900/10 border border-slate-200 dark:border-slate-805/80 rounded-2xl hover:border-brand-500/40 dark:hover:border-brand-500/30 hover:shadow-lg hover:shadow-brand-500/5 cursor-pointer flex flex-col justify-between min-h-[160px] transition-all duration-200"
                  onClick={() => {
                    setActivePaperId(p.id)
                    setWorkspacePaperId(p.id)
                    setWorkspaceUserId(p.user_id || user?.id)
                    setLayoutMode("split")
                  }}
                >
                  <div>
                    {/* File Metadata */}
                    <div className="flex justify-between items-start mb-2.5">
                      <div className="h-8 w-8 rounded-lg bg-brand-500/10 dark:bg-brand-500/20 border border-brand-500/10 flex items-center justify-center text-brand-500 shadow-xs">
                        <FileText size={15} />
                      </div>
                      
                      <div className="flex items-center gap-1">
                        {/* View PDF option */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            papersApi.viewPdf(p.id)
                          }}
                          className="p-1.5 text-slate-450 hover:text-brand-600 dark:hover:text-brand-400 hover:bg-slate-100/50 dark:hover:bg-slate-800/30 rounded-lg transition-colors cursor-pointer"
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
                          className="p-1.5 text-slate-450 hover:text-brand-600 dark:hover:text-brand-400 hover:bg-slate-100/50 dark:hover:bg-slate-800/30 rounded-lg transition-colors cursor-pointer"
                          title="Download raw PDF"
                        >
                          <UploadCloud size={14} className="rotate-180" />
                        </button>

                        {/* Delete Trigger */}
                        <button
                          onClick={(e) => handleDeletePaper(e, p.id)}
                          className="p-1.5 text-slate-450 hover:text-red-500 hover:bg-slate-100/50 dark:hover:bg-slate-805/30 rounded-lg transition-colors cursor-pointer"
                          title="Delete Paper"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    {/* Title & Author Info */}
                    <h3 className="font-bold text-xs text-slate-850 dark:text-slate-200 line-clamp-2 leading-snug group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                      {p.title}
                    </h3>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1.5 line-clamp-1 font-medium">
                      {p.authors.join(", ")}
                    </p>
                  </div>

                  {/* Footer Details */}
                  <div className="border-t border-slate-100 dark:border-slate-850 mt-4 pt-3 flex items-center justify-between text-[9px] text-slate-450 dark:text-slate-500 font-semibold">
                    <span className="flex items-center gap-1">
                      <Calendar size={11} className="text-slate-400" />
                      {p.publication_year ? `Pub: ${p.publication_year}` : "Pub: N/A"}
                    </span>
                    <span className="flex items-center gap-1 text-brand-600 dark:text-brand-400 font-bold group-hover:translate-x-0.5 transition-transform">
                      Analyze Paper &rarr;
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Admin-only Users list column */}
        {isAdmin && (
          <div className="lg:col-span-3 min-h-0 h-full pb-10">
            <Card className="p-5 bg-white dark:bg-slate-900/10 border-slate-200 dark:border-slate-805/85 rounded-2xl shadow-xl flex flex-col h-full overflow-hidden shrink-0">
              <div className="flex items-center gap-2 pb-4 border-b border-slate-150/40 dark:border-slate-800 mb-4 shrink-0">
                <div className="h-8 w-8 rounded-lg bg-brand-500/10 text-brand-500 flex items-center justify-center shrink-0">
                  <User size={15} />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-widest leading-none">
                    Registered Users
                  </h3>
                  <p className="text-[9px] text-slate-450 dark:text-slate-500 mt-1.5 leading-none">
                    Active workspace profiles logs.
                  </p>
                </div>
              </div>
              
              {isLoadingUsers ? (
                <div className="flex-1 flex items-center justify-center text-xs text-slate-450 dark:text-slate-500 italic">
                  Retrieving users list...
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto space-y-2 pr-1">
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
                        className={`flex items-center justify-between p-2.5 rounded-xl cursor-pointer border transition-all duration-200 ${
                          isSelected
                            ? "bg-brand-500/10 border-brand-500/20 text-brand-650 dark:text-brand-400 font-bold shadow-xs"
                            : "bg-slate-50 dark:bg-slate-950/20 border-slate-150/30 dark:border-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800/20 text-slate-700 dark:text-slate-350"
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate pr-2">
                          <div className={`h-6.5 w-6.5 rounded-lg flex items-center justify-center font-bold text-[9px] shrink-0 ${
                            isSelected 
                              ? "bg-brand-600 text-white shadow-xs animate-pulse" 
                              : "bg-brand-500/10 text-brand-500"
                          }`}>
                            {u.username.slice(0, 2).toUpperCase()}
                          </div>
                          <span className="text-xs truncate font-semibold">
                            {u.username}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="text-[8px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-450 shrink-0">
                            {u.role}
                          </span>
                          {u.username !== "admin" && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleDeleteUser(u.id, u.username)
                              }}
                              className="p-1 text-slate-450 hover:text-red-500 hover:bg-slate-200/35 dark:hover:bg-slate-805/30 rounded transition duration-150 cursor-pointer"
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
      <AnimatePresence>
        {showUploadModal && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white dark:bg-[#090e1a] w-full max-w-lg rounded-3xl border border-slate-200 dark:border-slate-805/85 overflow-hidden shadow-2xl p-6 relative"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Upload Literature</h3>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
                    Upload PDF files to start indexing and multi-agent summaries.
                  </p>
                </div>
                <button 
                  onClick={() => setShowUploadModal(false)}
                  className="text-slate-400 hover:text-slate-650 dark:hover:text-slate-200 font-medium text-lg leading-none cursor-pointer"
                >
                  &times;
                </button>
              </div>
              
              {/* File Uploader area */}
              <FileUploader />
              
              {/* Footer */}
              <div className="flex justify-end gap-2 mt-6 border-t border-slate-100 dark:border-slate-800 pt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowUploadModal(false)}
                  className="h-9 rounded-xl text-xs cursor-pointer px-4"
                >
                  Close Dialog
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {renderAgentsModal()}
    </div>
  )
}
