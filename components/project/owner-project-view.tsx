"use client"

import { useState, useEffect, useCallback } from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useDropzone } from "react-dropzone"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
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
import { uploadToSupabaseStorage, getFileType } from "@/lib/upload-to-supabase"
import { useFileCache } from "@/hooks/use-file-cache"
import { Document, Page, pdfjs } from "react-pdf"
import "react-pdf/dist/Page/AnnotationLayer.css"
import "react-pdf/dist/Page/TextLayer.css"

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`

function PdfThumbnail({ url }: { url: string }) {
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState(false)

  if (error) {
    return (
      <div className="flex items-center justify-center h-full bg-muted">
        <FileText className="h-10 w-10 text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="relative h-full w-full overflow-hidden bg-muted">
      {!loaded && (
        <div className="absolute inset-0 flex items-center justify-center">
          <FileText className="h-10 w-10 text-muted-foreground animate-pulse" />
        </div>
      )}
      <Document
        file={url}
        onLoadSuccess={() => setLoaded(true)}
        onLoadError={() => setError(true)}
        loading={null}
        className="flex items-center justify-center h-full"
      >
        <Page
          pageNumber={1}
          width={200}
          renderTextLayer={false}
          renderAnnotationLayer={false}
          className={loaded ? "opacity-100" : "opacity-0"}
        />
      </Document>
    </div>
  )
}

interface OwnerProjectViewProps {
  project: Project
  files: FileWithDetails[]
  user: { id: string; email?: string }
}

// Define FileWithVersions to resolve the lint error
interface FileWithVersions extends FileWithDetails {
  versions?: {
    id: string
    file_id: string
    file_url: string
    version_number: number
    created_at: string
  }[]
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
  const [files, setFiles] = useState<FileWithVersions[]>(initialFiles as FileWithVersions[]) // Cast to FileWithVersions[]
  const [project, setProject] = useState(initialProject) // Use local state for project to allow updates
  const [showToast, setShowToast] = useState<string | null>(null)
  const [reviewingIndex, setReviewingIndex] = useState<number | null>(null)
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<
    { name: string; status: "uploading" | "done" | "error"; progress?: number }[]
  >([])
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
  const [highlightedFeedbackId, setHighlightedFeedbackId] = useState<string | null>(null)
  // const supabase = createClient() // removed as it causes Failed to fetch errors in preview

  const { getCachedUrl, cacheFile, preloadFile, preloadAllFiles } = useFileCache()
  const [cachedFileUrl, setCachedFileUrl] = useState<string | null>(null)

  const totalFiles = files.length
  const approvedCount = files.filter((f) => f.status === "approved").length
  const needsChangesCount = files.filter((f) => f.status === "needs_changes").length
  const pendingCount = files.filter((f) => f.status === "pending").length
  const progress = totalFiles > 0 ? Math.round((approvedCount / totalFiles) * 100) : 0

  const sortedFiles = [...files].sort((a, b) => {
    const aDate = a.created_at || ""
    const bDate = b.created_at || ""
    return new Date(bDate).getTime() - new Date(aDate).getTime()
  })
  const displayFiles = filterStatus === "all" ? sortedFiles : sortedFiles.filter((f) => f.status === filterStatus)

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
    setFiles(initialFiles as FileWithVersions[]) // Cast to FileWithVersions[]
  }, [initialFiles])

  const currentFileId = currentFile?.id
  useEffect(() => {
    if (currentFile) {
      setSelectedVersionId(currentFile.current_version_id)
    }
  }, [currentFileId, currentFile])

  useEffect(() => {
    if (fileUrl && currentFile) {
      // Cache current file
      cacheFile(fileUrl).then(setCachedFileUrl)

      // Preload adjacent files
      if (reviewingIndex !== null && displayFiles.length > 1) {
        const prevIndex = reviewingIndex > 0 ? reviewingIndex - 1 : displayFiles.length - 1
        const nextIndex = reviewingIndex < displayFiles.length - 1 ? reviewingIndex + 1 : 0

        const prevUrl = displayFiles[prevIndex]?.current_version?.file_url
        const nextUrl = displayFiles[nextIndex]?.current_version?.file_url

        if (prevUrl) preloadFile(prevUrl)
        if (nextUrl) preloadFile(nextUrl)
      }
    } else {
      setCachedFileUrl(null)
    }
  }, [fileUrl, currentFile, reviewingIndex, displayFiles, cacheFile, preloadFile])

  useEffect(() => {
    const allFileUrls = files.map((f) => f.current_version?.file_url).filter((url): url is string => !!url)

    if (allFileUrls.length > 0) {
      preloadAllFiles(allFileUrls)
    }
  }, [files, preloadAllFiles])

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
    // const { error } = await supabase.from("projects").update({ password: passwordEnabled ? password : null }).eq("id", project.id)
    // if (error) {
    //   console.error("Error saving password:", error)
    //   toast("Failed to save settings")
    //   setIsSavingPassword(false)
    //   return
    // }
    setProject((prev) => ({ ...prev, password: passwordEnabled ? password : null })) // Update local state
    setIsSavingPassword(false)
    toast("Settings saved")
  }

  const openReview = useCallback((index: number) => {
    setReviewingIndex(index)
    setHighlightedFeedbackId(null) // Reset highlighted feedback when opening review
  }, [])

  const closeReview = useCallback(() => {
    setReviewingIndex(null)
    setSelectedVersionId(null)
    setHighlightedFeedbackId(null) // Reset highlighted feedback when closing review
  }, [])

  const navigateReview = useCallback(
    (direction: number) => {
      if (reviewingIndex === null) return

      let newIndex = reviewingIndex + direction

      // Wrap around if reaching the ends
      if (newIndex < 0) {
        newIndex = displayFiles.length - 1
      } else if (newIndex >= displayFiles.length) {
        newIndex = 0
      }

      if (newIndex >= 0 && newIndex < displayFiles.length) {
        setReviewingIndex(newIndex)
        setSelectedVersionId(null)
        setHighlightedFeedbackId(null) // Reset highlighted feedback when navigating
      }
    },
    [reviewingIndex, displayFiles.length],
  )

  const handleToggleActive = async () => {
    // const { data, error } = await supabase
    //   .from("projects")
    //   .update({ is_active: !project.is_active })
    //   .eq("id", project.id)
    //   .select()
    //   .single()
    // if (error) {
    //   console.error("Error toggling project active status:", error)
    //   toast("Failed to toggle link status")
    //   return
    // }
    setProject((prev) => ({ ...prev, is_active: !prev.is_active }))
    toast(project.is_active ? "Link activated" : "Link deactivated")
    // router.refresh() // No router.refresh for client components without server components
  }

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      const res = await fetch("/api/deleteProject", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: project.id }),
      })
      if (!res.ok) throw new Error("Delete failed")
      router.push("/dashboard")
    } catch {
      toast("Failed to delete project")
      setIsDeleting(false)
    }
  }

  const handleDeleteFile = async (fileId: string) => {
    try {
      const res = await fetch("/api/deleteFile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileId }),
      })
      if (!res.ok) throw new Error("Delete failed")
      setFiles((prev) => prev.filter((f) => f.id !== fileId))
      closeReview()
      toast("File deleted")
    } catch {
      toast("Failed to delete file")
    }
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
    maxSize: 50 * 1024 * 1024, // Increased to 50MB
    noClick: !showUploadPanel,
    noDrag: !showUploadPanel,
  })

  const handleUploadNewFiles = async (filesToUpload: File[]) => {
    if (filesToUpload.length === 0) return
    setIsUploading(true)
    setShowUploadStatus(true)
    setUploadProgress(filesToUpload.map((f) => ({ name: f.name, status: "uploading" })))

    const uploadedFiles: FileWithVersions[] = []

    for (let i = 0; i < filesToUpload.length; i++) {
      const file = filesToUpload[i]
      try {
        const fileUrl = await uploadToSupabaseStorage(file, project.id, (progress) => {
          setUploadProgress((prev) => prev.map((p, idx) => (idx === i ? { ...p, progress } : p)))
        })

        const fileType = getFileType(file.type)
        const response = await fetch("/api/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            projectId: project.id,
            fileName: file.name,
            fileType,
            fileUrl,
          }),
        })

        if (!response.ok) throw new Error("Upload failed")
        const { fileId, versionId } = await response.json()

        const newFile: FileWithVersions = {
          id: fileId,
          project_id: project.id,
          name: file.name,
          file_type: fileType,
          status: "pending",
          created_at: new Date().toISOString(),
          current_version_id: versionId,
          current_version: {
            id: versionId,
            file_id: fileId,
            file_url: fileUrl,
            version_number: 1,
            created_at: new Date().toISOString(),
          },
          versions: [
            {
              id: versionId,
              file_id: fileId,
              file_url: fileUrl,
              version_number: 1,
              created_at: new Date().toISOString(),
            },
          ],
          feedback: [],
        }
        uploadedFiles.push(newFile)

        setUploadProgress((prev) => prev.map((p, idx) => (idx === i ? { ...p, status: "done" } : p)))
      } catch {
        setUploadProgress((prev) => prev.map((p, idx) => (idx === i ? { ...p, status: "error" } : p)))
      }
    }

    if (uploadedFiles.length > 0) {
      setFiles((prev) => [...uploadedFiles, ...prev])
    }

    setIsUploading(false)
    setTimeout(() => setShowUploadStatus(false), 3000)
    setShowUploadPanel(false)
    setPendingUploads([])
  }

  const handleUploadNewVersion = async () => {
    if (!versionUploadFile || reviewingIndex === null) return
    const file = displayFiles[reviewingIndex]
    if (!file) return

    setVersionUploadStatus("uploading")

    try {
      const fileUrl = await uploadToSupabaseStorage(versionUploadFile, project.id)
      const fileType = getFileType(versionUploadFile.type)

      const response = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: project.id,
          fileId: file.id,
          fileName: versionUploadFile.name,
          fileType,
          fileUrl,
          isNewVersion: true,
        }),
      })

      if (!response.ok) throw new Error("Failed to upload version")
      const { versionId } = await response.json()

      const newVersionNumber = (file.versions?.length || 0) + 1
      const newVersion = {
        id: versionId,
        file_id: file.id,
        file_url: fileUrl,
        created_at: new Date().toISOString(),
      }

      setFiles((prev) =>
        prev.map((f) =>
          f.id === file.id
            ? {
                ...f,
                current_version_id: versionId,
                current_version: newVersion,
                status: "pending",
                versions: [newVersion, ...(f.versions || [])],
              }
            : f,
        ),
      )

      // Keep reviewing the same file, show new version
      setSelectedVersionId(versionId)
      setVersionUploadFile(null)
      setVersionUploadStatus("idle")
      setShowUploadVersionDialog(false)

      toast("Version uploaded")
    } catch (error) {
      console.error("Upload error:", error)
      setVersionUploadStatus("error")
      toast("Failed to upload new version")
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

    return (
      <FileViewer
        fileUrl={currentFileUrl}
        fileName={currentFile.name}
        fileType={currentFile.file_type}
        cachedUrl={cachedFileUrl}
        feedbackWithMarkups={versionFeedback}
        onMarkupHover={setHighlightedFeedbackId}
        highlightedFeedbackId={highlightedFeedbackId}
      />
    )
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

      {/* Header */}
      <header className="border-b border-border bg-card shrink-0">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <Link
                href="/dashboard"
                className="flex items-center gap-1 text-muted-foreground hover:text-foreground text-sm shrink-0"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Back</span>
              </Link>
              <div className="h-4 w-px bg-border" />
              <h1 className="text-lg sm:text-xl font-semibold truncate">{project.name}</h1>
              {!project.is_active && (
                <Badge variant="secondary" className="shrink-0 text-xs">
                  Inactive
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 cursor-pointer bg-transparent"
                onClick={handleDownloadAll}
              >
                <Download className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Download</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 cursor-pointer bg-transparent"
                onClick={() => setShowShareDialog(true)}
              >
                <Share2 className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Share</span>
              </Button>
              {project.share_id && project.is_active && (
                <Button variant="outline" size="sm" asChild className="gap-1.5 cursor-pointer bg-transparent">
                  <Link href={`/p/${project.share_id}`} target="_blank">
                    <ExternalLink className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Preview</span>
                  </Link>
                </Button>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="cursor-pointer bg-transparent">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild className="cursor-pointer">
                    <Link href={`/dashboard/projects/${project.id}/edit`}>
                      <Pencil className="mr-2 h-4 w-4" />
                      Edit project
                    </Link>
                  </DropdownMenuItem>
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

      {/* Stats bar */}
      <div className="border-b border-border bg-muted/30">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 py-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4 text-sm">
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
              <Button onClick={() => setShowUploadPanel(true)} size="sm" className="gap-2 cursor-pointer">
                <Upload className="h-4 w-4" />
                Upload Files
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="border-b border-border">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6">
          <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
            <div className="flex items-center gap-1 py-3 min-w-max">
              {[
                { value: "all", label: "All", count: totalFiles },
                { value: "pending", label: "Pending", count: pendingCount },
                { value: "approved", label: "Approved", count: approvedCount },
                { value: "needs_changes", label: "Needs Changes", count: needsChangesCount },
              ].map((tab) => (
                <button
                  key={tab.value}
                  onClick={() => setFilterStatus(tab.value as FilterStatus)}
                  className={`px-3 py-2 text-sm rounded-md transition-colors cursor-pointer whitespace-nowrap ${
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
      </div>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 py-4 sm:py-6">
          {/* File grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {displayFiles.length === 0 ? (
              <div className="text-center py-16 col-span-full">
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
              displayFiles.map((file, index) => {
                const thumbnailUrl = file.current_version?.file_url
                const isApproved = file.status === "approved"
                const needsChanges = file.status === "needs_changes"
                const versionCount = file.versions?.length || 1
                return (
                  <div
                    key={file.id}
                    className="overflow-hidden rounded-lg border bg-card group cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all"
                    onClick={() => openReview(index)}
                  >
                    <div className="aspect-square relative bg-muted">
                      {file.file_type === "image" && thumbnailUrl ? (
                        <img
                          src={thumbnailUrl || "/placeholder.svg"}
                          alt={file.name}
                          className="h-full w-full object-cover"
                        />
                      ) : file.file_type === "video" && thumbnailUrl ? (
                        <div className="relative h-full w-full">
                          <video src={thumbnailUrl} className="h-full w-full object-cover" muted />
                          <div className="absolute inset-0 flex items-center justify-center">
                            <Film className="h-8 w-8 text-white drop-shadow-lg" />
                          </div>
                        </div>
                      ) : file.file_type === "pdf" && thumbnailUrl ? (
                        <PdfThumbnail url={thumbnailUrl} />
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
                  </div>
                )
              })
            )}
          </div>
        </div>
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
                onClick={() => handleUploadNewFiles(pendingUploads)}
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
                {file.progress !== undefined && (
                  <span className="text-xs text-muted-foreground">{Math.round(file.progress)}%</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Review overlay */}
      {reviewingIndex !== null && currentFile && (
        <div className="fixed inset-0 z-50 bg-background flex flex-col overflow-hidden" style={{ overflow: "hidden" }}>
          {/* Top bar */}
          <header className="h-12 sm:h-14 border-b border-border flex items-center justify-between px-3 sm:px-4 shrink-0 bg-background gap-3 sm:gap-4">
            <button
              onClick={closeReview}
              className="flex items-center gap-1 sm:gap-2 text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <X className="h-5 w-5" />
              <span className="text-sm hidden sm:inline">Close</span>
            </button>
            <div className="flex items-center gap-2 sm:gap-3">
              <span className="text-xs sm:text-sm font-medium">
                {reviewingIndex + 1} of {displayFiles.length}
              </span>
              {isViewingOldVersion && (
                <Badge variant="outline" className="border-amber-500 text-amber-600 text-xs sm:text-sm">
                  Viewing old version
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              {currentFileUrl && (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 cursor-pointer bg-transparent h-8 w-8 sm:h-auto sm:w-auto"
                  onClick={() => handleDownloadFile(currentFileUrl, currentFile.name)}
                >
                  <Download className="h-4 w-4" />
                  <span className="hidden sm:inline">Download</span>
                </Button>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="cursor-pointer bg-transparent h-8 w-8 sm:h-auto sm:w-auto"
                  >
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

          {/* Content */}
          <div className="flex-1 flex overflow-hidden relative">
            {/* File viewer */}
            <div className="flex-1 overflow-hidden">{renderFilePreview()}</div>

            {/* Sidebar */}
            <div className="hidden md:flex w-72 lg:w-80 border-l border-border flex-col shrink-0 bg-background">
              {/* File info - Reduced height, combined into single line */}
              <div className="px-4 py-2 border-b border-border shrink-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium truncate flex-1 text-sm">{currentFile.name}</h3>
                  <span
                    className={`px-2 py-0.5 text-xs font-medium rounded-full shrink-0 ${
                      currentFile.status === "approved"
                        ? "bg-green-500/10 text-green-600 dark:text-green-400"
                        : currentFile.status === "needs_changes"
                          ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                          : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {currentFile.status === "approved"
                      ? "Approved"
                      : currentFile.status === "needs_changes"
                        ? "Changes"
                        : "Pending"}
                  </span>
                  {currentFileVersions.length > 1 ? (
                    <Select
                      value={selectedVersionId || currentFile.current_version_id || ""}
                      onValueChange={(val) => setSelectedVersionId(val)}
                    >
                      <SelectTrigger className="h-auto w-auto gap-0.5 px-2 py-0.5 text-xs text-muted-foreground border-0 bg-transparent shadow-none hover:bg-muted focus:ring-0 [&>svg]:hidden group rounded-full shrink-0">
                        <span>
                          v
                          {currentFileVersions.length -
                            currentFileVersions.findIndex(
                              (v) => v.id === (selectedVersionId || currentFile.current_version_id),
                            )}
                        </span>
                        <ChevronDown className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </SelectTrigger>
                      <SelectContent className="min-w-0">
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
                  ) : null}
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
                        {versionFeedback.map((fb, idx) => (
                          <div
                            key={fb.id}
                            className={`bg-muted rounded-lg p-3 transition-colors ${
                              highlightedFeedbackId === fb.id ? "ring-2 ring-primary/50 bg-primary/5" : ""
                            }`}
                            onMouseEnter={() => setHighlightedFeedbackId(fb.id)}
                            onMouseLeave={() => setHighlightedFeedbackId(null)}
                          >
                            {fb.markup_x != null && fb.markup_y != null && (
                              <div className="flex items-center gap-1.5 mb-1.5">
                                <span className="w-5 h-5 rounded-full bg-amber-500 text-white text-xs font-bold flex items-center justify-center">
                                  {versionFeedback.filter((f) => f.markup_x != null).indexOf(fb) + 1}
                                </span>
                                <span className="text-xs text-muted-foreground">Markup feedback</span>
                              </div>
                            )}
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
                        ) : file.file_type === "video" && thumbUrl ? (
                          <div className="relative h-full w-full">
                            <video src={thumbUrl} className="h-full w-full object-cover" muted />
                            <div className="absolute inset-0 flex items-center justify-center">
                              <Film className="h-6 w-6 text-white drop-shadow-lg" />
                            </div>
                          </div>
                        ) : file.file_type === "pdf" && thumbUrl ? (
                          // Use PdfThumbnail for PDF previews
                          <PdfThumbnail url={thumbUrl} />
                        ) : (
                          <div className="h-full w-full bg-muted flex items-center justify-center">
                            <FileText className="h-4 w-4" />
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

          <button
            onClick={() => navigateReview(-1)}
            disabled={reviewingIndex === 0}
            className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 z-10 h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-background/90 shadow-lg flex items-center justify-center hover:bg-background disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
          >
            <ChevronLeft className="h-5 w-5 sm:h-6 sm:w-6" />
          </button>
          <button
            onClick={() => navigateReview(1)}
            disabled={reviewingIndex === displayFiles.length - 1}
            className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 z-10 h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-background/90 shadow-lg flex items-center justify-center hover:bg-background disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
          >
            <ChevronRight className="h-5 w-5 sm:h-6 sm:w-6" />
          </button>
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
