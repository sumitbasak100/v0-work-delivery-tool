"use client"

import { useState, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import { useDropzone } from "react-dropzone"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Progress } from "@/components/ui/progress"
import { Upload, X, FileImage, FileText, FileVideo, CheckCircle2, AlertCircle } from "lucide-react"
import { uploadToSupabaseStorage, getFileType } from "@/lib/upload-to-supabase"

interface FileUploaderProps {
  projectId: string
}

interface UploadFile {
  file: File
  progress: number
  status: "pending" | "uploading" | "done" | "error"
  error?: string
}

const ACCEPTED_TYPES = {
  "image/png": [".png"],
  "image/jpeg": [".jpg", ".jpeg"],
  "image/webp": [".webp"],
  "image/gif": [".gif"],
  "application/pdf": [".pdf"],
  "video/mp4": [".mp4"],
  "video/webm": [".webm"],
  "video/quicktime": [".mov"],
}

export function FileUploader({ projectId }: FileUploaderProps) {
  const [open, setOpen] = useState(false)
  const [pendingFiles, setPendingFiles] = useState<UploadFile[]>([])
  const [uploadingFiles, setUploadingFiles] = useState<UploadFile[]>([])
  const isUploadingRef = useRef(false)
  const router = useRouter()

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles = acceptedFiles.map((file) => ({
      file,
      progress: 0,
      status: "pending" as const,
    }))
    setPendingFiles((prev) => [...prev, ...newFiles])
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_TYPES,
    maxSize: 50 * 1024 * 1024,
  })

  const removeFile = (index: number) => {
    setPendingFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith("image/")) return FileImage
    if (mimeType.startsWith("video/")) return FileVideo
    return FileText
  }

  const handleUpload = async () => {
    if (pendingFiles.length === 0) return

    const filesToUpload = pendingFiles.map((f) => ({ ...f }))

    isUploadingRef.current = true
    setUploadingFiles(filesToUpload)
    setPendingFiles([])
    setOpen(false)

    for (let i = 0; i < filesToUpload.length; i++) {
      setUploadingFiles((prev) => prev.map((f, idx) => (idx === i ? { ...f, status: "uploading" as const } : f)))

      try {
        const uploadFile = filesToUpload[i]
        const fileUrl = await uploadToSupabaseStorage(uploadFile.file, projectId, (progress) => {
          const percent = typeof progress.percent === "number" && !isNaN(progress.percent) ? progress.percent : 0
          setUploadingFiles((prev) => prev.map((f, idx) => (idx === i ? { ...f, progress: percent } : f)))
        })

        const response = await fetch("/api/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            projectId,
            fileName: uploadFile.file.name,
            fileType: getFileType(uploadFile.file.type),
            fileUrl,
          }),
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.error || "Failed to save file metadata")
        }

        setUploadingFiles((prev) =>
          prev.map((f, idx) => (idx === i ? { ...f, status: "done" as const, progress: 100 } : f)),
        )
      } catch (error) {
        setUploadingFiles((prev) =>
          prev.map((f, idx) =>
            idx === i
              ? {
                  ...f,
                  status: "error" as const,
                  error: error instanceof Error ? error.message : "Upload failed",
                }
              : f,
          ),
        )
      }
    }

    isUploadingRef.current = false
    router.refresh()

    setTimeout(() => {
      setUploadingFiles([])
    }, 3000)
  }

  const dismissUploadStatus = () => {
    setUploadingFiles([])
  }

  const pendingCount = pendingFiles.length
  const doneCount = uploadingFiles.filter((f) => f.status === "done").length
  const errorCount = uploadingFiles.filter((f) => f.status === "error").length
  const isUploading = uploadingFiles.some((f) => f.status === "uploading" || f.status === "pending")

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(o) => {
          if (!o && !isUploadingRef.current) {
            setPendingFiles([])
          }
          setOpen(o)
        }}
      >
        <DialogTrigger asChild>
          <Button className="gap-2">
            <Upload className="h-4 w-4" />
            Upload
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Upload files</DialogTitle>
            <DialogDescription>Upload images, PDFs, or videos for your client to review.</DialogDescription>
          </DialogHeader>

          <div
            {...getRootProps()}
            className={`
              border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
              ${isDragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50"}
            `}
          >
            <input {...getInputProps()} />
            <Upload className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
            {isDragActive ? (
              <p className="text-sm">Drop files here...</p>
            ) : (
              <>
                <p className="text-sm font-medium">Drop files here or click to browse</p>
                <p className="text-xs text-muted-foreground mt-1">
                  PNG, JPG, WebP, GIF, PDF, MP4, WebM, MOV up to 50MB
                </p>
              </>
            )}
          </div>

          {pendingFiles.length > 0 && (
            <div className="space-y-2 max-h-60 overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
              {pendingFiles.map((uploadFile, index) => {
                const Icon = getFileIcon(uploadFile.file.type)
                return (
                  <div key={index} className="flex items-center gap-3 p-2 bg-muted rounded-lg">
                    <Icon className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{uploadFile.file.name}</p>
                      <span className="text-xs text-muted-foreground">
                        {(uploadFile.file.size / 1024 / 1024).toFixed(1)} MB
                      </span>
                    </div>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeFile(index)}>
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                )
              })}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpload} disabled={pendingCount === 0}>
              Upload {pendingCount} file{pendingCount !== 1 ? "s" : ""}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {uploadingFiles.length > 0 && (
        <div className="fixed bottom-4 right-4 z-50 w-80 bg-background border rounded-lg shadow-lg overflow-hidden">
          <div className="flex items-center justify-between p-3 border-b bg-muted/50">
            <span className="text-sm font-medium">
              {isUploading
                ? `Uploading ${doneCount}/${uploadingFiles.length}...`
                : errorCount > 0
                  ? `${doneCount} uploaded, ${errorCount} failed`
                  : `${doneCount} file${doneCount !== 1 ? "s" : ""} uploaded`}
            </span>
            <Button variant="ghost" size="icon" className="h-6 w-6 cursor-pointer" onClick={dismissUploadStatus}>
              <X className="h-3 w-3" />
            </Button>
          </div>
          <div className="max-h-60 overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            {uploadingFiles.map((uploadFile, index) => {
              const Icon = getFileIcon(uploadFile.file.type)
              const progressValue =
                typeof uploadFile.progress === "number" && !isNaN(uploadFile.progress) ? uploadFile.progress : 0
              return (
                <div key={index} className="flex items-center gap-3 p-3 border-b last:border-b-0">
                  <Icon className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{uploadFile.file.name}</p>
                    {uploadFile.status === "uploading" && (
                      <>
                        <Progress value={progressValue} className="h-1 mt-1" />
                        <span className="text-xs text-muted-foreground">{progressValue}%</span>
                      </>
                    )}
                    {uploadFile.status === "error" && (
                      <span className="text-xs text-destructive">{uploadFile.error}</span>
                    )}
                  </div>
                  {uploadFile.status === "done" && <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />}
                  {uploadFile.status === "error" && <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0" />}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </>
  )
}
