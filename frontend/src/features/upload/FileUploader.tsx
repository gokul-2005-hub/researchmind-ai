import React, { useRef, useState } from "react"
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
      
      <div
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        onClick={status === "idle" || status === "error" || status === "success" ? handleAreaClick : undefined}
        className={`border-2 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-300 ${
          dragActive 
            ? "border-indigo-500 bg-indigo-50/5 dark:bg-indigo-500/5 scale-[1.01]" 
            : "border-slate-300 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-700 hover:bg-slate-50/50 dark:hover:bg-slate-900/30"
        } ${
          status === "uploading" ? "pointer-events-none opacity-80" : ""
        }`}
      >
        {status === "idle" && (
          <>
            <div className="h-12 w-12 rounded-xl bg-slate-100 dark:bg-slate-900 flex items-center justify-center text-slate-500 dark:text-slate-400 mb-4 border border-slate-200/50 dark:border-slate-850">
              <UploadCloud size={24} />
            </div>
            <h3 className="font-semibold text-sm mb-1 text-slate-800 dark:text-slate-200">Upload research literature</h3>
            <p className="text-xs text-slate-400 dark:text-slate-500 max-w-xs leading-relaxed">
              Drag & drop your PDF file here, or click to browse files from your computer. (Max size 10MB)
            </p>
          </>
        )}

        {status === "uploading" && (
          <div className="flex flex-col items-center">
            <RefreshCw size={32} className="text-indigo-500 animate-spin mb-4" />
            <h4 className="font-semibold text-sm mb-1 text-slate-800 dark:text-slate-200">Analyzing Document Structure</h4>
            <p className="text-xs text-slate-400 dark:text-slate-500 truncate max-w-sm">
              Processing: <span className="font-medium text-slate-500 dark:text-slate-350">{fileName}</span>
            </p>
            <div className="w-48 h-1 bg-slate-200 dark:bg-slate-800 rounded-full mt-4 overflow-hidden relative">
              <div className="h-full bg-indigo-500 rounded-full absolute left-0 top-0 animate-shimmer w-1/2" />
            </div>
          </div>
        )}

        {status === "success" && (
          <div className="flex flex-col items-center">
            <div className="h-12 w-12 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/20 border border-emerald-500/20 flex items-center justify-center text-emerald-500 mb-4 animate-scale-up">
              <CheckCircle2 size={24} />
            </div>
            <h4 className="font-semibold text-sm mb-1 text-slate-800 dark:text-slate-200">Ingestion Complete</h4>
            <p className="text-xs text-slate-400 dark:text-slate-500 mb-4 max-w-xs truncate">
              {fileName} was analyzed and indexed.
            </p>
            <Button 
              size="sm" 
              variant="outline"
              onClick={(e) => {
                e.stopPropagation()
                setStatus("idle")
              }}
            >
              Upload another
            </Button>
          </div>
        )}

        {status === "error" && (
          <div className="flex flex-col items-center">
            <div className="h-12 w-12 rounded-xl bg-red-500/10 dark:bg-red-500/20 border border-red-500/20 flex items-center justify-center text-red-500 mb-4 animate-shake">
              <AlertCircle size={24} />
            </div>
            <h4 className="font-semibold text-sm mb-1 text-slate-800 dark:text-slate-200">Processing Failed</h4>
            <p className="text-xs text-red-500 dark:text-red-400 mb-4 max-w-xs">
              {errorMsg}
            </p>
            <Button 
              size="sm" 
              variant="outline"
              onClick={(e) => {
                e.stopPropagation()
                setStatus("idle")
              }}
            >
              Try again
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
