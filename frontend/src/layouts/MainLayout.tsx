import React, { useState } from "react"
import { useAppStore } from "@/store/useAppStore"
import { usePapers } from "@/hooks/usePapers"
import { 
  Brain, 
  LayoutDashboard, 
  MessageSquare, 
  Settings as SettingsIcon, 
  Sun, 
  Moon, 
  Sparkles,
  BookOpen,
  LogOut
} from "lucide-react"

interface MainLayoutProps {
  children: React.ReactNode
}

export const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const { 
    theme, 
    toggleTheme, 
    activePaperId, 
    setActivePaperId,
    setActiveSessionId,
    user,
    logout
  } = useAppStore()

  const { papers } = usePapers()

  const [showSettingsModal, setShowSettingsModal] = useState(false)

  const activePaper = papers.find(p => p.id === activePaperId)

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-200">
      
      {/* Sidebar Section */}
      <aside className="w-64 border-r border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/50 backdrop-blur-md flex flex-col h-full shrink-0">
        
        {/* Sidebar Header/Logo */}
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-600/20">
            <Brain size={20} />
          </div>
          <div>
            <h1 className="font-bold text-base leading-none tracking-tight">ResearchMind</h1>
            <span className="text-[10px] text-indigo-500 font-semibold tracking-widest uppercase">Multi-Agent</span>
          </div>
        </div>

        {/* Sidebar Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          <button 
            onClick={() => {
              setActivePaperId(null)
              setActiveSessionId(null)
            }}
            className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl border transition duration-150 cursor-pointer ${
              !activePaperId 
                ? "text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 border-slate-200/50 dark:border-slate-700/50 shadow-sm" 
                : "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900 hover:text-slate-800 dark:hover:text-slate-200 border-transparent"
            }`}
          >
            <LayoutDashboard size={18} className={!activePaperId ? "text-indigo-500" : ""} />
            <span>Dashboard</span>
          </button>
          
          <button 
            onClick={() => {
              if (papers.length > 0) {
                if (!activePaperId) {
                  setActivePaperId(papers[0].id)
                }
              } else {
                alert("Please upload an academic PDF paper from your Dashboard first!")
              }
            }}
            className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl border transition duration-150 cursor-pointer ${
              activePaperId 
                ? "text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 border-slate-200/50 dark:border-slate-700/50 shadow-sm" 
                : "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900 hover:text-slate-800 dark:hover:text-slate-200 border-transparent"
            }`}
          >
            <MessageSquare size={18} className={activePaperId ? "text-indigo-500" : ""} />
            <span>Agent Workspace</span>
          </button>

          <div className="pt-6">
            <div className="px-4 text-[10px] font-semibold text-slate-400 dark:text-slate-500 tracking-wider uppercase mb-2">
              Recent Papers
            </div>
            
            {papers.length === 0 ? (
              <div className="px-4 py-3 text-xs text-slate-400 dark:text-slate-500 italic">
                No papers uploaded yet.
              </div>
            ) : (
              <div className="space-y-1">
                {papers.map((paper) => (
                  <button
                    key={paper.id}
                    onClick={() => setActivePaperId(paper.id)}
                    className={`w-full text-left flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition duration-150 ${
                      activePaperId === paper.id
                        ? "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-medium"
                        : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/30"
                    }`}
                  >
                    <BookOpen size={14} className="shrink-0" />
                    <span className="truncate">{paper.title}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </nav>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex flex-col gap-2">
          <button 
            onClick={toggleTheme}
            className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-900 cursor-pointer transition duration-150"
          >
            <span className="flex items-center gap-2">
              {theme === "dark" ? <Moon size={16} /> : <Sun size={16} />}
              <span>{theme === "dark" ? "Dark Mode" : "Light Mode"}</span>
            </span>
            <div className="h-4 w-8 rounded-full bg-slate-200 dark:bg-slate-800 relative flex items-center p-0.5 transition-colors">
              <div className={`h-3 w-3 rounded-full bg-white dark:bg-indigo-500 shadow-sm transition-transform duration-200 ${
                theme === "dark" ? "translate-x-4" : "translate-x-0"
              }`} />
            </div>
          </button>

          <button 
            onClick={() => setShowSettingsModal(true)}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900 hover:text-slate-800 dark:hover:text-slate-200 transition duration-150 cursor-pointer"
          >
            <SettingsIcon size={18} />
            <span>Settings</span>
          </button>
        </div>
      </aside>

      {/* Main Workspace Frame */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        
        {/* Top Header Navigation */}
        <header className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/50 backdrop-blur-md flex items-center justify-between px-8 z-10">
          <div className="flex items-center gap-3">
            {activePaper ? (
              <div className="flex items-center gap-2 bg-indigo-500/5 dark:bg-indigo-500/10 border border-indigo-500/20 px-3 py-1.5 rounded-xl text-indigo-600 dark:text-indigo-400 text-xs font-semibold tracking-wide">
                <Sparkles size={12} className="animate-spin-slow" />
                <span className="max-w-md truncate">{activePaper.title}</span>
              </div>
            ) : (
              <span className="text-slate-400 dark:text-slate-500 text-sm font-light">Select a research paper to analyze</span>
            )}
          </div>

          <div className="flex items-center gap-3">
            {user && (
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                {user.username}
              </span>
            )}
            <div className="h-8 w-8 rounded-full bg-slate-200 dark:bg-slate-800 border border-slate-350 dark:border-slate-700 flex items-center justify-center font-bold text-xs">
              {user ? user.username.slice(0, 2).toUpperCase() : "AG"}
            </div>
            {user && (
              <button 
                onClick={() => {
                  if (window.confirm("Do you want to logout from this user?")) {
                    logout()
                  }
                }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-slate-100 dark:hover:bg-slate-850 transition cursor-pointer"
                title="Logout session"
              >
                <LogOut size={14} />
              </button>
            )}
          </div>
        </header>

        {/* Content View Workspace */}
        <main className="flex-1 overflow-y-auto p-8 relative">
          {children}
        </main>
      </div>

      {/* Settings Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div 
            className="bg-white dark:bg-slate-905 w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-850 overflow-hidden shadow-2xl p-6 relative animate-scale-up text-slate-800 dark:text-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-sm font-bold flex items-center gap-2">
                  <SettingsIcon size={16} className="text-indigo-500" />
                  System Settings
                </h3>
                <p className="text-[10px] text-slate-400 mt-1">
                  System specifications and environmental parameters details.
                </p>
              </div>
              <button 
                onClick={() => setShowSettingsModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-250 font-medium text-lg leading-none"
              >
                &times;
              </button>
            </div>

            {/* Specifications List */}
            <div className="space-y-4 text-xs leading-normal">
              <div className="border-b border-slate-100 dark:border-slate-850 pb-2">
                <span className="font-semibold text-[10px] text-slate-400 dark:text-slate-550 uppercase tracking-wider block">AI Orchestrator Engine</span>
                <span className="block font-medium mt-0.5">LangGraph Coordinator Nodes</span>
                <span className="block text-[10px] text-slate-400 mt-0.5">Model: gpt-4o-mini (Structured Outputs format)</span>
              </div>

              <div className="border-b border-slate-100 dark:border-slate-850 pb-2">
                <span className="font-semibold text-[10px] text-slate-400 dark:text-slate-550 uppercase tracking-wider block">Local Vector Store</span>
                <span className="block font-medium mt-0.5">ChromaDB Persistent client</span>
                <span className="block text-[10px] text-slate-400 mt-0.5">Embedding Model: all-MiniLM-L6-v2 (384 dimensions)</span>
              </div>

              <div className="border-b border-slate-100 dark:border-slate-850 pb-2">
                <span className="font-semibold text-[10px] text-slate-400 dark:text-slate-550 uppercase tracking-wider block">Local SQLite Database</span>
                <span className="block font-medium mt-0.5">SQLite database running on SQLAlchemy</span>
                <span className="block text-[10px] text-slate-400 mt-0.5">Path: backend/db_data/researchmind.db</span>
              </div>

              <div>
                <span className="font-semibold text-[10px] text-slate-400 dark:text-slate-550 uppercase tracking-wider block">Active Session Account</span>
                <span className="block font-medium mt-0.5">User: {user ? user.username : "guest"} ({user ? user.role : "unauthorized"})</span>
                <span className="block text-[10px] text-slate-400 mt-0.5">Token validation: JWT Bearer enabled</span>
              </div>
            </div>

            <div className="flex justify-end mt-6 border-t border-slate-100 dark:border-slate-850 pt-4">
              <button
                onClick={() => setShowSettingsModal(false)}
                className="h-8 px-4 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold rounded-lg transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
