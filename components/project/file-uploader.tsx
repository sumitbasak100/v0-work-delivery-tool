"use client"

import { useState, useCallback } from "react"
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
import { Upload, X, FileImage, FileText, FileVideo } from "lucide-react"
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
  const [files, setFiles] = useState<UploadFile[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const router = useRouter()

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles = acceptedFiles.map((file) => ({
      file,
      progress: 0,
      status: "pending" as const,
    }))
    setFiles((prev) => [...prev, ...newFiles])
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_TYPES,
    maxSize: 50 * 1024 * 1024,
  })

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith("image/")) return FileImage
    if (mimeType.startsWith("video/")) return FileVideo
    return FileText
  }

  const handleUpload = async () => {
    setIsUploading(true)

    for (let i = 0; i < files.length; i++) {
      const uploadFile = files[i]
      if (uploadFile.status !== "pending") continue

      setFiles((prev) => prev.map((f, idx) => (idx === i ? { ...f, status: "uploading" as const } : f)))

      try {
        // Step 1: Upload file directly to Supabase Storage
        const fileUrl = await uploadToSupabaseStorage(uploadFile.file, projectId, (progress) => {
          setFiles((prev) => prev.map((f, idx) => (idx === i ? { ...f, progress: progress.percent } : f)))
        })

        // Step 2: Send only metadata to API to create database records
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

        setFiles((prev) => prev.map((f, idx) => (idx === i ? { ...f, status: "done" as const, progress: 100 } : f)))
      } catch (error) {
        setFiles((prev) =>
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

    setIsUploading(false)
    router.refresh()

    const allDone = files.every((f) => f.status === "done" || f.status === "error")
    if (allDone) {
      setTimeout(() => {
        setOpen(false)
        setFiles([])
      }, 1000)
    }
  }

  const pendingCount = files.filter((f) => f.status === "pending").length
  const doneCount = files.filter((f) => f.status === "done").length

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o)
        if (!o) setFiles([])
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
              <p className="text-xs text-muted-foreground mt-1">PNG, JPG, WebP, GIF, PDF, MP4, WebM, MOV up to 50MB</p>
            </>
          )}
        </div>

        {files.length > 0 && (
          <div className="space-y-2 max-h-60 overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            {files.map((uploadFile, index) => {
              const Icon = getFileIcon(uploadFile.file.type)
              return (
                <div key={index} className="flex items-center gap-3 p-2 bg-muted rounded-lg">
                  <Icon className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{uploadFile.file.name}</p>
                    <div className="flex items-center gap-2">
                      {uploadFile.status === "uploading" && (
                        <Progress value={uploadFile.progress} className="h-1 flex-1" />
                      )}
                      {uploadFile.status === "done" && <span className="text-xs text-green-600">Uploaded</span>}
                      {uploadFile.status === "error" && (
                        <span className="text-xs text-destructive">{uploadFile.error}</span>
                      )}
                      {uploadFile.status === "pending" && (
                        <span className="text-xs text-muted-foreground">
                          {(uploadFile.file.size / 1024 / 1024).toFixed(1)} MB
                        </span>
                      )}
                    </div>
                  </div>
                  {uploadFile.status === "pending" && (
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeFile(index)}>
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              )
            })}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleUpload} disabled={isUploading || pendingCount === 0}>
            {isUploading
              ? `Uploading ${doneCount}/${files.length}...`
              : `Upload ${pendingCount} file${pendingCount !== 1 ? "s" : ""}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
