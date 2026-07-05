import React, { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useAppStore } from "@/store/useAppStore"
import { usePapers } from "@/hooks/usePapers"
import { 
  LayoutDashboard, 
  MessageSquare, 
  Settings as SettingsIcon, 
  Sun, 
  Moon, 
  Sparkles,
  BookOpen,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Database,
  Shield,
  Activity,
  Cpu
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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  const activePaper = papers.find(p => p.id === activePaperId)

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 dark:bg-[#05070f] text-slate-900 dark:text-slate-100 transition-colors duration-300">
      
      {/* Collapsible Sidebar */}
      <motion.aside 
        animate={{ width: sidebarCollapsed ? 76 : 260 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="border-r border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-slate-900/40 backdrop-blur-2xl flex flex-col h-full shrink-0 relative z-20"
      >
        
        {/* Toggle Sidebar Button */}
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="absolute -right-3 top-10 h-6 w-6 rounded-full border border-slate-200 dark:border-slate-850 bg-white dark:bg-slate-900 flex items-center justify-center text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 shadow-md cursor-pointer z-30"
        >
          {sidebarCollapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
        </button>

        {/* Sidebar Header/Logo */}
        <div className={`p-5 border-b border-slate-200/80 dark:border-slate-800/80 flex items-center gap-3 overflow-hidden ${sidebarCollapsed ? 'justify-center' : ''}`}>
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-brand-500/20 shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          {!sidebarCollapsed && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="flex flex-col"
            >
              <h1 className="font-bold text-sm tracking-tight text-slate-900 dark:text-white leading-none">ResearchMind</h1>
              <span className="text-[9px] text-brand-600 dark:text-brand-500 font-bold tracking-widest uppercase mt-0.5">Multi-Agent AI</span>
            </motion.div>
          )}
        </div>

        {/* Sidebar Navigation */}
        <nav className="flex-1 px-3 py-6 space-y-1.5 overflow-y-auto">
          <button 
            onClick={() => {
              setActivePaperId(null)
              setActiveSessionId(null)
            }}
            className={`w-full flex items-center gap-3 px-3.5 py-3 text-xs font-semibold rounded-xl border transition-all duration-200 cursor-pointer ${
              !activePaperId 
                ? "text-brand-600 dark:text-brand-400 bg-brand-50/60 dark:bg-brand-500/10 border-brand-100/30 dark:border-brand-500/10 shadow-xs" 
                : "text-slate-500 dark:text-slate-400 hover:bg-slate-100/50 dark:hover:bg-slate-800/20 hover:text-slate-800 dark:hover:text-slate-200 border-transparent"
            } ${sidebarCollapsed ? 'justify-center' : ''}`}
            title="Dashboard"
          >
            <LayoutDashboard size={18} className={!activePaperId ? "text-brand-500" : ""} />
            {!sidebarCollapsed && <span>Dashboard</span>}
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
            className={`w-full flex items-center gap-3 px-3.5 py-3 text-xs font-semibold rounded-xl border transition-all duration-200 cursor-pointer ${
              activePaperId 
                ? "text-brand-600 dark:text-brand-400 bg-brand-50/60 dark:bg-brand-500/10 border-brand-100/30 dark:border-brand-500/10 shadow-xs" 
                : "text-slate-500 dark:text-slate-400 hover:bg-slate-100/50 dark:hover:bg-slate-800/20 hover:text-slate-800 dark:hover:text-slate-200 border-transparent"
            } ${sidebarCollapsed ? 'justify-center' : ''}`}
            title="Agent Workspace"
          >
            <MessageSquare size={18} className={activePaperId ? "text-brand-500" : ""} />
            {!sidebarCollapsed && <span>Agent Workspace</span>}
          </button>

          {!sidebarCollapsed && (
            <div className="pt-6">
              <div className="px-3.5 text-[9px] font-bold text-slate-400 dark:text-slate-500 tracking-widest uppercase mb-2">
                Recent Papers
              </div>
              
              {papers.length === 0 ? (
                <div className="px-3.5 py-3 text-xs text-slate-400 dark:text-slate-500 italic">
                  No papers uploaded yet.
                </div>
              ) : (
                <div className="space-y-1">
                  {papers.slice(0, 8).map((paper) => (
                    <button
                      key={paper.id}
                      onClick={() => setActivePaperId(paper.id)}
                      className={`w-full text-left flex items-center gap-2 px-3 py-2 rounded-lg text-[11px] transition-all duration-150 ${
                        activePaperId === paper.id
                          ? "bg-brand-500/10 text-brand-600 dark:text-brand-400 font-semibold"
                          : "text-slate-600 dark:text-slate-400 hover:bg-slate-100/50 dark:hover:bg-slate-800/20"
                      }`}
                    >
                      <BookOpen size={13} className="shrink-0 text-slate-400 dark:text-slate-500" />
                      <span className="truncate">{paper.title}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-3 border-t border-slate-200/80 dark:border-slate-800/80 flex flex-col gap-1.5">
          <button 
            onClick={toggleTheme}
            className={`w-full flex items-center justify-between p-2.5 rounded-xl border border-slate-200 dark:border-slate-800/60 text-xs font-semibold hover:bg-slate-100/50 dark:hover:bg-slate-800/20 cursor-pointer transition-all duration-200 ${sidebarCollapsed ? 'justify-center' : ''}`}
            title="Switch Theme"
          >
            <span className="flex items-center gap-2">
              {theme === "dark" ? <Moon size={16} className="text-brand-500" /> : <Sun size={16} className="text-amber-500" />}
              {!sidebarCollapsed && <span>{theme === "dark" ? "Dark Mode" : "Light Mode"}</span>}
            </span>
            {!sidebarCollapsed && (
              <div className="h-4.5 w-8 rounded-full bg-slate-200 dark:bg-slate-800 relative flex items-center p-0.5 transition-colors">
                <div className={`h-3.5 w-3.5 rounded-full bg-white dark:bg-brand-500 shadow-sm transition-transform duration-200 ${
                  theme === "dark" ? "translate-x-3.5" : "translate-x-0"
                }`} />
              </div>
            )}
          </button>

          <button 
            onClick={() => setShowSettingsModal(true)}
            className={`w-full flex items-center gap-3 p-2.5 text-xs font-semibold rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100/50 dark:hover:bg-slate-800/20 hover:text-slate-800 dark:hover:text-slate-200 transition-all duration-200 cursor-pointer ${sidebarCollapsed ? 'justify-center' : ''}`}
            title="Settings"
          >
            <SettingsIcon size={16} />
            {!sidebarCollapsed && <span>Settings</span>}
          </button>
        </div>
      </motion.aside>

      {/* Main Workspace Frame */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        
        {/* Floating Top Header */}
        <header className="h-16 border-b border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-slate-900/40 backdrop-blur-2xl flex items-center justify-between px-8 z-10">
          <div className="flex items-center gap-3">
            {activePaper ? (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center gap-2 bg-brand-500/5 dark:bg-brand-500/10 border border-brand-500/20 px-3.5 py-1.5 rounded-xl text-brand-600 dark:text-brand-400 text-xs font-semibold tracking-wide"
              >
                <Sparkles size={13} className="text-brand-500" />
                <span className="max-w-md truncate">{activePaper.title}</span>
              </motion.div>
            ) : (
              <span className="text-slate-400 dark:text-slate-500 text-xs font-medium">Select a research paper to analyze</span>
            )}
          </div>

          <div className="flex items-center gap-3">
            {user && (
              <span className="text-xs text-slate-500 dark:text-slate-400 font-bold">
                {user.username}
              </span>
            )}
            <div className="h-8 w-8 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-md">
              {user ? user.username.slice(0, 2).toUpperCase() : "RM"}
            </div>
            {user && (
              <button 
                onClick={() => {
                  if (window.confirm("Do you want to logout from this session?")) {
                    logout()
                  }
                }}
                className="p-2 rounded-xl text-slate-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-slate-100/50 dark:hover:bg-slate-800/20 transition-all duration-200 cursor-pointer"
                title="Logout session"
              >
                <LogOut size={15} />
              </button>
            )}
          </div>
        </header>

        {/* Content View Workspace */}
        <main className="flex-1 overflow-y-auto relative p-6 bg-slate-50/50 dark:bg-transparent">
          {children}
        </main>
      </div>

      {/* Settings Modal */}
      <AnimatePresence>
        {showSettingsModal && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ duration: 0.2 }}
              className="bg-white dark:bg-[#090e1a] w-full max-w-md rounded-3xl border border-slate-200/80 dark:border-slate-800/80 overflow-hidden shadow-2xl p-6 relative text-slate-850 dark:text-slate-200"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-sm font-bold flex items-center gap-2 text-slate-900 dark:text-white">
                    <SettingsIcon size={16} className="text-brand-500" />
                    System Specifications
                  </h3>
                  <p className="text-[10px] text-slate-400 mt-1">
                    System specifications and environmental parameters details.
                  </p>
                </div>
                <button 
                  onClick={() => setShowSettingsModal(false)}
                  className="text-slate-400 hover:text-slate-650 dark:hover:text-slate-200 font-medium text-lg leading-none cursor-pointer"
                >
                  &times;
                </button>
              </div>

              {/* Specifications List */}
              <div className="space-y-4 text-xs leading-normal">
                <div className="border-b border-slate-100 dark:border-slate-800/80 pb-3 flex gap-3">
                  <Cpu className="text-brand-500 mt-0.5 shrink-0" size={16} />
                  <div>
                    <span className="font-bold text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-widest block">AI Orchestrator Engine</span>
                    <span className="block font-semibold mt-0.5 dark:text-white">LangGraph Coordinator Nodes</span>
                    <span className="block text-[10px] text-slate-500 mt-0.5">Model: gpt-4o-mini (Structured Outputs format)</span>
                  </div>
                </div>

                <div className="border-b border-slate-100 dark:border-slate-800/80 pb-3 flex gap-3">
                  <Database className="text-brand-500 mt-0.5 shrink-0" size={16} />
                  <div>
                    <span className="font-bold text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-widest block">Local Vector Store</span>
                    <span className="block font-semibold mt-0.5 dark:text-white">ChromaDB Persistent client</span>
                    <span className="block text-[10px] text-slate-500 mt-0.5">Embedding Model: BAAI/bge-small-en-v1.5 (384 dimensions)</span>
                  </div>
                </div>

                <div className="border-b border-slate-100 dark:border-slate-800/80 pb-3 flex gap-3">
                  <Activity className="text-brand-500 mt-0.5 shrink-0" size={16} />
                  <div>
                    <span className="font-bold text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-widest block">Local SQLite Database</span>
                    <span className="block font-semibold mt-0.5 dark:text-white">SQLite Database via SQLAlchemy</span>
                    <span className="block text-[10px] text-slate-500 mt-0.5">Path: backend/db_data/researchmind.db</span>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Shield className="text-brand-500 mt-0.5 shrink-0" size={16} />
                  <div>
                    <span className="font-bold text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-widest block">Active Session Account</span>
                    <span className="block font-semibold mt-0.5 dark:text-white">User: {user ? user.username : "guest"} ({user ? user.role : "unauthorized"})</span>
                    <span className="block text-[10px] text-slate-500 mt-0.5">Token validation: JWT Bearer enabled</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-end mt-6 border-t border-slate-100 dark:border-slate-800/80 pt-4">
                <button
                  onClick={() => setShowSettingsModal(false)}
                  className="h-9 px-4 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold rounded-xl transition cursor-pointer"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
