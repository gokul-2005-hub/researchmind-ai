import React, { useState, useEffect } from "react"
import { useNotes } from "@/hooks/useNotes"
import { useAppStore } from "@/store/useAppStore"
import { Button } from "@/components/ui/Button"
import { Textarea } from "@/components/ui/Textarea"
import { Input } from "@/components/ui/Input"
import { Save, Edit2, Eye, CheckCircle2, RefreshCw, FileEdit, Download, History } from "lucide-react"
import { exportNotesAsMarkdown, exportNotesAsTXT, exportNotesAsJSON } from "@/utils/export"

export const NotesEditor: React.FC<{ userId?: string }> = ({ userId }) => {
  const { note, saveNote, isSavingNote, isLoadingNote } = useNotes(userId)
  const { activePaperId, papers, pendingNotesAppend, setPendingNotesAppend, user } = useAppStore()

  const isReadOnly = !!userId && userId !== user?.id

  const [title, setTitle] = useState("Research Notes")
  const [content, setContent] = useState("")
  const [isEditMode, setIsEditMode] = useState(!isReadOnly) // Default to Preview mode if read-only
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
      setPendingNotesAppend(null) // clear immediately
    } else if (pendingNotesAppend && isReadOnly) {
      // Just clear without appending
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

  // Implement auto-save logic: Save after 2 seconds of inactivity
  useEffect(() => {
    if (!activePaperId || !content || isReadOnly) return

    setSaveStatus("saving")
    const timer = setTimeout(async () => {
      try {
        await saveNote({ title, content })
        setSaveStatus("saved")
        addRevisionLog(title, content)
        // Reset status to idle after showing saved checks for 2 seconds
        setTimeout(() => setSaveStatus("idle"), 2000)
      } catch (err) {
        console.error("Auto-save notes failed", err)
        setSaveStatus("idle")
      }
    }, 1500)

    return () => clearTimeout(timer)
  }, [content, title, activePaperId, isReadOnly])

  const handleManualSave = async () => {
    if (!activePaperId || isReadOnly) return
    setSaveStatus("saving")
    try {
      await saveNote({ title, content })
      setSaveStatus("saved")
      addRevisionLog(title, content)
      setTimeout(() => setSaveStatus("idle"), 2000)
    } catch (err) {
      console.error("Manual save failed", err)
      setSaveStatus("idle")
    }
  }

  if (!activePaperId) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center p-6 bg-slate-900/10 dark:bg-slate-950/20 rounded-2xl border border-slate-100 dark:border-slate-900">
        <FileEdit size={40} className="text-slate-400 dark:text-slate-650 mb-3 animate-pulse" />
        <h4 className="font-semibold text-sm text-slate-800 dark:text-slate-200 mb-1">No Active Paper Selected</h4>
        <p className="text-xs text-slate-400 dark:text-slate-500 max-w-xs leading-relaxed">
          Open a research paper from the sidebar to take structured study notes.
        </p>
      </div>
    )
  }

  if (isLoadingNote) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-4">
        <RefreshCw className="animate-spin text-indigo-500 mb-2" size={24} />
        <span className="text-xs text-slate-500">Loading notes context...</span>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col justify-between bg-white dark:bg-slate-950/50 rounded-2xl border border-slate-100 dark:border-slate-900 overflow-hidden">
      {/* Header Panel */}
      <div className="p-4 border-b border-slate-100 dark:border-slate-900 flex items-center justify-between bg-slate-50/50 dark:bg-slate-950/30">
        <div className="flex-1 mr-4">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Notes Title (e.g., Attention mechanism analysis)"
            readOnly={isReadOnly}
            className="border-transparent hover:border-slate-200 dark:hover:border-slate-800 focus:border-indigo-500/50 h-8 font-semibold text-sm px-2 rounded-lg bg-transparent"
          />
        </div>
        
        <div className="flex items-center gap-2">
          {/* Save Status Indicators */}
          {saveStatus === "saving" && (
            <span className="flex items-center gap-1 text-[10px] text-slate-400">
              <RefreshCw size={10} className="animate-spin" />
              Saving...
            </span>
          )}
          {saveStatus === "saved" && (
            <span className="flex items-center gap-1 text-[10px] text-emerald-500">
              <CheckCircle2 size={10} />
              Saved
            </span>
          )}

          {/* Toggle Modes or Read Only Badge */}
          {isReadOnly ? (
            <span className="text-[9px] font-bold uppercase tracking-wider text-indigo-500 bg-indigo-500/10 px-2.5 py-1.5 rounded-lg border border-indigo-500/20">
              Read-Only
            </span>
          ) : (
            <div className="flex rounded-lg border border-slate-200 dark:border-slate-850 p-0.5 bg-slate-100 dark:bg-slate-900">
              <button
                onClick={() => setIsEditMode(true)}
                className={`p-1 px-2.5 rounded-md text-[10px] font-semibold flex items-center gap-1.5 transition ${
                  isEditMode 
                    ? "bg-white dark:bg-slate-800 text-indigo-650 dark:text-indigo-400 shadow-sm" 
                    : "text-slate-450 hover:text-slate-800 dark:hover:text-slate-200"
                }`}
              >
                <Edit2 size={10} />
                Write
              </button>
              <button
                onClick={() => setIsEditMode(false)}
                className={`p-1 px-2.5 rounded-md text-[10px] font-semibold flex items-center gap-1.5 transition ${
                  !isEditMode 
                    ? "bg-white dark:bg-slate-800 text-indigo-650 dark:text-indigo-400 shadow-sm" 
                    : "text-slate-450 hover:text-slate-800 dark:hover:text-slate-200"
                }`}
              >
                <Eye size={10} />
                Preview
              </button>
            </div>
          )}

          {!isReadOnly && (
            <Button
              size="sm"
              onClick={handleManualSave}
              disabled={isSavingNote}
              className="h-7 px-3 bg-indigo-650 hover:bg-indigo-700 text-white rounded-lg text-[10px] font-semibold flex items-center gap-1"
            >
              <Save size={10} />
              Save
            </Button>
          )}

          {/* Export Dropdown */}
          <div className="relative">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowExportDropdown(!showExportDropdown)}
              className="h-7 px-3 text-[10px] font-semibold flex items-center gap-1 rounded-lg"
            >
              <Download size={10} />
              Export
            </Button>
            {showExportDropdown && (
              <div className="absolute right-0 mt-1 w-32 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-xl py-1 z-20 animate-scale-up">
                <button
                  onClick={() => {
                    exportNotesAsMarkdown(title, content, paperTitle)
                    setShowExportDropdown(false)
                  }}
                  className="w-full text-left px-3 py-1.5 text-[10px] text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  Markdown (.md)
                </button>
                <button
                  onClick={() => {
                    exportNotesAsTXT(title, content, paperTitle)
                    setShowExportDropdown(false)
                  }}
                  className="w-full text-left px-3 py-1.5 text-[10px] text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  Text (.txt)
                </button>
                <button
                  onClick={() => {
                    exportNotesAsJSON(title, content, paperTitle, paperAuthors)
                    setShowExportDropdown(false)
                  }}
                  className="w-full text-left px-3 py-1.5 text-[10px] text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  JSON (.json)
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Editor Body */}
      <div className="flex-1 p-4 min-h-0 overflow-y-auto">
        {isEditMode ? (
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Synthesize methodology observations, experimental results, and prompt strategies here. Support Markdown notation..."
            readOnly={isReadOnly}
            className="w-full h-full min-h-[400px] border-none shadow-none focus-visible:ring-0 p-0 dark:bg-transparent resize-none leading-relaxed text-xs"
          />
        ) : (
          <div className="prose prose-slate dark:prose-invert max-w-none text-xs leading-relaxed dark:text-slate-300">
            {content.trim() ? (
              <div className="whitespace-pre-wrap">{content}</div>
            ) : (
              <p className="italic text-slate-400 dark:text-slate-550 text-center py-20">
                Notes editor is empty. Switch to Write mode to jot down ideas.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Admin Edits Log (Visible ONLY to Admin) */}
      {user?.role === "admin" && (
        <div className="p-3 border-t border-slate-100 dark:border-slate-900 bg-slate-50/50 dark:bg-slate-950/20">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[10px] font-bold text-slate-455 dark:text-slate-550 uppercase tracking-wider flex items-center gap-1">
              <History size={10} className="text-indigo-500" />
              Admin Edits History Log (Private to Admin)
            </span>
            <button
              onClick={() => {
                if (window.confirm("Are you sure you want to clear the revision history for this paper?")) {
                  setRevisions([])
                  localStorage.removeItem(`rm_note_revisions_${activePaperId}`)
                }
              }}
              className="text-[9px] text-red-500 hover:text-red-400 transition font-semibold cursor-pointer"
            >
              Clear Log
            </button>
          </div>
          <div className="max-h-[80px] overflow-y-auto space-y-1 scrollbar-thin">
            {revisions.length === 0 ? (
              <span className="text-[9px] italic text-slate-400">No edits logged yet in this workspace.</span>
            ) : (
              revisions.map((rev, index) => (
                <div key={index} className="flex justify-between items-center text-[9px] text-slate-500 dark:text-slate-400 py-0.5 border-b border-slate-100/50 dark:border-slate-900 last:border-none">
                  <span className="font-mono">{rev.timestamp}</span>
                  <span className="truncate max-w-[150px] font-semibold">{rev.title}</span>
                  <span>{rev.length} chars saved</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
