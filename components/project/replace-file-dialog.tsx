"use client"

import { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useDropzone } from "react-dropzone"
import { createClient } from "@/lib/supabase/client"
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
import { RefreshCw, Upload } from "lucide-react"
import type { FileWithDetails } from "@/lib/types"

interface ReplaceFileDialogProps {
  file: FileWithDetails
}

const ACCEPTED_TYPES = {
  "image/png": [".png"],
  "image/jpeg": [".jpg", ".jpeg"],
  "image/webp": [".webp"],
  "video/mp4": [".mp4"],
  "application/pdf": [".pdf"],
}

export function ReplaceFileDialog({ file }: ReplaceFileDialogProps) {
  const [open, setOpen] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setSelectedFile(acceptedFiles[0])
      setError(null)
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_TYPES,
    maxSize: 100 * 1024 * 1024,
    maxFiles: 1,
  })

  const handleUpload = async () => {
    if (!selectedFile) return

    setIsUploading(true)
    setError(null)

    try {
      // Upload to Vercel Blob
      const formData = new FormData()
      formData.append("file", selectedFile)
      formData.append("projectId", file.project_id)

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        throw new Error("Upload failed")
      }

      const { url } = await response.json()

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
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed")
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o)
        if (!o) {
          setSelectedFile(null)
          setError(null)
        }
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 bg-transparent">
          <RefreshCw className="h-3 w-3" />
          Replace
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Replace file</DialogTitle>
          <DialogDescription>
            Upload a new version of &quot;{file.name}&quot;. This will reset the approval status.
          </DialogDescription>
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
          ) : (
            <>
              <p className="text-sm font-medium">Drop file here or click to browse</p>
              <p className="text-xs text-muted-foreground mt-1">Same file types accepted</p>
            </>
          )}
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleUpload} disabled={isUploading || !selectedFile}>
            {isUploading ? "Uploading..." : "Upload new version"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
