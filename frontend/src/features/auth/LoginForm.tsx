import React, { useState } from "react"
import { authApi } from "@/services/api"
import { useAppStore } from "@/store/useAppStore"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Lock, User, RefreshCw, AlertCircle, Sparkles, Eye, EyeOff } from "lucide-react"

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

  const toggleMode = () => {
    setIsSignUpMode(!isSignUpMode)
    setErrorMsg("")
    setSuccessMsg("")
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100 p-4 font-sans select-none relative overflow-hidden">
      {/* Decorative Blur Orbs */}
      <div className="absolute top-1/4 left-1/4 w-72 h-72 rounded-full bg-indigo-550/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-72 h-72 rounded-full bg-indigo-500/5 blur-[120px] pointer-events-none" />

      {/* Main Glassmorphic Login Card */}
      <div className="w-full max-w-md p-8 bg-slate-900/80 border border-slate-800 backdrop-blur-xl rounded-3xl shadow-2xl relative z-10 animate-scale-up">
        {/* Header Branding */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="h-12 w-12 rounded-2xl bg-indigo-650/15 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-3 shadow-md shadow-indigo-600/5 animate-pulse">
            <Sparkles size={24} />
          </div>
          <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-1.5 justify-center">
            {isSignUpMode ? "Create Account" : "ResearchMind AI"}
          </h2>
          <p className="text-[10px] text-slate-400 mt-1 max-w-[240px] leading-relaxed">
            {isSignUpMode 
              ? "Register a new profile to access your custom research workstation."
              : "Intelligent Multi-Agent Research Assistant Workspace."
            }
          </p>
        </div>

        {/* Credentials Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
              Username
            </label>
            <div className="relative">
              <span className="absolute left-3 top-3 text-slate-550">
                <User size={14} />
              </span>
              <Input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder=""
                disabled={loading}
                className="pl-9 bg-slate-950 border-slate-800 text-slate-100 placeholder-slate-650 focus:border-indigo-500 text-xs"
                required
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
              Security Key Password
            </label>
            <div className="relative">
              <span className="absolute left-3 top-3 text-slate-550">
                <Lock size={14} />
              </span>
              <Input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder=""
                disabled={loading}
                className="pl-9 pr-10 bg-slate-950 border-slate-800 text-slate-100 placeholder-slate-650 focus:border-indigo-500 text-xs"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 text-slate-500 hover:text-slate-350 focus:outline-none cursor-pointer"
              >
                {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          {/* Feedback error messages */}
          {errorMsg && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-[10px] text-red-400 animate-shake">
              <AlertCircle size={14} className="shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Feedback success messages */}
          {successMsg && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-[10px] text-emerald-400">
              <RefreshCw size={14} className="shrink-0 animate-spin" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Submit Action */}
          <Button
            type="submit"
            disabled={loading || !username.trim() || !password.trim()}
            className="w-full h-10 mt-6 bg-indigo-650 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/15 cursor-pointer"
          >
            {loading ? (
              <RefreshCw size={14} className="animate-spin" />
            ) : (
              isSignUpMode ? "Sign Up & Register" : "Access Workspace"
            )}
          </Button>
        </form>

        {/* Toggle Mode Footer */}
        <div className="mt-6 text-center">
          <button
            onClick={toggleMode}
            disabled={loading}
            className="text-[10px] font-semibold text-indigo-400 hover:text-indigo-300 transition hover:underline cursor-pointer"
          >
            {isSignUpMode 
              ? "Already have an account? Log In" 
              : "Don't have an account? Sign Up & Register"
            }
          </button>
        </div>


      </div>
    </div>
  )
}
