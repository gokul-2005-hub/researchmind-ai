import React, { useRef, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { usePapers } from "@/hooks/usePapers"
import { Button } from "@/components/ui/Button"
import { UploadCloud, CheckCircle2, AlertCircle, RefreshCw } from "lucide-react"

export const FileUploader: React.FC = () => {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { uploadPaper } = usePapers()
  
  const [dragActive, setDragActive] = useState(false)
  const [status, setStatus] = useState<"idle" | "uploading" | "success" | "error">("idle")
  const [errorMsg, setErrorMsg] = useState("")
  const [fileName, setFileName] = useState("")

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const processFile = async (file: File) => {
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      setStatus("error")
      setErrorMsg("Only PDF documents are supported.")
      return
    }

    setFileName(file.name)
    setStatus("uploading")
    setErrorMsg("")

    try {
      await uploadPaper(file)
      setStatus("success")
    } catch (err: any) {
      setStatus("error")
      setErrorMsg(err.response?.data?.detail || err.message || "Failed to process PDF.")
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0])
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0])
    }
  }

  const handleAreaClick = () => {
    fileInputRef.current?.click()
  }

  return (
    <div className="w-full max-w-xl mx-auto">
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf"
        className="hidden"
        onChange={handleFileChange}
      />
      
      <motion.div
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        onClick={status === "idle" || status === "error" || status === "success" ? handleAreaClick : undefined}
        whileHover={status === "idle" ? { scale: 1.005, y: -1 } : {}}
        whileTap={status === "idle" ? { scale: 0.995 } : {}}
        className={`border border-dashed rounded-3xl p-10 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-300 relative overflow-hidden bg-white/40 dark:bg-slate-900/10 backdrop-blur-md ${
          dragActive 
            ? "border-brand-500 bg-brand-500/5 dark:bg-brand-500/5" 
            : "border-slate-350 dark:border-slate-800 hover:border-brand-500/50 dark:hover:border-brand-500/30"
        } ${
          status === "uploading" ? "pointer-events-none opacity-90" : ""
        }`}
      >
        <AnimatePresence mode="wait">
          {status === "idle" && (
            <motion.div
              key="idle"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex flex-col items-center"
            >
              <div className="h-14 w-14 rounded-2xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-600 dark:text-brand-400 mb-5 shadow-sm">
                <UploadCloud size={26} />
              </div>
              <h3 className="font-bold text-sm mb-2 text-slate-800 dark:text-slate-200">Upload research literature</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs leading-relaxed">
                Drag & drop your PDF file here, or click to browse files from your computer. (Max size 10MB)
              </p>
            </motion.div>
          )}

          {status === "uploading" && (
            <motion.div
              key="uploading"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex flex-col items-center w-full"
            >
              <div className="h-14 w-14 rounded-2xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-600 dark:text-brand-400 mb-5 shadow-sm">
                <RefreshCw size={24} className="animate-spin text-brand-500" />
              </div>
              <h4 className="font-bold text-sm mb-2 text-slate-800 dark:text-slate-200">Analyzing Document Structure</h4>
              <p className="text-xs text-slate-500 dark:text-slate-450 truncate max-w-sm px-4">
                Processing: <span className="font-semibold text-slate-700 dark:text-slate-300">{fileName}</span>
              </p>
              <div className="w-52 h-1 bg-slate-200 dark:bg-slate-800 rounded-full mt-5 overflow-hidden relative">
                <motion.div
                  className="h-full bg-brand-600 dark:bg-brand-500 rounded-full absolute left-0 top-0"
                  animate={{
                    left: ["-100%", "100%"],
                  }}
                  transition={{
                    repeat: Infinity,
                    duration: 1.5,
                    ease: "easeInOut",
                  }}
                  style={{ width: "60%" }}
                />
              </div>
            </motion.div>
          )}

          {status === "success" && (
            <motion.div
              key="success"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex flex-col items-center"
            >
              <div className="h-14 w-14 rounded-2xl bg-emerald-500/10 dark:bg-emerald-500/20 border border-emerald-500/20 flex items-center justify-center text-emerald-500 mb-5 shadow-sm">
                <CheckCircle2 size={26} />
              </div>
              <h4 className="font-bold text-sm mb-2 text-slate-800 dark:text-slate-200">Ingestion Complete</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-5 max-w-xs truncate px-4">
                {fileName} was analyzed and indexed.
              </p>
              <Button 
                size="sm" 
                variant="outline"
                className="rounded-xl px-4 cursor-pointer text-xs font-semibold"
                onClick={(e) => {
                  e.stopPropagation()
                  setStatus("idle")
                }}
              >
                Upload another
              </Button>
            </motion.div>
          )}

          {status === "error" && (
            <motion.div
              key="error"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex flex-col items-center"
            >
              <div className="h-14 w-14 rounded-2xl bg-red-500/10 dark:bg-red-500/20 border border-red-500/20 flex items-center justify-center text-red-500 mb-5 shadow-sm">
                <AlertCircle size={26} />
              </div>
              <h4 className="font-bold text-sm mb-2 text-slate-800 dark:text-slate-200">Processing Failed</h4>
              <p className="text-xs text-red-500 dark:text-red-400 mb-5 max-w-xs px-4">
                {errorMsg}
              </p>
              <Button 
                size="sm" 
                variant="outline"
                className="rounded-xl px-4 cursor-pointer text-xs font-semibold"
                onClick={(e) => {
                  e.stopPropagation()
                  setStatus("idle")
                }}
              >
                Try again
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}
