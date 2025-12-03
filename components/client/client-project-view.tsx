"use client"
import { useState, useEffect } from "react"
import Image from "next/image"
import { createClient } from "@/lib/supabase/client"
import type { Project, FileWithVersions, FileStatus } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select"
import {
  Check,
  ChevronLeft,
  ChevronRight,
  FileText,
  Film,
  Maximize,
  MessageSquare,
  MoveHorizontal,
  MoveVertical,
  X,
  ZoomIn,
  ZoomOut,
  AlertCircle,
  PartyPopper,
} from "lucide-react"
import { toast } from "sonner"

interface ClientProjectViewProps {
  project: Project
  initialFiles: FileWithVersions[]
}

type FitMode = "contain" | "width" | "height"

export function ClientProjectView({ project, initialFiles }: ClientProjectViewProps) {
  const supabase = createClient()
  const [files, setFiles] = useState<FileWithVersions[]>(initialFiles)
  const [reviewingIndex, setReviewingIndex] = useState<number | null>(null)
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "needs_changes">("pending")
  const [zoom, setZoom] = useState(1)
  const [fitMode, setFitMode] = useState<FitMode>("contain")
  const [feedbackText, setFeedbackText] = useState("")
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null)
  const [showFeedbackForm, setShowFeedbackForm] = useState(false)

  const [showNameDialog, setShowNameDialog] = useState(false)
  const [clientName, setClientName] = useState("")
  const [actionCount, setActionCount] = useState(0)

  // Load client name from localStorage
  useEffect(() => {
    const savedName = localStorage.getItem(`client_name_${project.id}`)
    if (savedName) setClientName(savedName)
    const savedCount = localStorage.getItem(`action_count_${project.id}`)
    if (savedCount) setActionCount(Number.parseInt(savedCount, 10))
  }, [project.id])

  const incrementActionCount = () => {
    const newCount = actionCount + 1
    setActionCount(newCount)
    localStorage.setItem(`action_count_${project.id}`, newCount.toString())
    // Ask for name after 2 actions if not already provided
    if (newCount === 2 && !clientName) {
      setShowNameDialog(true)
    }
  }

  const saveClientName = () => {
    if (clientName.trim()) {
      localStorage.setItem(`client_name_${project.id}`, clientName.trim())
      setShowNameDialog(false)
    }
  }

  const displayFiles = filter === "all" ? files : files.filter((f) => f.status === filter)
  const pendingFiles = files.filter((f) => f.status === "pending")
  const allReviewed = pendingFiles.length === 0 && files.length > 0

  const displayCurrentFile = reviewingIndex !== null ? displayFiles[reviewingIndex] : null
  const currentFile = displayCurrentFile ? files.find((f) => f.id === displayCurrentFile.id) : null

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
      setShowFeedbackForm(false)
    }
  }, [currentFile]) // Updated to use currentFile directly

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
    setFeedbackText("")
    setShowFeedbackForm(false)
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

  const handleApprove = async () => {
    if (!currentFile) return
    const fileId = currentFile.id

    setFiles((prev) => prev.map((f) => (f.id === fileId ? { ...f, status: "approved" as FileStatus } : f)))
    toast("Approved!")
    incrementActionCount()

    supabase.from("files").update({ status: "approved" }).eq("id", fileId).then()
    fetch("/api/notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "approve", projectId: project.id, fileId, fileName: currentFile.name }),
    }).catch(() => {})

    // Auto-advance to next pending file
    setTimeout(() => {
      const nextPendingIdx = displayFiles.findIndex((f, i) => i > reviewingIndex! && f.status === "pending")
      if (nextPendingIdx !== -1) {
        setReviewingIndex(nextPendingIdx)
      } else if (reviewingIndex! < displayFiles.length - 1) {
        goToNext()
      }
    }, 300)
  }

  const handleSubmitFeedback = async () => {
    if (!feedbackText.trim() || reviewingIndex === null || !currentFile || !selectedVersion) return
    const fileId = currentFile.id
    const newFeedback = {
      id: crypto.randomUUID(),
      file_id: fileId,
      file_version_id: selectedVersion.id,
      text: feedbackText.trim(),
      created_at: new Date().toISOString(),
    }

    setFiles((prev) =>
      prev.map((f) =>
        f.id === fileId
          ? { ...f, status: "needs_changes" as FileStatus, feedback: [newFeedback, ...(f.feedback || [])] }
          : f,
      ),
    )
    setFeedbackText("")
    toast("Feedback sent!")
    incrementActionCount()

    supabase
      .from("feedback")
      .insert({ file_id: fileId, file_version_id: selectedVersion.id, text: feedbackText.trim() })
      .then()
    supabase.from("files").update({ status: "needs_changes" }).eq("id", fileId).then()
    fetch("/api/notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "feedback", projectId: project.id, fileId, fileName: currentFile.name }),
    }).catch(() => {})
  }

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

  const approvedCount = files.filter((f) => f.status === "approved").length
  const totalCount = files.length
  const progress = totalCount > 0 ? (approvedCount / totalCount) * 100 : 0

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
              <div className="min-w-0">
                <h1 className="text-xl font-semibold truncate">{project.name}</h1>
                <p className="text-sm text-muted-foreground">
                  {approvedCount} of {totalCount} approved
                </p>
              </div>
              {pendingFiles.length > 0 && (
                <Button onClick={() => openReview(0)} className="shrink-0 cursor-pointer">
                  Start Review
                </Button>
              )}
            </div>
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
            {(["pending", "approved", "needs_changes", "all"] as const).map((f) => (
              <Button
                key={f}
                variant={filter === f ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter(f)}
                className="shrink-0"
              >
                {f === "all" ? "All" : f === "pending" ? "To Review" : f === "approved" ? "Approved" : "Needs Changes"}
                <span className="ml-1.5 text-xs opacity-70">
                  {f === "all" ? files.length : files.filter((file) => file.status === f).length}
                </span>
              </Button>
            ))}
          </div>
        </div>

        {/* File Grid or Success State */}
        <main className="px-4 md:px-6 py-6">
          {filter === "pending" && allReviewed ? (
            <div className="text-center py-16">
              <div className="h-16 w-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4">
                <PartyPopper className="h-8 w-8 text-green-500" />
              </div>
              <h3 className="text-lg font-medium mb-2">All done!</h3>
              <p className="text-muted-foreground mb-4">You have reviewed all files in this project</p>
              <Button variant="outline" onClick={() => setFilter("all")}>
                View all files
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
            {/* Actions */}
            <div className="p-4 border-b border-border shrink-0">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium">Review</span>
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

              {currentFile.status === "pending" && (
                <Button className="w-full gap-2" onClick={handleApprove}>
                  <Check className="h-4 w-4" />
                  Approve
                </Button>
              )}

              {currentFile.status === "approved" && !showFeedbackForm && (
                <Button
                  variant="outline"
                  className="w-full gap-2 text-muted-foreground bg-transparent"
                  onClick={() => setShowFeedbackForm(true)}
                >
                  <MessageSquare className="h-4 w-4" />
                  Add feedback anyway
                </Button>
              )}

              {currentFile.status === "needs_changes" && !showFeedbackForm && (
                <Button
                  variant="outline"
                  className="w-full gap-2 bg-transparent"
                  onClick={() => setShowFeedbackForm(true)}
                >
                  <MessageSquare className="h-4 w-4" />
                  Add more feedback
                </Button>
              )}
            </div>

            {/* Feedback Form */}
            {(currentFile.status === "pending" || showFeedbackForm) && (
              <div className="p-4 border-b border-border shrink-0">
                <Textarea
                  placeholder="Describe the changes needed..."
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                  rows={3}
                  className="resize-none"
                />
                <Button
                  className="w-full mt-2 bg-transparent"
                  variant="outline"
                  onClick={handleSubmitFeedback}
                  disabled={!feedbackText.trim()}
                >
                  Send Feedback
                </Button>
              </div>
            )}

            {/* Feedback List */}
            <div className="flex-1 overflow-y-auto p-4">
              <h4 className="text-sm font-medium mb-3">Feedback</h4>
              {versionFeedback.length === 0 ? (
                <p className="text-sm text-muted-foreground">No feedback for this version</p>
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

      <Dialog open={showNameDialog} onOpenChange={setShowNameDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>What's your name?</DialogTitle>
            <DialogDescription>Help us identify your feedback by providing your name.</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              placeholder="Your name"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && saveClientName()}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNameDialog(false)}>
              Skip
            </Button>
            <Button onClick={saveClientName} disabled={!clientName.trim()}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
