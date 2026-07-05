import React, { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { authApi } from "@/services/api"
import { useAppStore } from "@/store/useAppStore"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Lock, User, RefreshCw, AlertCircle, Eye, EyeOff, Sparkles, LogIn, UserPlus } from "lucide-react"

export const LoginForm: React.FC = () => {
  const { login } = useAppStore()
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState("")
  const [successMsg, setSuccessMsg] = useState("")
  const [isSignUpMode, setIsSignUpMode] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!username.trim() || !password.trim()) return

    setLoading(true)
    setErrorMsg("")
    setSuccessMsg("")

    try {
      if (isSignUpMode) {
        // Register new user first
        await authApi.register(username, password)
        setSuccessMsg("Registration successful! Logging you in...")
        
        // Auto-login after registration for seamless UX
        const res = await authApi.login(username, password)
        setTimeout(() => {
          login(res.user.id, res.user.username, res.access_token, res.user.role)
        }, 1000)
      } else {
        // Normal login
        const res = await authApi.login(username, password)
        login(res.user.id, res.user.username, res.access_token, res.user.role)
      }
    } catch (err: any) {
      setErrorMsg(
        err.response?.data?.detail || "Connection failure. Ensure backend server is running."
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100 p-4 font-sans select-none relative overflow-hidden">
      {/* Dynamic Animated Background Mesh */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-blue-500/10 blur-[140px] pointer-events-none animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-violet-650/10 blur-[140px] pointer-events-none animate-pulse" />

      {/* Main Glassmorphic Login Card */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="w-full max-w-md p-8 bg-slate-900/40 border border-slate-800/80 backdrop-blur-2xl rounded-3xl shadow-2xl relative z-10"
      >
        {/* Header Logo & Branding */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="h-14 w-14 rounded-2xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-500 mb-4 shadow-lg shadow-brand-500/5 relative overflow-hidden">
            <Sparkles className="w-7 h-7 relative z-10" />
            <div className="absolute inset-0 bg-gradient-to-tr from-brand-600/20 to-violet-600/20 opacity-40 blur-xs" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white">
            ResearchMind AI
          </h2>
          <p className="text-xs text-slate-400 mt-2 max-w-[260px] leading-relaxed">
            Collaborative, Multi-Agent Academic Paper Ingestion and Analysis Workspace.
          </p>
        </div>

        {/* Sliding Authentication Tabs */}
        <div className="flex bg-slate-950/80 p-1 rounded-2xl border border-slate-800/60 mb-6 relative">
          <button
            type="button"
            onClick={() => { setIsSignUpMode(false); setErrorMsg(""); setSuccessMsg(""); }}
            className={`flex-1 py-2.5 text-xs font-semibold rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-colors duration-250 relative z-10 ${!isSignUpMode ? 'text-white' : 'text-slate-400 hover:text-slate-200'}`}
          >
            <LogIn size={14} />
            <span>Sign In</span>
            {!isSignUpMode && (
              <motion.div
                layoutId="activeTab"
                className="absolute inset-0 bg-slate-900 border border-slate-800/80 rounded-xl -z-10"
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
              />
            )}
          </button>
          
          <button
            type="button"
            onClick={() => { setIsSignUpMode(true); setErrorMsg(""); setSuccessMsg(""); }}
            className={`flex-1 py-2.5 text-xs font-semibold rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-colors duration-250 relative z-10 ${isSignUpMode ? 'text-white' : 'text-slate-400 hover:text-slate-200'}`}
          >
            <UserPlus size={14} />
            <span>Register</span>
            {isSignUpMode && (
              <motion.div
                layoutId="activeTab"
                className="absolute inset-0 bg-slate-900 border border-slate-800/80 rounded-xl -z-10"
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
              />
            )}
          </button>
        </div>

        {/* Credentials Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Username
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-3.5 text-slate-500">
                <User size={15} />
              </span>
              <Input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username"
                disabled={loading}
                className="pl-10 h-11 bg-slate-950/80 border-slate-800/80 text-slate-100 placeholder-slate-600 focus:border-brand-500 focus:ring-1 focus:ring-brand-500/20 text-xs rounded-xl"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Password
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-3.5 text-slate-500">
                <Lock size={15} />
              </span>
              <Input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                disabled={loading}
                className="pl-10 pr-10 h-11 bg-slate-950/80 border-slate-800/80 text-slate-100 placeholder-slate-600 focus:border-brand-500 focus:ring-1 focus:ring-brand-500/20 text-xs rounded-xl"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-3.5 text-slate-500 hover:text-slate-350 focus:outline-none cursor-pointer"
              >
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          {/* Messages Overlay */}
          <AnimatePresence mode="wait">
            {errorMsg && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex items-center gap-2.5 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-400"
              >
                <AlertCircle size={15} className="shrink-0" />
                <span>{errorMsg}</span>
              </motion.div>
            )}

            {successMsg && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex items-center gap-2.5 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400"
              >
                <RefreshCw size={15} className="shrink-0 animate-spin" />
                <span>{successMsg}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Submit Action Button */}
          <Button
            type="submit"
            disabled={loading || !username.trim() || !password.trim()}
            className="w-full h-11 mt-6 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 shadow-lg shadow-brand-500/15 cursor-pointer relative overflow-hidden transition-all active:scale-[0.98]"
          >
            {loading ? (
              <RefreshCw size={15} className="animate-spin" />
            ) : (
              isSignUpMode ? "Sign Up & Access Workspace" : "Access Workspace"
            )}
          </Button>
        </form>
      </motion.div>
    </div>
  )
}
