"use client"

import { useState, useCallback } from "react"
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
import { Upload, RefreshCw } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { uploadToSupabaseStorage } from "@/lib/upload-to-supabase"

interface ReplaceFileDialogProps {
  file: {
    id: string
    project_id: string
    name: string
    file_type: string
  }
  onSuccess?: () => void
}

export function ReplaceFileDialog({ file, onSuccess }: ReplaceFileDialogProps) {
  const [open, setOpen] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setSelectedFile(acceptedFiles[0])
      setError(null)
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [".png", ".jpg", ".jpeg", ".webp", ".gif"],
      "application/pdf": [".pdf"],
      "video/*": [".mp4", ".webm", ".mov"],
    },
    maxSize: 50 * 1024 * 1024,
    maxFiles: 1,
  })

  const handleUpload = async () => {
    if (!selectedFile) return

    setIsUploading(true)
    setError(null)

    try {
      const url = await uploadToSupabaseStorage(selectedFile, file.project_id)

      // Create new file version
      const { data: versionRecord, error: versionError } = await supabase
        .from("file_versions")
        .insert({
          file_id: file.id,
          file_url: url,
        })
        .select()
        .single()

      if (versionError) throw versionError

      // Update file with new current version and reset status
      await supabase
        .from("files")
        .update({
          current_version_id: versionRecord.id,
          status: "pending",
          updated_at: new Date().toISOString(),
        })
        .eq("id", file.id)

      setOpen(false)
      setSelectedFile(null)
      onSuccess?.()
    } catch (err) {
      console.error("Upload error:", err)
      setError(err instanceof Error ? err.message : "Upload failed")
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 bg-transparent">
          <RefreshCw className="h-4 w-4" />
          Replace
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Replace file</DialogTitle>
          <DialogDescription>Upload a new version of "{file.name}"</DialogDescription>
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
          {selectedFile ? (
            <p className="text-sm font-medium">{selectedFile.name}</p>
          ) : isDragActive ? (
            <p className="text-sm">Drop file here...</p>
          ) : (
            <p className="text-sm">Drop file here or click to browse</p>
          )}
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleUpload} disabled={!selectedFile || isUploading}>
            {isUploading ? "Uploading..." : "Upload"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
