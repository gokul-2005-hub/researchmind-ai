import React, { useState, useRef, useEffect } from "react"
import { useChats } from "@/hooks/useChats"
import { useAppStore } from "@/store/useAppStore"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { papersApi } from "@/services/api"
import { 
  Send, 
  Terminal, 
  ChevronDown, 
  ChevronRight, 
  BrainCircuit, 
  Sparkles, 
  Bot,
  Plus,
  Eye
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
      const details = err.response?.data?.detail || "AI coordinator failed. Make sure your OPENAI_API_KEY is set inside backend/.env and restart the servers."
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
      <div className="h-full flex flex-col items-center justify-center text-center p-6 bg-slate-900/10 dark:bg-slate-950/20 rounded-2xl border border-slate-100 dark:border-slate-900">
        <Bot size={40} className="text-slate-400 dark:text-slate-650 mb-3 animate-pulse" />
        <h4 className="font-semibold text-sm text-slate-800 dark:text-slate-200 mb-1">No Active Chat Session</h4>
        <p className="text-xs text-slate-400 dark:text-slate-500 max-w-xs leading-relaxed">
          Select or initialize a chat thread in the sidebar to start asking questions.
        </p>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col justify-between bg-white dark:bg-slate-950/50 rounded-2xl border border-slate-100 dark:border-slate-900 overflow-hidden">
      {/* Active Paper Header with Eye Symbol */}
      {activePaper && (
        <div className="p-3 px-4 border-b border-slate-150 dark:border-slate-900 bg-slate-50 dark:bg-slate-950/40 flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-[9px] font-bold text-indigo-650 dark:text-indigo-400 uppercase tracking-wider bg-indigo-500/10 dark:bg-indigo-500/20 px-2 py-0.5 rounded-md shrink-0">
              Analyzing
            </span>
            <h4 className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate leading-none">
              {activePaper.title}
            </h4>
          </div>
          <button
            onClick={() => papersApi.viewPdf(activePaper.id)}
            className="flex items-center gap-1 p-1 px-2 text-[10px] font-semibold text-slate-500 hover:text-indigo-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition cursor-pointer shrink-0 border border-slate-200 dark:border-slate-850"
            title="Read PDF in browser"
          >
            <Eye size={12} className="text-slate-450" />
            <span>Read Paper</span>
          </button>
        </div>
      )}

      {/* Messages Feed */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
        {messages.length === 0 && !isResponding && (
          <div className="h-full flex flex-col items-center justify-center text-center p-4">
            <BrainCircuit size={32} className="text-indigo-500/80 mb-3 animate-bounce" />
            <h4 className="font-semibold text-sm text-slate-800 dark:text-slate-200 mb-1">Agent Console Online</h4>
            <p className="text-xs text-slate-400 dark:text-slate-550 max-w-xs mb-6">
              {isReadOnly 
                ? "Viewing conversation timeline. Admin has read-only privileges."
                : "Ask questions about the paper's math, results, or request summaries using the templates below:"}
            </p>
            {!isReadOnly && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 w-full max-w-md">
                {suggestedPrompts.map((p, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSend(p)}
                    className="text-left text-xs p-3 rounded-xl border border-slate-200 dark:border-slate-900 bg-slate-50 dark:bg-slate-950/50 hover:bg-slate-100 dark:hover:bg-slate-900/60 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-800 transition duration-150 group"
                  >
                    <span className="flex items-center font-medium gap-1 text-indigo-500 mb-1">
                      <Sparkles size={12} className="group-hover:rotate-12 transition-transform" />
                      Query Template
                    </span>
                    <span className="leading-snug block">{p}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {messages.map((msg) => {
          const isUser = msg.sender === "user"
          return (
            <div 
              key={msg.id}
              className={`flex flex-col max-w-[85%] ${isUser ? "ml-auto items-end" : "mr-auto items-start"}`}
            >
              {/* Message Header Sender Name */}
              <span className="text-[10px] font-semibold text-slate-450 dark:text-slate-550 mb-1 uppercase tracking-wider">
                {isUser ? "You" : msg.sender}
              </span>
              
              {/* Message Bubble */}
              <div 
                className={`p-4 rounded-2xl text-xs leading-relaxed ${
                  isUser 
                    ? "bg-indigo-650 text-white rounded-br-none shadow-md shadow-indigo-650/10" 
                    : "bg-slate-50 dark:bg-slate-900/60 text-slate-800 dark:text-slate-200 rounded-bl-none border border-slate-200/50 dark:border-slate-850"
                }`}
              >
                {/* Clean markdown rendering or pre-wrap */}
                <div className="whitespace-pre-wrap">{msg.content}</div>
              </div>

              {/* Action Bar for AI message */}
              {!isUser && (
                <div className="flex items-center gap-3 mt-1.5 pl-1 shrink-0">
                  {!isReadOnly && (
                    <button
                      onClick={() => setPendingNotesAppend(msg.content)}
                      className="flex items-center gap-1 text-[10px] font-semibold text-slate-400 dark:text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-450 transition cursor-pointer"
                      title="Append this answer directly to your active Notes editor"
                    >
                      <Plus size={10} />
                      Copy to Notes
                    </button>
                  )}

                  {msg.agent_thoughts && (
                    <button
                      onClick={() => toggleThoughts(msg.id)}
                      className="flex items-center gap-1 text-[10px] font-semibold text-slate-400 dark:text-slate-500 hover:text-indigo-500 dark:hover:text-indigo-400 transition cursor-pointer"
                    >
                      {expandedThoughts[msg.id] ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
                      <Terminal size={10} />
                      Reasoning Log
                    </button>
                  )}
                </div>
              )}

              {/* Collapsible Thoughts/Reasoning Logs Drawer */}
              {!isUser && msg.agent_thoughts && expandedThoughts[msg.id] && (
                <div className="w-full mt-1.5 max-w-full">
                  <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl font-mono text-[10px] text-slate-350 dark:text-slate-450 leading-normal max-w-full overflow-x-auto shadow-inner animate-scale-up">
                    <div className="flex items-center gap-1 text-emerald-500 mb-1 border-b border-slate-850 pb-1">
                      <BrainCircuit size={10} />
                      <span>INTERNAL THINKING LOG</span>
                    </div>
                    {msg.agent_thoughts}
                  </div>
                </div>
              )}
            </div>
          )
        })}

        {/* Responding / Agent thinking indicator */}
        {isResponding && (
          <div className="flex flex-col items-start max-w-[80%] mr-auto">
            <span className="text-[10px] font-semibold text-slate-450 dark:text-slate-500 mb-1 uppercase tracking-wider">
              Thinking...
            </span>
            <div className="p-4 rounded-2xl rounded-bl-none bg-slate-50 dark:bg-slate-900/60 border border-slate-200/50 dark:border-slate-850 flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 animate-bounce" />
              <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 animate-bounce [animation-delay:0.2s]" />
              <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 animate-bounce [animation-delay:0.4s]" />
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
      <div className="p-3 border-t border-slate-100 dark:border-slate-900 bg-slate-50/50 dark:bg-slate-950/30">
        <form 
          onSubmit={(e) => {
            e.preventDefault()
            handleSend(inputMsg)
          }}
          className="flex items-center gap-2"
        >
          <Input
            value={inputMsg}
            onChange={(e) => setInputMsg(e.target.value)}
            placeholder={isReadOnly ? "Read-Only: Viewing researcher's chat history" : "Ask anything about the paper's formulas, algorithms or evaluations..."}
            disabled={isResponding || isReadOnly}
            className="flex-1"
          />
          <Button 
            type="submit" 
            disabled={!inputMsg.trim() || isResponding || isReadOnly}
            className="h-10 w-10 p-0 flex items-center justify-center rounded-xl bg-indigo-650 hover:bg-indigo-700 text-white shrink-0 shadow-md shadow-indigo-650/15"
          >
            <Send size={16} />
          </Button>
        </form>
      </div>
    </div>
  )
}
