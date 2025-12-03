"use client"

import { useState, useEffect, useCallback } from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useDropzone } from "react-dropzone"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select"
import {
  CheckCircle2,
  FileText,
  Film,
  Check,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  X,
  Upload,
  MoreHorizontal,
  Pencil,
  Trash2,
  Eye,
  EyeOff,
  ArrowLeft,
  Copy,
  Plus,
  Download,
  Share2,
  ExternalLink,
  Loader2,
  ChevronDown,
} from "lucide-react"
import type { Project, FileWithDetails } from "@/lib/types"
import { formatDistanceToNow } from "date-fns"
import JSZip from "jszip"
import { FileViewer } from "@/components/ui/file-viewer"

interface OwnerProjectViewProps {
  project: Project
  files: FileWithDetails[]
  user: { id: string; email?: string }
}

const ACCEPTED_TYPES = {
  "image/png": [".png"],
  "image/jpeg": [".jpg", ".jpeg"],
  "image/webp": [".webp"],
  "video/mp4": [".mp4"],
  "application/pdf": [".pdf"],
}

type FilterStatus = "all" | "pending" | "approved" | "needs_changes"

export function OwnerProjectView({ project: initialProject, files: initialFiles }: OwnerProjectViewProps) {
  const router = useRouter()
  const [files, setFiles] = useState(initialFiles)
  const [project, setProject] = useState(initialProject) // Use local state for project to allow updates
  const [showToast, setShowToast] = useState<string | null>(null)
  const [reviewingIndex, setReviewingIndex] = useState<number | null>(null)
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<{ name: string; status: "uploading" | "done" | "error" }[]>([])
  const [showUploadStatus, setShowUploadStatus] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [copied, setCopied] = useState(false)
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all")
  const [showUploadPanel, setShowUploadPanel] = useState(false)
  const [pendingUploads, setPendingUploads] = useState<File[]>([])
  const [showShareDialog, setShowShareDialog] = useState(false)
  const [showDownloadDialog, setShowDownloadDialog] = useState(false)
  const [passwordEnabled, setPasswordEnabled] = useState(!!project.password)
  const [password, setPassword] = useState(project.password || "")
  const [isSavingPassword, setIsSavingPassword] = useState(false)
  const [showUploadVersionDialog, setShowUploadVersionDialog] = useState(false)
  const [versionUploadFile, setVersionUploadFile] = useState<File | null>(null)
  const [versionUploadStatus, setVersionUploadStatus] = useState<"idle" | "uploading" | "done" | "error">("idle")
  const supabase = createClient()

  const totalFiles = files.length
  const approvedCount = files.filter((f) => f.status === "approved").length
  const needsChangesCount = files.filter((f) => f.status === "needs_changes").length
  const pendingCount = files.filter((f) => f.status === "pending").length
  const progress = totalFiles > 0 ? Math.round((approvedCount / totalFiles) * 100) : 0

  const displayFiles = filterStatus === "all" ? files : files.filter((f) => f.status === filterStatus)

  const currentFile = reviewingIndex !== null ? displayFiles[reviewingIndex] : null

  const selectedVersion = currentFile?.versions?.find((v) => v.id === selectedVersionId) || currentFile?.current_version
  const fileUrl = selectedVersion?.file_url
  const isViewingOldVersion = selectedVersionId && selectedVersionId !== currentFile?.current_version_id

  const versionFeedback = currentFile?.feedback?.filter((fb) => fb.file_version_id === selectedVersion?.id) || []

  const hasPrev = reviewingIndex !== null && reviewingIndex > 0
  const hasNext = reviewingIndex !== null && reviewingIndex < displayFiles.length - 1

  const shareUrl =
    typeof window !== "undefined" ? `${window.location.origin}/p/${project.share_id}` : `/p/${project.share_id}`

  useEffect(() => {
    if (reviewingIndex !== null) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = ""
    }
    return () => {
      document.body.style.overflow = ""
    }
  }, [reviewingIndex])

  useEffect(() => {
    setFiles(initialFiles)
  }, [initialFiles])

  const currentFileId = currentFile?.id
  useEffect(() => {
    if (currentFile) {
      setSelectedVersionId(currentFile.current_version_id)
    }
  }, [currentFileId, currentFile])

  const toast = (message: string) => {
    setShowToast(message)
    setTimeout(() => setShowToast(null), 2000)
  }

  const copyShareLink = () => {
    navigator.clipboard.writeText(shareUrl)
    setCopied(true)
    toast("Link copied!")
    setTimeout(() => setCopied(false), 2000)
  }

  const handleSavePassword = async () => {
    setIsSavingPassword(true)
    await supabase
      .from("projects")
      .update({ password: passwordEnabled ? password : null })
      .eq("id", project.id)
    setProject((prev) => ({ ...prev, password: passwordEnabled ? password : null })) // Update local state
    setIsSavingPassword(false)
    toast("Settings saved")
  }

  const openReview = useCallback((index: number) => {
    setReviewingIndex(index)
  }, [])

  const closeReview = useCallback(() => {
    setReviewingIndex(null)
    setSelectedVersionId(null)
  }, [])

  const navigateToPrev = useCallback(() => {
    if (hasPrev && reviewingIndex !== null) {
      setReviewingIndex(reviewingIndex - 1)
      setSelectedVersionId(null)
    }
  }, [hasPrev, reviewingIndex])

  const navigateToNext = useCallback(() => {
    if (hasNext && reviewingIndex !== null) {
      setReviewingIndex(reviewingIndex + 1)
      setSelectedVersionId(null)
    }
  }, [hasNext, reviewingIndex])

  useEffect(() => {
    if (reviewingIndex === null) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLInputElement) return
      if (e.key === "ArrowLeft") navigateToPrev()
      if (e.key === "ArrowRight") navigateToNext()
      if (e.key === "Escape") closeReview()
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [reviewingIndex, navigateToPrev, navigateToNext, closeReview])

  const handleToggleActive = async () => {
    const { data, error } = await supabase
      .from("projects")
      .update({ is_active: !project.is_active })
      .eq("id", project.id)
      .select()
      .single()
    if (error) {
      console.error("Error toggling project active status:", error)
      toast("Failed to toggle link status")
      return
    }
    setProject((prev) => ({ ...prev, is_active: data.is_active }))
    toast(data.is_active ? "Link activated" : "Link deactivated")
    router.refresh()
  }

  const handleDelete = async () => {
    setIsDeleting(true)
    await supabase.from("projects").delete().eq("id", project.id)
    router.push("/dashboard")
  }

  const handleDeleteFile = async (fileId: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== fileId))
    closeReview()
    toast("File deleted")
    await supabase.from("files").delete().eq("id", fileId)
  }

  const handleDownloadFile = async (url: string, filename: string) => {
    try {
      const response = await fetch(url)
      const blob = await response.blob()
      const downloadUrl = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = downloadUrl
      a.download = filename
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(downloadUrl)
      document.body.removeChild(a)
      toast("Download started")
    } catch {
      toast("Download failed")
    }
  }

  const handleDownloadAll = async () => {
    toast("Preparing download...")

    const zip = new JSZip()

    for (const file of files) {
      if (file.current_version?.file_url) {
        try {
          const response = await fetch(file.current_version.file_url)
          const blob = await response.blob()
          zip.file(file.name, blob)
        } catch (error) {
          console.error("Failed to add file to zip:", file.name, error)
        }
      }
    }

    const zipBlob = await zip.generateAsync({ type: "blob" })
    const url = URL.createObjectURL(zipBlob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${project.name.replace(/[^a-z0-9]/gi, "_")}_files.zip`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    toast("Download complete")
  }

  const onDropNewFiles = useCallback((acceptedFiles: File[]) => {
    setPendingUploads((prev) => [...prev, ...acceptedFiles])
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: onDropNewFiles,
    accept: ACCEPTED_TYPES,
    maxSize: 100 * 1024 * 1024,
    noClick: !showUploadPanel,
    noDrag: !showUploadPanel,
  })

  const handleUploadNewFiles = async () => {
    if (pendingUploads.length === 0) return
    setIsUploading(true)
    setShowUploadPanel(false)
    setShowUploadStatus(true)
    setUploadProgress(pendingUploads.map((f) => ({ name: f.name, status: "uploading" })))

    for (let i = 0; i < pendingUploads.length; i++) {
      const file = pendingUploads[i]
      try {
        const formData = new FormData()
        formData.append("file", file)
        formData.append("projectId", project.id)

        const response = await fetch("/api/upload", { method: "POST", body: formData })
        if (!response.ok) throw new Error("Upload failed")

        const { url } = await response.json()

        const fileType = file.type.startsWith("image/") ? "image" : file.type.startsWith("video/") ? "video" : "pdf"

        const { data: fileRecord } = await supabase
          .from("files")
          .insert({ project_id: project.id, name: file.name, file_type: fileType, status: "pending" })
          .select()
          .single()

        if (fileRecord) {
          const { data: versionRecord } = await supabase
            .from("file_versions")
            .insert({ file_id: fileRecord.id, file_url: url })
            .select()
            .single()

          if (versionRecord) {
            await supabase.from("files").update({ current_version_id: versionRecord.id }).eq("id", fileRecord.id)

            setFiles((prev) => [
              {
                ...fileRecord,
                current_version_id: versionRecord.id,
                current_version: versionRecord,
                versions: [versionRecord],
                feedback: [],
              },
              ...prev,
            ])
          }
        }

        setUploadProgress((prev) => prev.map((p, idx) => (idx === i ? { ...p, status: "done" } : p)))
      } catch (error) {
        console.error("Upload error:", error)
        setUploadProgress((prev) => prev.map((p, idx) => (idx === i ? { ...p, status: "error" } : p)))
      }
    }

    setPendingUploads([])
    setIsUploading(false)
  }

  const handleUploadNewVersion = async () => {
    if (!currentFile || !versionUploadFile) return
    setVersionUploadStatus("uploading")

    try {
      const formData = new FormData()
      formData.append("file", versionUploadFile)
      formData.append("projectId", project.id)

      const response = await fetch("/api/upload", { method: "POST", body: formData })
      if (!response.ok) throw new Error("Upload failed")

      const { url } = await response.json()

      const { data: versionRecord } = await supabase
        .from("file_versions")
        .insert({ file_id: currentFile.id, file_url: url })
        .select()
        .single()

      if (versionRecord) {
        await supabase
          .from("files")
          .update({ current_version_id: versionRecord.id, status: "pending" })
          .eq("id", currentFile.id)

        setFiles((prev) =>
          prev.map((f) => {
            if (f.id === currentFile.id) {
              return {
                ...f,
                current_version_id: versionRecord.id,
                current_version: versionRecord,
                versions: [versionRecord, ...(f.versions || [])],
                status: "pending",
              }
            }
            return f
          }),
        )

        setSelectedVersionId(versionRecord.id)
        setVersionUploadStatus("done")

        setTimeout(() => {
          setShowUploadVersionDialog(false)
          setVersionUploadFile(null)
          setVersionUploadStatus("idle")
        }, 1000)
      }
    } catch (error) {
      setVersionUploadStatus("error")
    }
  }

  const currentFileVersions = currentFile?.versions || []
  const currentFileUrl = selectedVersion?.file_url

  const renderFilePreview = () => {
    if (!currentFileUrl || !currentFile)
      return (
        <div className="flex items-center justify-center h-full">
          <p className="text-muted-foreground">No preview available</p>
        </div>
      )

    return <FileViewer fileUrl={currentFileUrl} fileName={currentFile.name} fileType={currentFile.file_type} />
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Toast */}
      {showToast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[60] bg-foreground text-background px-4 py-2 rounded-full text-sm font-medium shadow-lg animate-in fade-in slide-in-from-top-2 duration-200 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4" />
          {showToast}
        </div>
      )}

      {/* Header - full width background, constrained content */}
      <header className="border-b border-border">
        <div className="max-w-[1280px] mx-auto px-4 py-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
            <Link href="/dashboard" className="flex items-center gap-1 hover:text-foreground transition-colors">
              <ArrowLeft className="h-4 w-4" />
              Projects
            </Link>
          </div>

          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold">{project.name}</h1>
                <Badge variant={project.is_active ? "default" : "secondary"}>
                  {project.is_active ? "Active" : "Inactive"}
                </Badge>
              </div>
              {project.description && <p className="text-muted-foreground">{project.description}</p>}
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                className="gap-2 bg-transparent cursor-pointer"
                onClick={() => setShowShareDialog(true)}
              >
                <Share2 className="h-4 w-4" />
                Share
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link href={`/p/${project.share_id}`} target="_blank" className="gap-2">
                  <Eye className="h-4 w-4" />
                  Preview
                </Link>
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon" className="cursor-pointer bg-transparent">
                    <Download className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleDownloadAll} className="cursor-pointer">
                    <Download className="mr-2 h-4 w-4" />
                    Download all files
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon" className="cursor-pointer bg-transparent">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() => router.push(`/dashboard/projects/${project.id}/edit`)}
                    className="cursor-pointer"
                  >
                    <Pencil className="mr-2 h-4 w-4" />
                    Edit project
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleToggleActive} className="cursor-pointer">
                    {project.is_active ? (
                      <>
                        <EyeOff className="mr-2 h-4 w-4" />
                        Deactivate link
                      </>
                    ) : (
                      <>
                        <Eye className="mr-2 h-4 w-4" />
                        Activate link
                      </>
                    )}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => setShowDeleteDialog(true)}
                    className="text-destructive cursor-pointer"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete project
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      {/* Progress bar */}
      <div className="border-b border-border">
        <div className="max-w-[1280px] mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-green-500" />
                <span className="text-sm">{approvedCount} approved</span>
              </div>
              {needsChangesCount > 0 && (
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-amber-500" />
                  <span className="text-sm">{needsChangesCount} needs changes</span>
                </div>
              )}
              {pendingCount > 0 && (
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-muted-foreground" />
                  <span className="text-sm">{pendingCount} pending</span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">{progress}%</span>
                <Progress value={progress} className="w-24 h-2" />
              </div>
              <Button onClick={() => setShowUploadPanel(true)} className="gap-2 cursor-pointer">
                <Upload className="h-4 w-4" />
                Upload Files
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="border-b border-border">
        <div className="max-w-[1280px] mx-auto px-4">
          <div className="flex items-center gap-1 py-2">
            {[
              { value: "all", label: "All", count: totalFiles },
              { value: "pending", label: "Pending", count: pendingCount },
              { value: "approved", label: "Approved", count: approvedCount },
              { value: "needs_changes", label: "Needs Changes", count: needsChangesCount },
            ].map((tab) => (
              <button
                key={tab.value}
                onClick={() => setFilterStatus(tab.value as FilterStatus)}
                className={`px-3 py-2 text-sm rounded-md transition-colors cursor-pointer ${
                  filterStatus === tab.value
                    ? "bg-foreground text-background font-medium"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                {tab.label} ({tab.count})
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* File grid */}
      <main className="max-w-[1280px] mx-auto px-4 py-8">
        {displayFiles.length === 0 ? (
          <div className="text-center py-16">
            <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <Upload className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium mb-2">
              {filterStatus === "all" ? "No files yet" : `No ${filterStatus.replace("_", " ")} files`}
            </h3>
            <p className="text-muted-foreground mb-4">
              {filterStatus === "all"
                ? "Upload files to share with your client for review."
                : "Files with this status will appear here."}
            </p>
            {filterStatus === "all" && (
              <Button onClick={() => setShowUploadPanel(true)} className="gap-2 cursor-pointer">
                <Upload className="h-4 w-4" />
                Upload Files
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {displayFiles.map((file, index) => {
              const thumbnailUrl = file.current_version?.file_url
              const isApproved = file.status === "approved"
              const needsChanges = file.status === "needs_changes"
              const versionCount = file.versions?.length || 1
              return (
                <Card
                  key={file.id}
                  className="overflow-hidden group cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all"
                  onClick={() => openReview(index)}
                >
                  <div className="aspect-square relative bg-muted">
                    {file.file_type === "image" && thumbnailUrl ? (
                      <Image
                        src={thumbnailUrl || "/placeholder.svg"}
                        alt={file.name}
                        fill
                        className="object-cover"
                        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                      />
                    ) : file.file_type === "video" && thumbnailUrl ? (
                      <div className="relative h-full w-full">
                        <video src={thumbnailUrl} className="h-full w-full object-cover" muted />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Film className="h-8 w-8 text-white drop-shadow-lg" />
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <FileText className="h-8 w-8 text-muted-foreground" />
                      </div>
                    )}
                    {isApproved && (
                      <div className="absolute inset-0 bg-green-500/20 flex items-center justify-center">
                        <div className="h-10 w-10 rounded-full bg-green-500 flex items-center justify-center">
                          <Check className="h-6 w-6 text-white" />
                        </div>
                      </div>
                    )}
                    {needsChanges && (
                      <div className="absolute top-2 right-2">
                        <div className="h-6 w-6 rounded-full bg-amber-500 flex items-center justify-center">
                          <AlertCircle className="h-4 w-4 text-white" />
                        </div>
                      </div>
                    )}
                    {versionCount > 1 && (
                      <div className="absolute bottom-2 right-2 bg-background/80 backdrop-blur text-xs px-2 py-1 rounded-full font-medium">
                        v{versionCount}
                      </div>
                    )}
                  </div>
                  <div className="p-2.5">
                    <p className="text-sm font-medium truncate">{file.name}</p>
                    {file.feedback && file.feedback.length > 0 && (
                      <p className="text-xs text-muted-foreground mt-1">{file.feedback.length} feedback</p>
                    )}
                  </div>
                </Card>
              )
            })}
          </div>
        )}
      </main>

      {/* Upload panel overlay */}
      {showUploadPanel && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Upload Files</h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setShowUploadPanel(false)
                  setPendingUploads([])
                }}
                className="cursor-pointer"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                isDragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50"
              }`}
            >
              <input {...getInputProps()} />
              <Upload className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
              {isDragActive ? (
                <p className="text-sm">Drop files here...</p>
              ) : (
                <>
                  <p className="text-sm font-medium">Drop files here or click to browse</p>
                  <p className="text-xs text-muted-foreground mt-1">PNG, JPG, WebP, MP4, PDF up to 100MB</p>
                </>
              )}
            </div>

            {pendingUploads.length > 0 && (
              <div className="mt-4 space-y-2 max-h-40 overflow-auto">
                {pendingUploads.map((file, index) => (
                  <div key={index} className="flex items-center gap-3 p-2 bg-muted rounded-lg text-sm">
                    <span className="truncate flex-1">{file.name}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 shrink-0 cursor-pointer"
                      onClick={() => setPendingUploads((prev) => prev.filter((_, i) => i !== index))}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end gap-2 mt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setShowUploadPanel(false)
                  setPendingUploads([])
                }}
                className="cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                onClick={handleUploadNewFiles}
                disabled={isUploading || pendingUploads.length === 0}
                className="cursor-pointer"
              >
                {isUploading ? "Uploading..." : `Upload ${pendingUploads.length} file(s)`}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Upload status popup */}
      {showUploadStatus && uploadProgress.length > 0 && (
        <div className="fixed bottom-4 right-4 z-[60] bg-background border border-border rounded-lg shadow-lg p-4 w-80">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold">Uploading files</h3>
            {!isUploading && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 cursor-pointer"
                onClick={() => setShowUploadStatus(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          <div className="space-y-2 max-h-40 overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            {uploadProgress.map((file, idx) => (
              <div key={idx} className="flex items-center gap-2 text-sm">
                {file.status === "uploading" && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
                {file.status === "done" && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                {file.status === "error" && <AlertCircle className="h-4 w-4 text-destructive" />}
                <span className="truncate flex-1">{file.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Review overlay */}
      {reviewingIndex !== null && currentFile && (
        <div className="fixed inset-0 z-50 bg-background flex flex-col overflow-hidden" style={{ overflow: "hidden" }}>
          {/* Top bar */}
          <header className="h-14 border-b border-border flex items-center justify-between px-4 shrink-0">
            <button
              onClick={closeReview}
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
              <span className="text-sm hidden sm:inline">Back to files</span>
            </button>
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium">
                {reviewingIndex + 1} of {displayFiles.length}
              </span>
              {isViewingOldVersion && (
                <Badge variant="outline" className="border-amber-500 text-amber-600">
                  Viewing old version
                </Badge>
              )}
              {!isViewingOldVersion && (
                <Badge
                  variant={
                    currentFile.status === "approved"
                      ? "default"
                      : currentFile.status === "needs_changes"
                        ? "outline"
                        : "secondary"
                  }
                  className={currentFile.status === "needs_changes" ? "border-amber-500 text-amber-600" : ""}
                >
                  {currentFile.status === "needs_changes"
                    ? "Needs Changes"
                    : currentFile.status === "approved"
                      ? "Approved"
                      : "Pending"}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              {currentFileUrl && (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 cursor-pointer bg-transparent"
                  onClick={() => handleDownloadFile(currentFileUrl, currentFile.name)}
                >
                  <Download className="h-4 w-4" />
                </Button>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="cursor-pointer bg-transparent">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() => handleDeleteFile(currentFile.id)}
                    className="text-destructive cursor-pointer"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete file
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>

          {/* Main content */}
          <div className="flex-1 flex overflow-hidden">
            {/* File preview area */}
            <div className="flex-1 relative bg-muted/30 flex flex-col overflow-hidden">
              {/* Navigation */}
              <button
                onClick={navigateToPrev}
                disabled={!hasPrev}
                className="absolute left-2 top-1/2 -translate-y-1/2 z-10 h-12 w-12 rounded-full bg-background/90 shadow-lg flex items-center justify-center opacity-80 hover:opacity-100 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
              <button
                onClick={navigateToNext}
                disabled={!hasNext}
                className="absolute right-2 top-1/2 -translate-y-1/2 z-10 h-12 w-12 rounded-full bg-background/90 shadow-lg flex items-center justify-center opacity-80 hover:opacity-100 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
              >
                <ChevronRight className="h-6 w-6" />
              </button>

              <div className="flex-1 overflow-hidden">{renderFilePreview()}</div>
            </div>

            {/* Sidebar */}
            <div className="w-80 border-l border-border flex flex-col shrink-0 overflow-hidden">
              {/* File info */}
              <div className="p-4 border-b border-border shrink-0">
                <h3 className="font-semibold truncate">{currentFile.name}</h3>
                <div className="flex items-center gap-2 mt-2">
                  {isViewingOldVersion ? (
                    <span className="text-xs bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 px-2 py-1 rounded-full">
                      Viewing old version
                    </span>
                  ) : (
                    <>
                      {currentFile.status === "approved" && (
                        <span className="text-xs bg-green-100 dark:bg-green-950/50 text-green-700 dark:text-green-400 px-2 py-1 rounded-full">
                          Approved
                        </span>
                      )}
                      {currentFile.status === "needs_changes" && (
                        <span className="text-xs bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 px-2 py-1 rounded-full">
                          Needs Changes
                        </span>
                      )}
                      {currentFile.status === "pending" && (
                        <span className="text-xs bg-muted text-muted-foreground px-2 py-1 rounded-full">
                          Pending Review
                        </span>
                      )}
                    </>
                  )}
                  {currentFileVersions.length > 1 && (
                    <Select
                      value={selectedVersionId || currentFile.current_version_id || ""}
                      onValueChange={(val) => setSelectedVersionId(val)}
                    >
                      <SelectTrigger className="h-auto w-auto gap-0.5 p-0 text-xs text-muted-foreground border-0 bg-transparent hover:text-foreground focus:ring-0 group">
                        <span>
                          v
                          {currentFileVersions.length -
                            currentFileVersions.findIndex(
                              (v) => v.id === (selectedVersionId || currentFile.current_version_id),
                            )}
                        </span>
                        <ChevronDown className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </SelectTrigger>
                      <SelectContent>
                        {currentFileVersions.map((version, idx) => {
                          const versionNum = currentFileVersions.length - idx
                          const isCurrent = version.id === currentFile.current_version_id
                          return (
                            <SelectItem key={version.id} value={version.id} className="text-xs">
                              v{versionNum}
                              {isCurrent ? " (current)" : ""}
                            </SelectItem>
                          )
                        })}
                      </SelectContent>
                    </Select>
                  )}
                  {currentFileVersions.length === 1 && <span className="text-xs text-muted-foreground">v1</span>}
                </div>
              </div>

              <div className="p-4 border-b border-border shrink-0">
                {(currentFile.status === "needs_changes" || currentFile.status === "pending") && (
                  <Button className="w-full gap-2" onClick={() => setShowUploadVersionDialog(true)}>
                    <Upload className="h-4 w-4" />
                    Upload New Version
                  </Button>
                )}

                {currentFile.status === "approved" && !isViewingOldVersion && (
                  <Button
                    variant="outline"
                    className="w-full gap-2 text-muted-foreground bg-transparent"
                    onClick={() => setShowUploadVersionDialog(true)}
                  >
                    <Plus className="h-4 w-4" />
                    Upload revision
                  </Button>
                )}
              </div>

              <div className="flex-1 overflow-auto p-4">
                {currentFile.status === "approved" && !isViewingOldVersion ? (
                  <div className="text-center py-8">
                    <div className="h-16 w-16 rounded-full bg-green-100 dark:bg-green-950/50 flex items-center justify-center mx-auto mb-4">
                      <CheckCircle2 className="h-8 w-8 text-green-600" />
                    </div>
                    <h4 className="font-medium text-green-700 dark:text-green-400">Approved</h4>
                    <p className="text-sm text-muted-foreground mt-1">This file has been approved by the client</p>
                  </div>
                ) : (
                  <>
                    <h4 className="text-sm font-medium mb-3">
                      Feedback{" "}
                      {selectedVersion &&
                        `for v${currentFile.versions?.findIndex((v) => v.id === selectedVersion.id) !== undefined ? currentFile.versions!.length - currentFile.versions!.findIndex((v) => v.id === selectedVersion.id) : 1}`}
                    </h4>
                    {versionFeedback.length > 0 ? (
                      <div className="space-y-3">
                        {versionFeedback.map((fb) => (
                          <div key={fb.id} className="bg-muted rounded-lg p-3">
                            <p className="text-sm">{fb.text}</p>
                            <p className="text-xs text-muted-foreground mt-2">
                              {formatDistanceToNow(new Date(fb.created_at), { addSuffix: true })}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No feedback for this version</p>
                    )}
                  </>
                )}
              </div>

              {/* Thumbnails */}
              <div className="p-3 border-t border-border shrink-0">
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {displayFiles.map((file, idx) => {
                    const thumbUrl = file.current_version?.file_url
                    const isActive = idx === reviewingIndex
                    const isApproved = file.status === "approved"
                    return (
                      <button
                        key={file.id}
                        onClick={() => openReview(idx)}
                        className={`relative h-12 w-12 rounded-md overflow-hidden shrink-0 cursor-pointer transition-all ${
                          isActive ? "ring-2 ring-primary" : "opacity-60 hover:opacity-100"
                        }`}
                      >
                        {file.file_type === "image" && thumbUrl ? (
                          <Image
                            src={thumbUrl || "/placeholder.svg"}
                            alt=""
                            fill
                            className="object-cover"
                            sizes="48px"
                          />
                        ) : (
                          <div className="h-full w-full bg-muted flex items-center justify-center">
                            {file.file_type === "video" ? (
                              <Film className="h-4 w-4" />
                            ) : (
                              <FileText className="h-4 w-4" />
                            )}
                          </div>
                        )}
                        {isApproved && (
                          <div className="absolute inset-0 bg-green-500/30 flex items-center justify-center">
                            <Check className="h-4 w-4 text-white" />
                          </div>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Share project</DialogTitle>
            <DialogDescription>
              Share this link with your client to let them review and approve files.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Share link</Label>
              <div className="flex gap-2">
                <Input value={shareUrl} readOnly className="font-mono text-sm" />
                <Button variant="outline" size="icon" onClick={copyShareLink} className="cursor-pointer bg-transparent">
                  {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                </Button>
                <Button variant="outline" size="icon" asChild>
                  <a href={shareUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Password protection</Label>
                  <p className="text-sm text-muted-foreground">Require a password to access this project</p>
                </div>
                <Switch checked={passwordEnabled} onCheckedChange={setPasswordEnabled} />
              </div>

              {passwordEnabled && (
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="text"
                    placeholder="Enter password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowShareDialog(false)} className="cursor-pointer">
              Close
            </Button>
            <Button onClick={handleSavePassword} disabled={isSavingPassword} className="cursor-pointer">
              {isSavingPassword ? "Saving..." : "Save settings"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete project?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete &quot;{project.name}&quot; and all its files.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="cursor-pointer">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 cursor-pointer"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog
        open={showUploadVersionDialog}
        onOpenChange={(o) => {
          if (!o && versionUploadStatus !== "uploading") {
            setShowUploadVersionDialog(false)
            setVersionUploadFile(null)
            setVersionUploadStatus("idle")
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Upload New Version</DialogTitle>
            <DialogDescription>Upload a new version of "{currentFile?.name}"</DialogDescription>
          </DialogHeader>

          {versionUploadStatus === "idle" && (
            <label className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors hover:border-primary/50 block">
              <Upload className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
              {versionUploadFile ? (
                <p className="text-sm font-medium">{versionUploadFile.name}</p>
              ) : (
                <>
                  <p className="text-sm font-medium">Click to select file</p>
                  <p className="text-xs text-muted-foreground mt-1">PNG, JPG, WebP, MP4, PDF</p>
                </>
              )}
              <input
                type="file"
                className="hidden"
                accept="image/*,video/mp4,application/pdf"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) setVersionUploadFile(file)
                }}
              />
            </label>
          )}

          {versionUploadStatus === "uploading" && (
            <div className="py-8 text-center">
              <Progress value={50} className="h-2 mb-4" />
              <p className="text-sm text-muted-foreground">Uploading...</p>
            </div>
          )}

          {versionUploadStatus === "done" && (
            <div className="py-8 text-center">
              <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-3" />
              <p className="text-sm font-medium text-green-600">Upload complete!</p>
            </div>
          )}

          {versionUploadStatus === "error" && (
            <div className="py-8 text-center">
              <X className="h-12 w-12 text-destructive mx-auto mb-3" />
              <p className="text-sm font-medium text-destructive">Upload failed. Please try again.</p>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowUploadVersionDialog(false)
                setVersionUploadFile(null)
                setVersionUploadStatus("idle")
              }}
              disabled={versionUploadStatus === "uploading"}
            >
              Cancel
            </Button>
            <Button onClick={handleUploadNewVersion} disabled={!versionUploadFile || versionUploadStatus !== "idle"}>
              Upload
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
