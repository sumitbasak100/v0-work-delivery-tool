"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import Image from "next/image"
import { createClient } from "@/lib/supabase/client"
import type { Project, FileWithVersions, FileStatus } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select"
import {
  ArrowLeft,
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  ExternalLink,
  FileText,
  Film,
  Loader2,
  Maximize,
  MoreVertical,
  MoveHorizontal,
  MoveVertical,
  Settings,
  Share2,
  Trash2,
  Upload,
  X,
  ZoomIn,
  ZoomOut,
  AlertCircle,
} from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"
import JSZip from "jszip"

interface OwnerProjectViewProps {
  project: Project
  initialFiles: FileWithVersions[]
}

type FitMode = "contain" | "width" | "height"

export function OwnerProjectView({ project, initialFiles }: OwnerProjectViewProps) {
  const supabase = createClient()
  const [files, setFiles] = useState<FileWithVersions[]>(initialFiles)
  const [reviewingIndex, setReviewingIndex] = useState<number | null>(null)
  const [filter, setFilter] = useState<"all" | FileStatus>("all")
  const [zoom, setZoom] = useState(1)
  const [fitMode, setFitMode] = useState<FitMode>("contain")
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null)

  // Share dialog
  const [shareDialogOpen, setShareDialogOpen] = useState(false)
  const [isActive, setIsActive] = useState(project.is_active)
  const [password, setPassword] = useState(project.password || "")
  const [isSavingShare, setIsSavingShare] = useState(false)

  // Upload dialog
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false)
  const [uploadingFiles, setUploadingFiles] = useState<
    {
      name: string
      progress: number
      status: "uploading" | "done" | "error"
      extractedFiles?: { name: string; progress: number; status: "uploading" | "done" | "error" }[]
    }[]
  >([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  // New version upload
  const [versionUploadDialogOpen, setVersionUploadDialogOpen] = useState(false)
  const [versionUploadFile, setVersionUploadFile] = useState<FileWithVersions | null>(null)
  const [versionUploading, setVersionUploading] = useState(false)
  const [versionUploadProgress, setVersionUploadProgress] = useState(0)
  const versionFileInputRef = useRef<HTMLInputElement>(null)

  // Delete dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [fileToDelete, setFileToDelete] = useState<FileWithVersions | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Settings dialog
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false)
  const [projectName, setProjectName] = useState(project.name)
  const [projectDescription, setProjectDescription] = useState(project.description || "")
  const [isSavingSettings, setIsSavingSettings] = useState(false)

  const displayFiles = filter === "all" ? files : files.filter((f) => f.status === filter)

  const currentFile = reviewingIndex !== null ? displayFiles[reviewingIndex] : null
  const currentFileVersions = currentFile?.versions || []
  const selectedVersion = selectedVersionId
    ? currentFileVersions.find((v) => v.id === selectedVersionId)
    : currentFile?.current_version
  const fileUrl = selectedVersion?.file_url

  // Get version-specific feedback
  const versionFeedback = currentFile?.feedback?.filter((f) => f.file_version_id === selectedVersion?.id) || []

  useEffect(() => {
    if (currentFile) {
      setSelectedVersionId(currentFile.current_version_id || null)
    }
  }, [currentFile])

  useEffect(() => {
    setZoom(1)
    setFitMode("contain")
  }, [reviewingIndex, selectedVersionId])

  const openReview = (index: number) => {
    setReviewingIndex(index)
    document.body.style.overflow = "hidden"
  }

  const closeReview = () => {
    setReviewingIndex(null)
    document.body.style.overflow = ""
  }

  const goToPrev = () => {
    if (reviewingIndex !== null && reviewingIndex > 0) {
      setReviewingIndex(reviewingIndex - 1)
    }
  }

  const goToNext = () => {
    if (reviewingIndex !== null && reviewingIndex < displayFiles.length - 1) {
      setReviewingIndex(reviewingIndex + 1)
    }
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (reviewingIndex === null) return
      if (e.key === "ArrowLeft") goToPrev()
      if (e.key === "ArrowRight") goToNext()
      if (e.key === "Escape") closeReview()
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [reviewingIndex, displayFiles.length])

  const shareUrl = typeof window !== "undefined" ? `${window.location.origin}/p/${project.share_id}` : ""

  const copyShareLink = async () => {
    await navigator.clipboard.writeText(shareUrl)
    toast("Link copied!")
  }

  const saveShareSettings = async () => {
    setIsSavingShare(true)
    await supabase
      .from("projects")
      .update({ is_active: isActive, password: password || null })
      .eq("id", project.id)
    setIsSavingShare(false)
    toast("Share settings saved!")
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files
    if (!selectedFiles || selectedFiles.length === 0) return

    setUploadDialogOpen(true)
    const newUploadingFiles: typeof uploadingFiles = []

    for (const file of Array.from(selectedFiles)) {
      // Check if it's a ZIP file
      if (file.type === "application/zip" || file.name.endsWith(".zip")) {
        const zipEntry: (typeof uploadingFiles)[0] = {
          name: file.name,
          progress: 0,
          status: "uploading",
          extractedFiles: [],
        }
        newUploadingFiles.push(zipEntry)
        setUploadingFiles([...newUploadingFiles])

        try {
          const zip = new JSZip()
          const contents = await zip.loadAsync(file)
          const extractedEntries: { name: string; file: Blob }[] = []

          // Extract all valid files from ZIP
          for (const [path, zipEntry] of Object.entries(contents.files)) {
            if (zipEntry.dir) continue
            const fileName = path.split("/").pop() || path
            if (fileName.startsWith(".")) continue // Skip hidden files

            const blob = await zipEntry.async("blob")
            const ext = fileName.split(".").pop()?.toLowerCase()

            // Check if valid file type
            if (["png", "jpg", "jpeg", "webp", "mp4", "pdf"].includes(ext || "")) {
              extractedEntries.push({ name: fileName, file: blob })
            }
          }

          // Update ZIP entry with extracted files
          zipEntry.extractedFiles = extractedEntries.map((ef) => ({
            name: ef.name,
            progress: 0,
            status: "uploading" as const,
          }))
          setUploadingFiles([...newUploadingFiles])

          // Upload each extracted file
          for (let i = 0; i < extractedEntries.length; i++) {
            const { name, file: blob } = extractedEntries[i]
            try {
              const formData = new FormData()
              formData.append("file", blob, name)
              formData.append("projectId", project.id)

              const res = await fetch("/api/upload", { method: "POST", body: formData })
              if (!res.ok) throw new Error("Upload failed")

              const { url, type } = await res.json()
              let fileType: "image" | "video" | "pdf" = "image"
              if (type.startsWith("video")) fileType = "video"
              else if (type === "application/pdf") fileType = "pdf"

              const { data: fileData } = await supabase
                .from("files")
                .insert({ project_id: project.id, name, file_type: fileType, status: "pending" })
                .select()
                .single()

              if (fileData) {
                const { data: versionData } = await supabase
                  .from("file_versions")
                  .insert({ file_id: fileData.id, file_url: url })
                  .select()
                  .single()

                if (versionData) {
                  await supabase.from("files").update({ current_version_id: versionData.id }).eq("id", fileData.id)
                  setFiles((prev) => [
                    ...prev,
                    {
                      ...fileData,
                      current_version_id: versionData.id,
                      current_version: versionData,
                      versions: [versionData],
                      feedback: [],
                    },
                  ])
                }
              }

              zipEntry.extractedFiles![i] = { name, progress: 100, status: "done" }
            } catch {
              zipEntry.extractedFiles![i] = { name, progress: 0, status: "error" }
            }
            setUploadingFiles([...newUploadingFiles])
          }

          zipEntry.progress = 100
          zipEntry.status = "done"
        } catch {
          zipEntry.status = "error"
        }
        setUploadingFiles([...newUploadingFiles])
      } else {
        // Regular file upload
        const entry: (typeof uploadingFiles)[0] = { name: file.name, progress: 0, status: "uploading" }
        newUploadingFiles.push(entry)
        setUploadingFiles([...newUploadingFiles])

        try {
          const formData = new FormData()
          formData.append("file", file)
          formData.append("projectId", project.id)

          entry.progress = 30
          setUploadingFiles([...newUploadingFiles])

          const res = await fetch("/api/upload", { method: "POST", body: formData })
          if (!res.ok) throw new Error("Upload failed")

          entry.progress = 70
          setUploadingFiles([...newUploadingFiles])

          const { url, type } = await res.json()
          let fileType: "image" | "video" | "pdf" = "image"
          if (type.startsWith("video")) fileType = "video"
          else if (type === "application/pdf") fileType = "pdf"

          const { data: fileData } = await supabase
            .from("files")
            .insert({ project_id: project.id, name: file.name, file_type: fileType, status: "pending" })
            .select()
            .single()

          if (fileData) {
            const { data: versionData } = await supabase
              .from("file_versions")
              .insert({ file_id: fileData.id, file_url: url })
              .select()
              .single()

            if (versionData) {
              await supabase.from("files").update({ current_version_id: versionData.id }).eq("id", fileData.id)
              setFiles((prev) => [
                ...prev,
                {
                  ...fileData,
                  current_version_id: versionData.id,
                  current_version: versionData,
                  versions: [versionData],
                  feedback: [],
                },
              ])
            }
          }

          entry.progress = 100
          entry.status = "done"
        } catch {
          entry.status = "error"
        }
        setUploadingFiles([...newUploadingFiles])
      }
    }

    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  const handleVersionUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !versionUploadFile) return

    setVersionUploading(true)
    setVersionUploadProgress(20)

    try {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("projectId", project.id)

      setVersionUploadProgress(50)
      const res = await fetch("/api/upload", { method: "POST", body: formData })
      if (!res.ok) throw new Error("Upload failed")

      const { url } = await res.json()
      setVersionUploadProgress(80)

      const { data: versionData } = await supabase
        .from("file_versions")
        .insert({ file_id: versionUploadFile.id, file_url: url })
        .select()
        .single()

      if (versionData) {
        await supabase
          .from("files")
          .update({ current_version_id: versionData.id, status: "pending" })
          .eq("id", versionUploadFile.id)

        setFiles((prev) =>
          prev.map((f) =>
            f.id === versionUploadFile.id
              ? {
                  ...f,
                  current_version_id: versionData.id,
                  current_version: versionData,
                  versions: [versionData, ...(f.versions || [])],
                  status: "pending",
                }
              : f,
          ),
        )
      }

      setVersionUploadProgress(100)
      toast("New version uploaded!")
      setTimeout(() => {
        setVersionUploadDialogOpen(false)
        setVersionUploadFile(null)
        setVersionUploading(false)
        setVersionUploadProgress(0)
      }, 500)
    } catch {
      toast("Upload failed")
      setVersionUploading(false)
      setVersionUploadProgress(0)
    }

    if (versionFileInputRef.current) versionFileInputRef.current.value = ""
  }

  const openVersionUpload = (file: FileWithVersions) => {
    setVersionUploadFile(file)
    setVersionUploadDialogOpen(true)
  }

  const handleDelete = async () => {
    if (!fileToDelete) return
    setIsDeleting(true)

    await supabase.from("files").delete().eq("id", fileToDelete.id)
    setFiles((prev) => prev.filter((f) => f.id !== fileToDelete.id))

    setIsDeleting(false)
    setDeleteDialogOpen(false)
    setFileToDelete(null)
    if (reviewingIndex !== null) closeReview()
    toast("File deleted")
  }

  const saveSettings = async () => {
    setIsSavingSettings(true)
    await supabase
      .from("projects")
      .update({ name: projectName, description: projectDescription || null })
      .eq("id", project.id)
    setIsSavingSettings(false)
    setSettingsDialogOpen(false)
    toast("Project updated!")
  }

  const downloadFile = async (url: string, filename: string) => {
    const response = await fetch(url)
    const blob = await response.blob()
    const link = document.createElement("a")
    link.href = URL.createObjectURL(blob)
    link.download = filename
    link.click()
  }

  const downloadAllAsZip = async () => {
    const zip = new JSZip()
    toast("Preparing download...")

    for (const file of files) {
      if (file.current_version?.file_url) {
        try {
          const response = await fetch(file.current_version.file_url)
          const blob = await response.blob()
          zip.file(file.name, blob)
        } catch {
          console.error(`Failed to download ${file.name}`)
        }
      }
    }

    const content = await zip.generateAsync({ type: "blob" })
    const link = document.createElement("a")
    link.href = URL.createObjectURL(content)
    link.download = `${project.name}.zip`
    link.click()
    toast("Download started!")
  }

  const approvedCount = files.filter((f) => f.status === "approved").length
  const totalCount = files.length
  const progress = totalCount > 0 ? (approvedCount / totalCount) * 100 : 0

  const renderFilePreview = () => {
    if (!fileUrl || !currentFile) {
      return (
        <div className="flex items-center justify-center h-full">
          <p className="text-muted-foreground">No preview available</p>
        </div>
      )
    }

    if (currentFile.file_type === "image") {
      if (fitMode === "contain") {
        return (
          <div className="w-full h-full flex items-center justify-center p-4">
            <img
              src={fileUrl || "/placeholder.svg"}
              alt={currentFile.name}
              className="max-w-full max-h-full object-contain transition-transform"
              style={{ transform: `scale(${zoom})` }}
              draggable={false}
            />
          </div>
        )
      } else if (fitMode === "width") {
        return (
          <div className="w-full h-full overflow-auto p-4">
            <img
              src={fileUrl || "/placeholder.svg"}
              alt={currentFile.name}
              className="w-full h-auto transition-transform"
              style={{ transform: `scale(${zoom})`, transformOrigin: "top left" }}
              draggable={false}
            />
          </div>
        )
      } else {
        return (
          <div className="w-full h-full overflow-auto flex justify-center p-4">
            <img
              src={fileUrl || "/placeholder.svg"}
              alt={currentFile.name}
              className="h-full w-auto transition-transform"
              style={{ transform: `scale(${zoom})`, transformOrigin: "top center" }}
              draggable={false}
            />
          </div>
        )
      }
    }

    if (currentFile.file_type === "video") {
      return (
        <div className="w-full h-full flex items-center justify-center p-4">
          <video src={fileUrl} controls className="max-w-full max-h-full" />
        </div>
      )
    }

    if (currentFile.file_type === "pdf") {
      return <iframe src={fileUrl} className="w-full h-full" title={currentFile.name} />
    }

    return null
  }

  const getVersionNumber = (versionId: string) => {
    if (!currentFile?.versions) return 1
    const idx = currentFile.versions.findIndex((v) => v.id === versionId)
    return currentFile.versions.length - idx
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <header className="border-b border-border sticky top-0 bg-background/95 backdrop-blur z-10">
          <div className="px-4 md:px-6 py-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <Link href="/dashboard">
                  <Button variant="ghost" size="icon" className="shrink-0">
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                </Link>
                <div className="min-w-0">
                  <h1 className="text-xl font-semibold truncate">{project.name}</h1>
                  <p className="text-sm text-muted-foreground">
                    {approvedCount} of {totalCount} approved
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Upload */}
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  className="hidden"
                  multiple
                  accept="image/*,video/mp4,application/pdf,application/zip,.zip"
                />
                <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} className="gap-2">
                  <Upload className="h-4 w-4" />
                  <span className="hidden sm:inline">Upload</span>
                </Button>

                {/* Share */}
                <Button variant="outline" size="sm" onClick={() => setShareDialogOpen(true)} className="gap-2">
                  <Share2 className="h-4 w-4" />
                  <span className="hidden sm:inline">Share</span>
                </Button>

                {/* Download */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-2 bg-transparent">
                      <Download className="h-4 w-4" />
                      <span className="hidden sm:inline">Download</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={downloadAllAsZip}>Download all as ZIP</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Settings */}
                <Button variant="ghost" size="icon" onClick={() => setSettingsDialogOpen(true)}>
                  <Settings className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Progress */}
            {totalCount > 0 && (
              <div className="mt-3">
                <Progress value={progress} className="h-2" />
              </div>
            )}
          </div>
        </header>

        {/* Filters */}
        <div className="px-4 md:px-6 py-4 border-b border-border">
          <div className="flex gap-2 overflow-x-auto">
            {(["all", "pending", "approved", "needs_changes"] as const).map((f) => (
              <Button
                key={f}
                variant={filter === f ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter(f)}
                className="shrink-0"
              >
                {f === "all" ? "All" : f === "pending" ? "Pending" : f === "approved" ? "Approved" : "Needs Changes"}
                <span className="ml-1.5 text-xs opacity-70">
                  {f === "all" ? files.length : files.filter((file) => file.status === f).length}
                </span>
              </Button>
            ))}
          </div>
        </div>

        {/* File Grid */}
        <main className="px-4 md:px-6 py-6">
          {files.length === 0 ? (
            <div className="text-center py-16">
              <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                <Upload className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium mb-2">No files yet</h3>
              <p className="text-muted-foreground mb-4">Upload files to share with your client</p>
              <Button onClick={() => fileInputRef.current?.click()} className="gap-2">
                <Upload className="h-4 w-4" />
                Upload files
              </Button>
            </div>
          ) : displayFiles.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-muted-foreground">No files match this filter</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
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
                          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
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
                        <div className="absolute bottom-2 right-2 bg-background/80 backdrop-blur text-xs px-2 py-0.5 rounded-full">
                          v{versionCount}
                        </div>
                      )}
                    </div>
                    <div className="p-2.5">
                      <p className="text-sm font-medium truncate">{file.name}</p>
                    </div>
                  </Card>
                )
              })}
            </div>
          )}
        </main>
      </div>

      {/* Review Overlay */}
      {reviewingIndex !== null && currentFile && (
        <div className="fixed inset-0 z-50 bg-background flex">
          {/* Main Content */}
          <div className="flex-1 flex flex-col min-w-0">
            {/* Top Bar */}
            <div className="h-14 border-b border-border flex items-center justify-between px-4 shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <Button variant="ghost" size="icon" onClick={closeReview}>
                  <X className="h-4 w-4" />
                </Button>
                <span className="font-medium truncate">{currentFile.name}</span>
                {currentFile.versions && currentFile.versions.length > 1 && (
                  <Select
                    value={selectedVersionId || currentFile.current_version_id || ""}
                    onValueChange={(val) => setSelectedVersionId(val)}
                  >
                    <SelectTrigger className="h-auto w-auto gap-1 px-1.5 py-0.5 text-xs border-0 bg-transparent hover:bg-muted text-muted-foreground">
                      <span>v{getVersionNumber(selectedVersionId || currentFile.current_version_id || "")}</span>
                    </SelectTrigger>
                    <SelectContent>
                      {currentFile.versions.map((version, idx) => {
                        const versionNum = currentFile.versions!.length - idx
                        const isCurrent = version.id === currentFile.current_version_id
                        return (
                          <SelectItem key={version.id} value={version.id} className="text-xs">
                            v{versionNum} {isCurrent && "(current)"}
                          </SelectItem>
                        )
                      })}
                    </SelectContent>
                  </Select>
                )}
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" onClick={() => setFitMode("contain")} title="Fit to view">
                  <Maximize className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => setFitMode("width")} title="Fit width">
                  <MoveHorizontal className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => setFitMode("height")} title="Fit height">
                  <MoveVertical className="h-4 w-4" />
                </Button>
                <div className="w-px h-4 bg-border mx-1" />
                <Button variant="ghost" size="icon" onClick={() => setZoom((z) => Math.max(0.25, z - 0.25))}>
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <span className="text-xs w-12 text-center">{Math.round(zoom * 100)}%</span>
                <Button variant="ghost" size="icon" onClick={() => setZoom((z) => Math.min(3, z + 0.25))}>
                  <ZoomIn className="h-4 w-4" />
                </Button>
                <div className="w-px h-4 bg-border mx-1" />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => downloadFile(fileUrl!, currentFile.name)}
                  title="Download file"
                >
                  <Download className="h-4 w-4" />
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => {
                        setFileToDelete(currentFile)
                        setDeleteDialogOpen(true)
                      }}
                      className="text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete file
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* Preview Area */}
            <div className="flex-1 relative overflow-hidden bg-muted/30">{renderFilePreview()}</div>

            {/* Navigation */}
            <div className="absolute left-4 top-1/2 -translate-y-1/2 z-10">
              <Button
                variant="secondary"
                size="icon"
                onClick={goToPrev}
                disabled={reviewingIndex === 0}
                className="rounded-full shadow-lg"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
            </div>
            <div className="absolute right-[340px] top-1/2 -translate-y-1/2 z-10">
              <Button
                variant="secondary"
                size="icon"
                onClick={goToNext}
                disabled={reviewingIndex === displayFiles.length - 1}
                className="rounded-full shadow-lg"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Right Sidebar */}
          <div className="w-80 border-l border-border flex flex-col shrink-0 bg-background overflow-hidden">
            {/* Status */}
            <div className="p-4 border-b border-border shrink-0">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Status</span>
                <span
                  className={`text-xs px-2 py-1 rounded-full ${
                    currentFile.status === "approved"
                      ? "bg-green-500/20 text-green-600"
                      : currentFile.status === "needs_changes"
                        ? "bg-amber-500/20 text-amber-600"
                        : "bg-muted text-muted-foreground"
                  }`}
                >
                  {currentFile.status === "approved"
                    ? "Approved"
                    : currentFile.status === "needs_changes"
                      ? "Needs Changes"
                      : "Pending"}
                </span>
              </div>

              {/* Upload new version */}
              {currentFile.status === "needs_changes" || currentFile.status === "pending" ? (
                <Button className="w-full mt-3 gap-2" onClick={() => openVersionUpload(currentFile)}>
                  <Upload className="h-4 w-4" />
                  Upload new version
                </Button>
              ) : (
                <Button
                  variant="outline"
                  className="w-full mt-3 gap-2 text-muted-foreground bg-transparent"
                  onClick={() => openVersionUpload(currentFile)}
                >
                  <Upload className="h-4 w-4" />
                  Upload revision
                </Button>
              )}
            </div>

            {/* Client Feedback */}
            <div className="flex-1 overflow-y-auto p-4">
              <h4 className="text-sm font-medium mb-3">Client Feedback</h4>
              {versionFeedback.length === 0 ? (
                <p className="text-sm text-muted-foreground">No feedback for this version yet</p>
              ) : (
                <div className="space-y-3">
                  {versionFeedback.map((fb) => (
                    <div key={fb.id} className="bg-muted/50 rounded-lg p-3">
                      <p className="text-sm">{fb.text}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(fb.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  ))}
                </div>
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
                      onClick={() => setReviewingIndex(idx)}
                      className={`relative h-12 w-12 rounded-md overflow-hidden shrink-0 cursor-pointer transition-all ${
                        isActive ? "ring-2 ring-primary" : "opacity-60 hover:opacity-100"
                      }`}
                    >
                      {file.file_type === "image" && thumbUrl ? (
                        <Image src={thumbUrl || "/placeholder.svg"} alt="" fill className="object-cover" sizes="48px" />
                      ) : (
                        <div className="h-full w-full bg-muted flex items-center justify-center">
                          {file.file_type === "video" ? <Film className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
                        </div>
                      )}
                      {isApproved && (
                        <div className="absolute inset-0 bg-green-500/30 flex items-center justify-center">
                          <Check className="h-3 w-3 text-white" />
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Share Dialog */}
      <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Share project</DialogTitle>
            <DialogDescription>Share this link with your client to collect approvals</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex gap-2">
              <Input value={shareUrl} readOnly className="flex-1" />
              <Button variant="outline" size="icon" onClick={copyShareLink}>
                <Copy className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" asChild>
                <a href={shareUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4" />
                </a>
              </Button>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Password protection (optional)</label>
              <Input
                type="password"
                placeholder="Leave empty for no password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Link active</span>
              <Button variant={isActive ? "default" : "outline"} size="sm" onClick={() => setIsActive(!isActive)}>
                {isActive ? "Active" : "Inactive"}
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShareDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveShareSettings} disabled={isSavingShare}>
              {isSavingShare ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Upload Dialog */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Uploading files</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-4 max-h-80 overflow-y-auto">
            {uploadingFiles.map((file, idx) => (
              <div key={idx} className="space-y-2">
                <div className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{file.name}</p>
                    {file.status === "uploading" && <Progress value={file.progress} className="h-1 mt-1" />}
                  </div>
                  {file.status === "done" && <Check className="h-4 w-4 text-green-500 shrink-0" />}
                  {file.status === "error" && <X className="h-4 w-4 text-destructive shrink-0" />}
                  {file.status === "uploading" && <Loader2 className="h-4 w-4 animate-spin shrink-0" />}
                </div>
                {/* Show extracted files from ZIP */}
                {file.extractedFiles && file.extractedFiles.length > 0 && (
                  <div className="ml-4 pl-3 border-l border-border space-y-1.5">
                    {file.extractedFiles.map((ef, efIdx) => (
                      <div key={efIdx} className="flex items-center gap-2 text-xs">
                        <span className="truncate flex-1 text-muted-foreground">{ef.name}</span>
                        {ef.status === "done" && <Check className="h-3 w-3 text-green-500" />}
                        {ef.status === "error" && <X className="h-3 w-3 text-destructive" />}
                        {ef.status === "uploading" && <Loader2 className="h-3 w-3 animate-spin" />}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button
              onClick={() => setUploadDialogOpen(false)}
              disabled={uploadingFiles.some((f) => f.status === "uploading")}
            >
              {uploadingFiles.some((f) => f.status === "uploading") ? "Uploading..." : "Done"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Version Upload Dialog */}
      <Dialog open={versionUploadDialogOpen} onOpenChange={setVersionUploadDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload new version</DialogTitle>
            <DialogDescription>Upload a new version of "{versionUploadFile?.name}"</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <input
              type="file"
              ref={versionFileInputRef}
              onChange={handleVersionUpload}
              className="hidden"
              accept="image/*,video/mp4,application/pdf"
            />
            {!versionUploading ? (
              <div
                className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => versionFileInputRef.current?.click()}
              >
                <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Click to select a file</p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">Uploading...</span>
                </div>
                <Progress value={versionUploadProgress} className="h-2" />
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete file</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{fileToDelete?.name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Settings Dialog */}
      <Dialog open={settingsDialogOpen} onOpenChange={setSettingsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Project settings</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Project name</label>
              <Input value={projectName} onChange={(e) => setProjectName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <Input value={projectDescription} onChange={(e) => setProjectDescription(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSettingsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveSettings} disabled={isSavingSettings}>
              {isSavingSettings ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
