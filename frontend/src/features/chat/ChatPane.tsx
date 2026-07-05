import React, { useState, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useChats } from "@/hooks/useChats"
import { useAppStore } from "@/store/useAppStore"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { papersApi } from "@/services/api"
import { 
  Send, 
  ChevronDown, 
  ChevronRight, 
  BrainCircuit, 
  Sparkles, 
  Bot,
  Plus,
  Eye,
  TerminalSquare
} from "lucide-react"

export const ChatPane: React.FC<{ userId?: string }> = ({ userId }) => {
  const { messages, queryAgent, isResponding } = useChats(userId)
  const { activePaperId, papers, activeSessionId, setPendingNotesAppend, user } = useAppStore()
  const activePaper = papers.find(p => p.id === activePaperId)

  const isReadOnly = !!userId && userId !== user?.id
  
  const [inputMsg, setInputMsg] = useState("")
  const [expandedThoughts, setExpandedThoughts] = useState<Record<string, boolean>>({})
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, isResponding])

  const handleSend = async (text: string) => {
    if (!text.trim() || !activeSessionId || isResponding || isReadOnly) return
    setInputMsg("")
    setErrorMsg(null)
    try {
      await queryAgent({ sessionId: activeSessionId, userQuery: text })
    } catch (err: any) {
      console.error("Query failed", err)
      const details = err.response?.data?.detail || "AI coordinator failed. Make sure your LLM API Keys are set inside backend/.env and restart the servers."
      setErrorMsg(details)
    }
  }

  const toggleThoughts = (msgId: string) => {
    setExpandedThoughts(prev => ({
      ...prev,
      [msgId]: !prev[msgId]
    }))
  }

  const suggestedPrompts = [
    "Provide a detailed summary of this paper.",
    "What are the novel contributions claimed by the authors?",
    "Explain the core methodology and system architecture.",
    "What are the main limitations or drawbacks identified?"
  ]

  if (!activeSessionId) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center p-8 bg-white/40 dark:bg-slate-900/10 border border-slate-200/80 dark:border-slate-805/80 backdrop-blur-md rounded-2xl">
        <Bot size={36} className="text-slate-400 dark:text-slate-600 mb-3 animate-pulse" />
        <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200 mb-1.5">No Active Chat Session</h4>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-[240px] leading-relaxed">
          Open a chat thread or select a paper in the sidebar to start asking questions to the agent team.
        </p>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col justify-between bg-white dark:bg-slate-900/10 border border-slate-200/80 dark:border-slate-805/80 backdrop-blur-md rounded-2xl overflow-hidden shadow-xs">
      
      {/* Active Paper Header */}
      {activePaper && (
        <div className="p-3.5 px-4 border-b border-slate-200/80 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-950/20 flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-[9px] font-bold text-brand-600 dark:text-brand-400 uppercase tracking-widest bg-brand-500/10 dark:bg-brand-500/20 px-2 py-0.5 rounded-md shrink-0">
              Analyzing
            </span>
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate leading-none">
              {activePaper.title}
            </h4>
          </div>
          <button
            onClick={() => papersApi.viewPdf(activePaper.id)}
            className="flex items-center gap-1.5 p-1 px-2.5 text-[10px] font-semibold text-slate-500 hover:text-brand-650 dark:hover:text-brand-400 hover:bg-slate-100/50 dark:hover:bg-slate-800/20 rounded-lg transition-all border border-slate-200 dark:border-slate-850 cursor-pointer shrink-0"
            title="Read PDF in browser"
          >
            <Eye size={12} className="text-slate-450" />
            <span>Read Paper</span>
          </button>
        </div>
      )}

      {/* Messages Feed */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0 bg-white/30 dark:bg-transparent">
        <AnimatePresence initial={false}>
          {messages.length === 0 && !isResponding && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="h-full flex flex-col items-center justify-center text-center p-4"
            >
              <BrainCircuit size={32} className="text-brand-500 mb-3 animate-bounce" />
              <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200 mb-1.5">Agent Console Online</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mb-6">
                {isReadOnly 
                  ? "Viewing conversation timeline. Admin has read-only privileges."
                  : "Ask questions about the paper's math, results, or request summaries using the templates below:"}
              </p>
              {!isReadOnly && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 w-full max-w-md">
                  {suggestedPrompts.map((p, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSend(p)}
                      className="text-left text-xs p-3 rounded-2xl border border-slate-200 dark:border-slate-850 bg-white/40 dark:bg-slate-900/10 hover:bg-slate-50 dark:hover:bg-slate-800/40 dark:text-slate-350 hover:border-brand-500/30 dark:hover:border-brand-500/20 transition-all duration-200 group cursor-pointer"
                    >
                      <span className="flex items-center font-bold gap-1 text-brand-650 dark:text-brand-400 mb-1">
                        <Sparkles size={11} className="group-hover:rotate-12 transition-transform" />
                        Query Template
                      </span>
                      <span className="leading-snug block font-medium">{p}</span>
                    </button>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {messages.map((msg) => {
            const isUser = msg.sender === "user"
            return (
              <motion.div 
                key={msg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className={`flex flex-col max-w-[85%] ${isUser ? "ml-auto items-end" : "mr-auto items-start"}`}
              >
                {/* Message Header */}
                <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 mb-1.5 uppercase tracking-widest pl-1">
                  {isUser ? "You" : msg.sender}
                </span>
                
                {/* Message Bubble */}
                <div 
                  className={`p-4 rounded-2xl text-xs leading-relaxed ${
                    isUser 
                      ? "bg-brand-600 text-white rounded-br-none shadow-sm font-medium" 
                      : "bg-white dark:bg-slate-900/40 text-slate-850 dark:text-slate-200 rounded-bl-none border border-slate-250/50 dark:border-slate-850"
                  }`}
                >
                  <div className="whitespace-pre-wrap font-sans">{msg.content}</div>
                </div>

                {/* Action Bar for AI message */}
                {!isUser && (
                  <div className="flex items-center gap-3 mt-1.5 pl-1.5 shrink-0">
                    {!isReadOnly && (
                      <button
                        onClick={() => setPendingNotesAppend(msg.content)}
                        className="flex items-center gap-1 text-[10px] font-bold text-slate-450 dark:text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-450 transition cursor-pointer"
                        title="Append this answer directly to your active Notes editor"
                      >
                        <Plus size={10} />
                        Copy to Notes
                      </button>
                    )}

                    {msg.agent_thoughts && (
                      <button
                        onClick={() => toggleThoughts(msg.id)}
                        className="flex items-center gap-1 text-[10px] font-bold text-slate-450 dark:text-slate-500 hover:text-brand-600 dark:hover:text-brand-400 transition cursor-pointer"
                      >
                        {expandedThoughts[msg.id] ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
                        <TerminalSquare size={10} />
                        Reasoning Log
                      </button>
                    )}
                  </div>
                )}

                {/* Collapsible Thoughts/Reasoning Logs Drawer */}
                {!isUser && msg.agent_thoughts && expandedThoughts[msg.id] && (
                  <div className="w-full mt-2 max-w-full">
                    <div className="p-3.5 bg-slate-950 border border-slate-850 rounded-2xl font-mono text-[10px] text-slate-400 leading-relaxed max-w-full overflow-x-auto shadow-inner">
                      <div className="flex items-center gap-1.5 text-emerald-500 mb-1.5 border-b border-slate-900 pb-1.5 font-sans font-bold uppercase tracking-wider">
                        <BrainCircuit size={11} />
                        <span>Internal Reasoning Flow</span>
                      </div>
                      {msg.agent_thoughts}
                    </div>
                  </div>
                )}
              </motion.div>
            )
          })}
        </AnimatePresence>

        {/* Responding / Agent thinking indicator */}
        {isResponding && (
          <div className="flex flex-col items-start max-w-[80%] mr-auto animate-pulse">
            <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 mb-1.5 uppercase tracking-widest pl-1">
              Analyzing Paper Context...
            </span>
            <div className="p-4 rounded-2xl rounded-bl-none bg-white dark:bg-slate-900/40 border border-slate-200/50 dark:border-slate-850 flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-brand-500 animate-bounce" />
              <span className="h-1.5 w-1.5 rounded-full bg-brand-500 animate-bounce [animation-delay:0.2s]" />
              <span className="h-1.5 w-1.5 rounded-full bg-brand-500 animate-bounce [animation-delay:0.4s]" />
            </div>
          </div>
        )}

        {/* Error Feedback Banner */}
        {errorMsg && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 text-xs text-red-500 rounded-xl flex items-center justify-between animate-fade-in my-2">
            <span><strong>System Warning:</strong> {errorMsg}</span>
            <button onClick={() => setErrorMsg(null)} className="ml-2 font-bold hover:text-red-750 shrink-0 cursor-pointer">&times;</button>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Bar */}
      <div className="p-3.5 border-t border-slate-200/80 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-950/20">
        <form 
          onSubmit={(e) => {
            e.preventDefault()
            handleSend(inputMsg)
          }}
          className="flex items-center gap-2 bg-white dark:bg-slate-950 p-1 border border-slate-250 dark:border-slate-850 rounded-2xl shadow-xs focus-within:ring-1 focus-within:ring-brand-500/20 focus-within:border-brand-500 transition-all duration-200"
        >
          <Input
            value={inputMsg}
            onChange={(e) => setInputMsg(e.target.value)}
            placeholder={isReadOnly ? "Read-Only: Viewing researcher's chat history" : "Ask anything about the paper's formulas, algorithms or evaluations..."}
            disabled={isResponding || isReadOnly}
            className="flex-1 border-none shadow-none focus-visible:ring-0 text-xs py-2 bg-transparent"
          />
          <Button 
            type="submit" 
            disabled={!inputMsg.trim() || isResponding || isReadOnly}
            className="h-9 w-9 p-0 flex items-center justify-center rounded-xl bg-brand-600 hover:bg-brand-700 text-white shrink-0 shadow-sm cursor-pointer transition-all duration-150 active:scale-95"
          >
            <Send size={15} />
          </Button>
        </form>
      </div>
    </div>
  )
}
