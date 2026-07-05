import React, { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useNotes } from "@/hooks/useNotes"
import { useAppStore } from "@/store/useAppStore"
import { Button } from "@/components/ui/Button"
import { Textarea } from "@/components/ui/Textarea"
import { Input } from "@/components/ui/Input"
import { Edit2, Eye, CheckCircle2, RefreshCw, FileEdit, Download, History, Lock } from "lucide-react"
import { exportNotesAsMarkdown, exportNotesAsTXT, exportNotesAsJSON } from "@/utils/export"

export const NotesEditor: React.FC<{ userId?: string }> = ({ userId }) => {
  const { note, saveNote, isLoadingNote } = useNotes(userId)
  const { activePaperId, papers, pendingNotesAppend, setPendingNotesAppend, user } = useAppStore()

  const isReadOnly = !!userId && userId !== user?.id

  const [title, setTitle] = useState("Research Notes")
  const [content, setContent] = useState("")
  const [isEditMode, setIsEditMode] = useState(!isReadOnly) 
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle")
  const [showExportDropdown, setShowExportDropdown] = useState(false)
  const [revisions, setRevisions] = useState<Array<{ timestamp: string; title: string; length: number }>>([])

  // Load revisions on activePaperId mount
  useEffect(() => {
    if (!activePaperId) return
    const stored = localStorage.getItem(`rm_note_revisions_${activePaperId}`)
    if (stored) {
      try {
        setRevisions(JSON.parse(stored))
      } catch {
        setRevisions([])
      }
    } else {
      setRevisions([])
    }
  }, [activePaperId])

  const addRevisionLog = (newTitle: string, newContent: string) => {
    if (user?.role !== "admin") return
    const newEntry = {
      timestamp: new Date().toLocaleTimeString(),
      title: newTitle,
      length: newContent.length
    }
    setRevisions(prev => {
      const updated = [newEntry, ...prev].slice(0, 10)
      localStorage.setItem(`rm_note_revisions_${activePaperId}`, JSON.stringify(updated))
      return updated
    })
  }

  // Listen to external appends (e.g. Copy Response to Notes from Chat pane)
  useEffect(() => {
    if (pendingNotesAppend && !isReadOnly) {
      setContent(prev => prev + (prev ? "\n\n" : "") + pendingNotesAppend)
      setPendingNotesAppend(null)
    } else if (pendingNotesAppend && isReadOnly) {
      setPendingNotesAppend(null)
    }
  }, [pendingNotesAppend, setPendingNotesAppend, isReadOnly])

  const activePaper = papers.find(p => p.id === activePaperId)
  const paperTitle = activePaper?.title || "Unknown Paper"
  const paperAuthors = activePaper?.authors || []

  // Load active note values when they change
  useEffect(() => {
    if (note) {
      setTitle(note.title || "Research Notes")
      setContent(note.content || "")
    } else {
      setTitle("Research Notes")
      setContent("")
    }
  }, [note])

  // Auto-save logic
  useEffect(() => {
    if (!activePaperId || !content || isReadOnly) return

    setSaveStatus("saving")
    const timer = setTimeout(async () => {
      try {
        await saveNote({ title, content })
        setSaveStatus("saved")
        addRevisionLog(title, content)
        setTimeout(() => setSaveStatus("idle"), 2000)
      } catch (err) {
        console.error("Auto-save failed", err)
        setSaveStatus("idle")
      }
    }, 1500)

    return () => clearTimeout(timer)
  }, [content, title, activePaperId, isReadOnly])



  if (!activePaperId) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center p-8 bg-white/40 dark:bg-slate-900/10 border border-slate-200/80 dark:border-slate-805/80 backdrop-blur-md rounded-2xl">
        <FileEdit size={36} className="text-slate-400 dark:text-slate-600 mb-3 animate-pulse" />
        <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200 mb-1.5">No Active Paper</h4>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-[240px] leading-relaxed">
          Open a research paper from the dashboard list to start taking structured notes.
        </p>
      </div>
    )
  }

  if (isLoadingNote) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-4">
        <RefreshCw className="animate-spin text-brand-500 mb-2" size={22} />
        <span className="text-xs text-slate-500">Loading notes context...</span>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col justify-between bg-white dark:bg-slate-900/10 border border-slate-200/80 dark:border-slate-805/80 backdrop-blur-md rounded-2xl overflow-hidden shadow-xs">
      
      {/* Header Panel */}
      <div className="p-4 border-b border-slate-200/80 dark:border-slate-800/80 flex items-center justify-between bg-slate-50/50 dark:bg-slate-950/20">
        <div className="flex-1 mr-4">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Notes Title (e.g., Loss function observations)"
            readOnly={isReadOnly}
            className="border-transparent hover:border-slate-200 dark:hover:border-slate-850 focus:border-brand-500/50 h-8 font-bold text-sm px-2 rounded-lg bg-transparent truncate"
          />
        </div>
        
        <div className="flex items-center gap-2">
          {/* Save status */}
          <AnimatePresence mode="wait">
            {saveStatus === "saving" && (
              <motion.span 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-1 text-[10px] text-slate-400"
              >
                <RefreshCw size={9} className="animate-spin" />
                Saving...
              </motion.span>
            )}
            {saveStatus === "saved" && (
              <motion.span 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-1 text-[10px] text-emerald-500 font-semibold"
              >
                <CheckCircle2 size={10} />
                Saved
              </motion.span>
            )}
          </AnimatePresence>

          {/* Toggle modes */}
          {isReadOnly ? (
            <span className="text-[9px] font-bold uppercase tracking-wider text-brand-600 dark:text-brand-400 bg-brand-500/10 px-2 py-1 rounded-md border border-brand-500/20 flex items-center gap-1 shrink-0">
              <Lock size={9} />
              Read-Only
            </span>
          ) : (
            <div className="flex rounded-xl border border-slate-250 dark:border-slate-850 p-0.5 bg-slate-100 dark:bg-slate-950/60 shrink-0 relative">
              <button
                onClick={() => setIsEditMode(true)}
                className={`py-1 px-3.5 rounded-lg text-[10px] font-bold flex items-center gap-1.5 transition-colors duration-200 relative z-10 cursor-pointer ${
                  isEditMode 
                    ? "text-brand-650 dark:text-brand-400 font-bold" 
                    : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-350"
                }`}
              >
                <Edit2 size={9} />
                Write
                {isEditMode && (
                  <motion.div
                    layoutId="notesEditTab"
                    className="absolute inset-0 bg-white dark:bg-slate-800 rounded-lg -z-10 shadow-xs border border-slate-200/50 dark:border-slate-700/50"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
              </button>
              <button
                onClick={() => setIsEditMode(false)}
                className={`py-1 px-3.5 rounded-lg text-[10px] font-bold flex items-center gap-1.5 transition-colors duration-200 relative z-10 cursor-pointer ${
                  !isEditMode 
                    ? "text-brand-650 dark:text-brand-400 font-bold" 
                    : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-350"
                }`}
              >
                <Eye size={9} />
                Preview
                {!isEditMode && (
                  <motion.div
                    layoutId="notesEditTab"
                    className="absolute inset-0 bg-white dark:bg-slate-800 rounded-lg -z-10 shadow-xs border border-slate-200/50 dark:border-slate-700/50"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
              </button>
            </div>
          )}

          {/* Export Dropdown */}
          <div className="relative shrink-0">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowExportDropdown(!showExportDropdown)}
              className="h-8 px-3 text-[10px] font-bold flex items-center gap-1.5 rounded-xl cursor-pointer"
            >
              <Download size={11} />
              Export
            </Button>
            
            <AnimatePresence>
              {showExportDropdown && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95, y: 5 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 5 }}
                  className="absolute right-0 mt-1.5 w-36 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl py-1 z-30 overflow-hidden"
                >
                  <button
                    onClick={() => {
                      exportNotesAsMarkdown(title, content, paperTitle)
                      setShowExportDropdown(false)
                    }}
                    className="w-full text-left px-3.5 py-2 text-[10px] font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition cursor-pointer"
                  >
                    Markdown (.md)
                  </button>
                  <button
                    onClick={() => {
                      exportNotesAsTXT(title, content, paperTitle)
                      setShowExportDropdown(false)
                    }}
                    className="w-full text-left px-3.5 py-2 text-[10px] font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition cursor-pointer"
                  >
                    Plain Text (.txt)
                  </button>
                  <button
                    onClick={() => {
                      exportNotesAsJSON(title, content, paperTitle, paperAuthors)
                      setShowExportDropdown(false)
                    }}
                    className="w-full text-left px-3.5 py-2 text-[10px] font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition cursor-pointer"
                  >
                    JSON Schema (.json)
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Editor Body */}
      <div className="flex-1 p-5 min-h-0 overflow-y-auto bg-white/30 dark:bg-transparent">
        {isEditMode ? (
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Jot down notes, summarize main findings, or copy answers from the agent chatbot panel. Markdown notation is supported."
            readOnly={isReadOnly}
            className="w-full h-full min-h-[350px] border-none shadow-none focus-visible:ring-0 p-0 dark:bg-transparent resize-none leading-relaxed text-xs placeholder-slate-400 font-sans"
          />
        ) : (
          <div className="prose prose-slate dark:prose-invert max-w-none text-xs leading-relaxed dark:text-slate-300">
            {content.trim() ? (
              <div className="whitespace-pre-wrap font-sans">{content}</div>
            ) : (
              <p className="italic text-slate-400 dark:text-slate-500 text-center py-24">
                Notes list is empty. Switch to Write mode to write something.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Revision Logs Section (Admin only) */}
      {user?.role === "admin" && (
        <div className="p-4 border-t border-slate-200/80 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-950/20">
          <div className="flex justify-between items-center mb-3">
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
              <History size={11} className="text-brand-500" />
              Revision History Logs
            </span>
            <button
              onClick={() => {
                if (window.confirm("Are you sure you want to clear the revision history for this paper?")) {
                  setRevisions([])
                  localStorage.removeItem(`rm_note_revisions_${activePaperId}`)
                }
              }}
              className="text-[9px] text-red-500 hover:text-red-400 transition-colors font-bold cursor-pointer"
            >
              Clear Logs
            </button>
          </div>
          <div className="max-h-[86px] overflow-y-auto space-y-1.5 pr-1">
            {revisions.length === 0 ? (
              <span className="text-[9px] italic text-slate-400 dark:text-slate-550 block py-1">No revision history logs recorded yet.</span>
            ) : (
              revisions.map((rev, index) => (
                <div 
                  key={index} 
                  className="flex justify-between items-center text-[9px] text-slate-550 dark:text-slate-400 py-1 border-b border-slate-100 dark:border-slate-850 last:border-none hover:bg-slate-100/30 dark:hover:bg-slate-800/20 px-1 rounded-sm transition-all"
                >
                  <span className="font-mono text-brand-500">{rev.timestamp}</span>
                  <span className="truncate max-w-[170px] font-bold">{rev.title}</span>
                  <span className="text-slate-400 dark:text-slate-500">{rev.length} characters saved</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
