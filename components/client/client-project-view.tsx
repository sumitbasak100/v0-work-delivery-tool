"use client"

import type React from "react"
import { useState, useEffect, useCallback, useMemo, useRef } from "react"
import { useFileCache } from "@/hooks/use-file-cache"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { FileViewer } from "@/components/ui/file-viewer"
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select"
import {
  CheckCircle2,
  FileText,
  ChevronLeft,
  ChevronRight,
  X,
  Send,
  PartyPopper,
  ChevronDown,
  ThumbsUp,
  MapPin,
  Trash2,
  Info,
  Film,
  Check,
  AlertCircle,
  MessageSquare,
} from "lucide-react"
import type { Project, FileWithDetails, Feedback } from "@/lib/types"
import { Document, Page, pdfjs } from "react-pdf"
import "react-pdf/dist/Page/AnnotationLayer.css"
import "react-pdf/dist/Page/TextLayer.css"

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`

type FileWithVersions = FileWithDetails

interface ClientProjectViewProps {
  project: Project
  initialFiles: FileWithVersions[]
}

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

export function ClientProjectView({ project, initialFiles }: ClientProjectViewProps) {
  const [files, setFiles] = useState<FileWithVersions[]>(initialFiles || [])
  const [selectedFile, setSelectedFile] = useState<FileWithVersions | null>(null)
  const [filterStatus, setFilterStatus] = useState<"to_review" | "all" | "approved" | "needs_changes">("to_review")
  const [feedbackText, setFeedbackText] = useState("")
  const [showToast, setShowToast] = useState<{ message: string; type: "success" | "info" } | null>(null)
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null)
  const [isViewingOldVersion, setIsViewingOldVersion] = useState(false)
  const [pendingMarkup, setPendingMarkup] = useState<{
    x: number
    y: number
    timestamp?: number
    page?: number
  } | null>(null) // Add page to pendingMarkup type
  const [markupMode, setMarkupMode] = useState(false)
  const [highlightedFeedbackId, setHighlightedFeedbackId] = useState<string | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const feedbackInputRef = useRef<HTMLTextAreaElement>(null)
  const [showMobileSidebar, setShowMobileSidebar] = useState(false)

  const { getCachedUrl, cacheFile, preloadFile, preloadAllFiles } = useFileCache()

  useEffect(() => {
    setFiles(initialFiles || [])
  }, [initialFiles])

  useEffect(() => {
    const allFileUrls = files.map((f) => f.current_version?.file_url).filter((url): url is string => !!url)

    if (allFileUrls.length > 0) {
      preloadAllFiles(allFileUrls)
    }
  }, [files, preloadAllFiles]) // Depend on files to update preload

  useEffect(() => {
    if (selectedFile) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = ""
    }
    return () => {
      document.body.style.overflow = ""
    }
  }, [selectedFile])

  useEffect(() => {
    if (selectedFile) {
      setSelectedVersionId(selectedFile.current_version_id)
      setIsViewingOldVersion(false)
      setFeedbackText("")
      setPendingMarkup(null) // Reset markup when changing files
      setMarkupMode(false) // Reset markup mode
    } else {
      setSelectedVersionId(null)
    }
  }, [selectedFile])

  const toast = useCallback((message: string, type: "success" | "info" = "success") => {
    setShowToast({ message, type })
    setTimeout(() => setShowToast(null), 2500)
  }, [])

  const handleApprove = async () => {
    if (!selectedFile) return
    const fileId = selectedFile.id
    const updatedFiles = files.map((f) => (f.id === fileId ? { ...f, status: "approved" as const } : f))
    setFiles(updatedFiles)
    setSelectedFile((prev) => (prev ? { ...prev, status: "approved" as const } : null))
    toast("Approved!", "success")

    // Find next pending file in the filtered list
    const currentFiltered = updatedFiles.filter((f) => {
      if (filterStatus === "to_review") return f.status === "pending"
      if (filterStatus === "approved") return f.status === "approved"
      if (filterStatus === "needs_changes") return f.status === "needs_changes"
      return true
    })
    const currentIndex = currentFiltered.findIndex((f) => f.id === fileId)
    const nextPendingFile =
      currentFiltered.find((f, idx) => idx > currentIndex && f.status === "pending") ||
      currentFiltered.find((f, idx) => idx < currentIndex && f.status === "pending")

    if (nextPendingFile) {
      setSelectedFile(nextPendingFile)
      setSelectedVersionId(nextPendingFile.current_version_id)
      setIsViewingOldVersion(false)
      setFeedbackText("")
      setPendingMarkup(null)
      setMarkupMode(false)
    } else {
      setSelectedFile(null)
    }

    fetch("/api/approveFile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId: project.id, fileId }),
    }).catch(() => {})
  }

  const handleSubmitFeedback = async () => {
    if (!selectedFile || !feedbackText.trim()) return
    const versionId = selectedVersionId || selectedFile.current_version_id

    const newFeedback: Feedback = {
      id: crypto.randomUUID(),
      file_id: selectedFile.id,
      file_version_id: versionId || null,
      text: feedbackText.trim(),
      created_at: new Date().toISOString(),
      markup_x: pendingMarkup?.x ?? null,
      markup_y: pendingMarkup?.y ?? null,
      markup_timestamp: pendingMarkup?.timestamp ?? null,
      markup_page: pendingMarkup?.page ?? null,
    }

    const previousFiles = files
    const previousSelectedFile = selectedFile

    setFiles((prev) =>
      prev.map((f) =>
        f.id === selectedFile.id
          ? { ...f, status: "needs_changes" as const, feedback: [...(f.feedback || []), newFeedback] }
          : f,
      ),
    )
    setSelectedFile((prev) =>
      prev ? { ...prev, status: "needs_changes" as const, feedback: [...(prev.feedback || []), newFeedback] } : null,
    )
    setFeedbackText("")
    setPendingMarkup(null)
    setMarkupMode(false)
    toast("Feedback sent!", "success")

    try {
      const res = await fetch("/api/addFeedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: project.id,
          fileId: selectedFile.id,
          versionId,
          feedbackText: newFeedback.text,
          markup_x: newFeedback.markup_x,
          markup_y: newFeedback.markup_y,
          markup_timestamp: newFeedback.markup_timestamp,
          markup_page: newFeedback.markup_page,
        }),
      })
      if (!res.ok) throw new Error("Failed to add feedback")
    } catch {
      setFiles(previousFiles)
      setSelectedFile(previousSelectedFile)
      toast("Failed to send feedback - please try again", "info")
    }
  }

  const handleFeedbackKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSubmitFeedback()
    }
  }

  const filteredFiles = useCallback(() => {
    let result = [...files]
    if (filterStatus === "to_review") {
      result = result.filter((f) => f.status === "pending")
    } else if (filterStatus !== "all") {
      result = result.filter((f) => f.status === filterStatus)
    }
    return result.sort((a, b) => {
      const dateA = a.current_version?.created_at || a.created_at
      const dateB = b.current_version?.created_at || b.created_at
      return new Date(dateB).getTime() - new Date(dateA).getTime()
    })
  }, [files, filterStatus])

  const getSelectedVersion = useCallback(() => {
    if (!selectedFile) return null
    const versionId = selectedVersionId || selectedFile.current_version_id
    return selectedFile.versions?.find((v) => v.id === versionId) || selectedFile.current_version || null
  }, [selectedFile, selectedVersionId])

  const getSelectedVersionUrl = useCallback(() => {
    const version = getSelectedVersion()
    return version?.file_url || null
  }, [getSelectedVersion])

  const cachedFileUrlMemo = useMemo(() => {
    const url = getSelectedVersionUrl()
    return url ? getCachedUrl(url) : null
  }, [getSelectedVersionUrl, getCachedUrl])

  useEffect(() => {
    const fileUrl = getSelectedVersionUrl()
    if (fileUrl && selectedFile) {
      // Cache current file
      cacheFile(fileUrl).then(setCachedFileUrl)

      // Preload adjacent files
      const displayFiles = filteredFiles() // Use filteredFiles for context
      const currentIndex = displayFiles.findIndex((f) => f.id === selectedFile.id)
      if (currentIndex !== -1 && displayFiles.length > 1) {
        const prevIndex = currentIndex > 0 ? currentIndex - 1 : displayFiles.length - 1
        const nextIndex = currentIndex < displayFiles.length - 1 ? currentIndex + 1 : 0

        const prevUrl = displayFiles[prevIndex]?.current_version?.file_url
        const nextUrl = displayFiles[nextIndex]?.current_version?.file_url

        if (prevUrl) preloadFile(prevUrl)
        if (nextUrl) preloadFile(nextUrl)
      }
    } else {
      setCachedFileUrl(null)
    }
  }, [selectedFile, selectedVersionId, filteredFiles, cacheFile, preloadFile, getSelectedVersionUrl])

  const getVersionFeedback = useCallback(() => {
    if (!selectedFile?.feedback) return []
    const versionId = selectedVersionId || selectedFile.current_version_id
    return selectedFile.feedback.filter((fb) => fb.file_version_id === versionId)
  }, [selectedFile, selectedVersionId])

  const getCurrentVersionNumber = useCallback((): number => {
    if (!selectedFile) return 1
    const versions = selectedFile.versions || []
    // If we have versions, calculate based on array
    if (versions.length > 0) {
      const versionId = selectedVersionId || selectedFile.current_version_id
      const idx = versions.findIndex((v) => v.id === versionId)
      if (idx === -1) {
        // Version not found in array, assume it's the latest
        return versions.length
      }
      return versions.length - idx
    }
    // No versions array, default to 1
    return 1
  }, [selectedFile, selectedVersionId])

  const renderToast = () => {
    if (!showToast) return null
    return (
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[60] bg-foreground text-background px-4 py-2 rounded-full text-sm font-medium shadow-lg animate-in fade-in slide-in-from-top-2 duration-200 flex items-center gap-2">
        {showToast.type === "success" ? <CheckCircle2 className="h-4 w-4" /> : <Info className="h-4 w-4" />}
        {showToast.message}
      </div>
    )
  }

  const displayFiles = filteredFiles() // Use filteredFiles for the grid

  const counts = useMemo(
    () => ({
      all: files.length,
      pending: files.filter((f) => f.status === "pending").length,
      approved: files.filter((f) => f.status === "approved").length,
      changes: files.filter((f) => f.status === "needs_changes").length,
    }),
    [files],
  )

  const handleMarkupClick = useCallback((x: number, y: number, timestamp?: number, page?: number) => {
    setPendingMarkup({ x, y, timestamp, page })
    setTimeout(() => {
      feedbackInputRef.current?.focus()
    }, 0)
  }, [])

  const handleClearMarkup = useCallback(() => {
    setPendingMarkup(null)
  }, [])

  const toggleMarkupMode = useCallback(() => {
    setMarkupMode((prev) => !prev)
    if (markupMode) {
      setPendingMarkup(null)
    }
  }, [markupMode])

  const handleDeleteFeedback = async (feedbackId: string) => {
    if (!selectedFile) return

    // Optimistic update
    setFiles((prev) =>
      prev.map((f) =>
        f.id === selectedFile.id ? { ...f, feedback: (f.feedback || []).filter((fb) => fb.id !== feedbackId) } : f,
      ),
    )
    setSelectedFile((prev) =>
      prev ? { ...prev, feedback: (prev.feedback || []).filter((fb) => fb.id !== feedbackId) } : null,
    )

    try {
      await fetch("/api/deleteFeedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feedbackId }),
      })
    } catch {
      // Revert on error - refetch would be better but this is simpler
      toast("Failed to delete feedback", "info")
    }
  }

  const handleFeedbackClick = useCallback(
    (feedback: Feedback) => {
      if (!selectedFile) return

      // Highlight the feedback
      setHighlightedFeedbackId(feedback.id)

      // If video with timestamp, seek to it
      if (selectedFile.file_type === "video" && feedback.markup_timestamp != null && videoRef.current) {
        videoRef.current.currentTime = feedback.markup_timestamp
        videoRef.current.pause()
      }

      // Clear highlight after a delay
      setTimeout(() => setHighlightedFeedbackId(null), 3000)
    },
    [selectedFile],
  )

  const navigateFile = useCallback(
    (direction: number) => {
      if (!selectedFile) return

      const currentIndex = displayFiles.findIndex((f) => f.id === selectedFile.id)
      const newIndex = currentIndex + direction

      if (newIndex >= 0 && newIndex < displayFiles.length) {
        setSelectedFile(displayFiles[newIndex])
        setSelectedVersionId(null)
        setIsViewingOldVersion(false)
        setPendingMarkup(null)
        setMarkupMode(false)
        setHighlightedFeedbackId(null)
      }
    },
    [selectedFile, displayFiles],
  )

  const [cachedFileUrl, setCachedFileUrl] = useState<string | null>(null)

  if (files.length === 0) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">{project.name}</h1>
          <p className="text-muted-foreground">No files to review yet.</p>
        </div>
      </div>
    )
  }

  const approvedCount = counts.approved
  const totalFiles = counts.all
  const allApproved = approvedCount === totalFiles

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {renderToast()}

      {/* Header */}
      <header className="border-b border-border bg-card shrink-0">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between">
          <h1 className="text-lg sm:text-xl font-semibold truncate">{project.name}</h1>
          <div className="flex items-center gap-2 sm:gap-4">
            <span className="text-xs sm:text-sm text-muted-foreground hidden sm:inline">
              {approvedCount} of {totalFiles} approved
            </span>
            <span className="text-xs text-muted-foreground sm:hidden">
              {approvedCount}/{totalFiles}
            </span>
            {allApproved && files.length > 0 && (
              <span className="text-green-500 flex items-center gap-1 text-xs sm:text-sm">
                <CheckCircle2 className="h-4 w-4" />
                <span className="hidden sm:inline">Complete</span>
              </span>
            )}
          </div>
        </div>
      </header>

      {/* Filter tabs */}
      <div className="border-b border-border overflow-x-auto">
        <div className="max-w-[1280px] mx-auto px-4">
          <div className="flex items-center gap-1 py-2 min-w-max">
            {[
              { value: "to_review", label: "To Review", count: counts.pending },
              { value: "all", label: "All", count: counts.all },
              { value: "approved", label: "Approved", count: counts.approved },
              {
                value: "needs_changes",
                label: "Changes",
                count: counts.changes,
              },
            ].map((tab) => (
              <button
                key={tab.value}
                onClick={() => setFilterStatus(tab.value as typeof filterStatus)}
                className={`px-3 py-1.5 text-sm rounded-md transition-colors cursor-pointer ${
                  filterStatus === tab.value
                    ? "bg-foreground text-background font-medium"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                {tab.label} {tab.count > 0 && <span className="ml-1 opacity-70">({tab.count})</span>}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main content */}
      <main className="max-w-[1280px] mx-auto px-4 py-6 sm:py-8">
        {/* Success state */}
        {filterStatus === "to_review" && counts.pending === 0 && files.length > 0 && (
          <div className="text-center py-20">
            <div className="h-20 w-20 rounded-full bg-green-100 dark:bg-green-950/50 flex items-center justify-center mx-auto mb-6">
              {counts.approved === files.length ? (
                <PartyPopper className="h-10 w-10 text-green-600" />
              ) : (
                <CheckCircle2 className="h-10 w-10 text-green-600" />
              )}
            </div>
            <h3 className="text-2xl font-semibold mb-3">
              {counts.approved === files.length ? "All Done!" : "All Reviewed"}
            </h3>
            <p className="text-muted-foreground mb-8 max-w-md mx-auto">
              {counts.approved === files.length
                ? "You've approved all files. Thank you for your review!"
                : `${counts.approved} approved, ${counts.changes} need changes.`}
            </p>
            <Button variant="outline" onClick={() => setFilterStatus("all")} className="cursor-pointer">
              View All Files
            </Button>
          </div>
        )}

        {/* Empty state */}
        {displayFiles.length === 0 && !(filterStatus === "to_review" && counts.pending === 0 && files.length > 0) && (
          <div className="text-center py-20">
            <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <FileText className="h-7 w-7 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground">
              {filterStatus === "to_review" ? "No files to review." : `No ${filterStatus.replace("_", " ")} files.`}
            </p>
          </div>
        )}

        {displayFiles.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {displayFiles.map((file) => {
              const thumbnailUrl = file.current_version?.file_url
              const isApproved = file.status === "approved"
              const needsChanges = file.status === "needs_changes"
              const versionCount = file.versions?.length || 1
              return (
                <div
                  key={file.id}
                  className="overflow-hidden rounded-lg border bg-card group cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all"
                  onClick={() => {
                    setSelectedFile(file)
                    setSelectedVersionId(null)
                    setIsViewingOldVersion(false)
                    setPendingMarkup(null)
                    setMarkupMode(false)
                    setHighlightedFeedbackId(null)
                  }}
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
            })}
          </div>
        )}
      </main>

      {/* Review overlay */}
      {selectedFile && (
        <div className="fixed inset-0 bg-background z-50 flex flex-col">
          {/* Top bar */}
          <header className="h-12 sm:h-14 border-b border-border flex items-center justify-between px-3 sm:px-4 shrink-0 bg-background">
            <button
              onClick={() => {
                setSelectedFile(null)
                setPendingMarkup(null)
                setMarkupMode(false)
                setHighlightedFeedbackId(null)
              }}
              className="flex items-center gap-1 sm:gap-2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
              <span className="text-sm hidden sm:inline">Close</span>
            </button>
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm text-muted-foreground">
                {displayFiles.findIndex((f) => f.id === selectedFile.id) + 1} of {displayFiles.length}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowMobileSidebar(!showMobileSidebar)}
                className="md:hidden flex items-center gap-1 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <MessageSquare className="h-5 w-5" />
                {getVersionFeedback().length > 0 && (
                  <span className="text-xs bg-primary text-primary-foreground rounded-full px-1.5">
                    {getVersionFeedback().length}
                  </span>
                )}
              </button>
              <div className="w-8 hidden md:block" />
            </div>
          </header>

          {/* Main content */}
          <div className="flex-1 flex overflow-hidden relative">
            {/* File preview area */}
            <div className="flex-1 relative bg-muted/30 flex flex-col overflow-hidden">
              <button
                onClick={() => navigateFile(-1)}
                disabled={displayFiles.findIndex((f) => f.id === selectedFile.id) === 0}
                className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 z-10 h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-background/90 shadow-lg flex items-center justify-center opacity-80 hover:opacity-100 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-opacity"
              >
                <ChevronLeft className="h-5 w-5 sm:h-6 sm:w-6" />
              </button>
              <button
                onClick={() => navigateFile(1)}
                disabled={displayFiles.findIndex((f) => f.id === selectedFile.id) === displayFiles.length - 1}
                className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 z-10 h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-background/90 shadow-lg flex items-center justify-center opacity-80 hover:opacity-100 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-opacity"
              >
                <ChevronRight className="h-5 w-5 sm:h-6 sm:w-6" />
              </button>

              <div className="flex-1 overflow-hidden">
                {getSelectedVersionUrl() && (
                  <FileViewer
                    fileUrl={getSelectedVersionUrl()!}
                    fileName={selectedFile.name}
                    fileType={selectedFile.file_type as "image" | "video" | "pdf"}
                    cachedUrl={cachedFileUrlMemo}
                    markupMode={markupMode}
                    pendingMarkup={pendingMarkup}
                    onMarkupClick={handleMarkupClick}
                    onClearMarkup={handleClearMarkup}
                    feedbackWithMarkups={getVersionFeedback()}
                    onMarkupHover={setHighlightedFeedbackId}
                    highlightedFeedbackId={highlightedFeedbackId}
                    videoRef={videoRef}
                  />
                )}
              </div>
            </div>

            {/* Sidebar - Desktop always visible, Mobile slide-over */}
            <div
              className={`
              fixed md:relative inset-y-0 right-0 z-20
              w-full sm:w-80 bg-background border-l border-border flex flex-col shrink-0
              transform transition-transform duration-300 ease-in-out
              ${showMobileSidebar ? "translate-x-0" : "translate-x-full md:translate-x-0"}
            `}
            >
              {/* Mobile sidebar header */}
              <div className="md:hidden flex items-center justify-between px-4 py-3 border-b border-border">
                <h3 className="font-medium">Feedback</h3>
                <button
                  onClick={() => setShowMobileSidebar(false)}
                  className="text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              {/* Sidebar header */}
              <div className="px-4 py-2 border-b border-border shrink-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium truncate flex-1 text-sm">{selectedFile.name}</h3>
                  <span
                    className={`px-2 py-0.5 text-xs font-medium rounded-full shrink-0 ${
                      selectedFile.status === "approved"
                        ? "bg-green-500/10 text-green-600 dark:text-green-400"
                        : selectedFile.status === "needs_changes"
                          ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                          : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {selectedFile.status === "approved"
                      ? "Approved"
                      : selectedFile.status === "needs_changes"
                        ? "Changes"
                        : "Pending"}
                  </span>
                  {selectedFile.versions && selectedFile.versions.length > 1 ? (
                    <Select
                      value={selectedVersionId || selectedFile.current_version_id || ""}
                      onValueChange={(value) => {
                        setSelectedVersionId(value)
                        const isOld = value !== selectedFile.current_version_id
                        setIsViewingOldVersion(isOld)
                        setPendingMarkup(null) // Clear markup when switching versions
                        setMarkupMode(false) // Reset markup mode
                      }}
                    >
                      <SelectTrigger className="h-auto w-auto gap-0.5 px-2 py-0.5 text-xs text-muted-foreground border-0 bg-transparent shadow-none hover:bg-muted focus:ring-0 [&>svg]:hidden group rounded-full shrink-0">
                        <span>v{getCurrentVersionNumber()}</span>
                        <ChevronDown className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </SelectTrigger>
                      <SelectContent className="min-w-0">
                        {(selectedFile.versions || []).map((version, idx) => {
                          const versionNum = (selectedFile.versions?.length || 1) - idx
                          const isCurrent = version.id === selectedFile.current_version_id
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

              {(selectedFile.status === "pending" || selectedFile.status === "needs_changes") &&
                !isViewingOldVersion && (
                  <div className="p-4 border-b border-border space-y-3 shrink-0">
                    {selectedFile.status === "pending" && (
                      <Button onClick={handleApprove} className="w-full gap-2 h-11 cursor-pointer" size="lg">
                        <ThumbsUp className="h-4 w-4" />
                        Approve
                      </Button>
                    )}

                    <div className="space-y-2">
                      <Textarea
                        ref={feedbackInputRef}
                        placeholder="Add feedback... (Enter to send)"
                        value={feedbackText}
                        onChange={(e) => setFeedbackText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault()
                            handleSubmitFeedback()
                          }
                        }}
                        rows={2}
                        className="resize-none text-sm"
                      />
                      <div className="flex items-center gap-2">
                        <Button
                          onClick={handleSubmitFeedback}
                          disabled={!feedbackText.trim()}
                          size="sm"
                          variant="outline"
                          className="flex-1 cursor-pointer gap-2 bg-transparent"
                        >
                          <Send className="h-3 w-3" />
                          Send{pendingMarkup ? " with pin" : ""}
                        </Button>
                        <Button
                          variant={markupMode ? "default" : "ghost"}
                          size="sm"
                          onClick={toggleMarkupMode}
                          className={`cursor-pointer px-2 ${markupMode ? "" : "text-muted-foreground"}`}
                          title={markupMode ? "Click on file to place pin" : "Add markup pin"}
                        >
                          <MapPin className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                      {pendingMarkup && (
                        <p className="text-xs text-muted-foreground">
                          Pin placed
                          {pendingMarkup.timestamp != null ? ` at ${pendingMarkup.timestamp.toFixed(1)}s` : ""}
                          {pendingMarkup.page != null ? ` on page ${pendingMarkup.page}` : ""}
                        </p>
                      )}
                    </div>
                  </div>
                )}

              {/* Feedback history */}
              <div className="flex-1 overflow-auto p-4">
                {getVersionFeedback().length > 0 ? (
                  <div className="space-y-3">
                    <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Feedback</h4>
                    {getVersionFeedback().map((fb, idx) => (
                      <div
                        key={fb.id}
                        className={`group p-3 rounded-lg border transition-colors cursor-pointer ${
                          highlightedFeedbackId === fb.id
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-muted-foreground/30"
                        }`}
                        onClick={() => handleFeedbackClick(fb)}
                        onMouseEnter={() => fb.markup_x != null && setHighlightedFeedbackId(fb.id)}
                        onMouseLeave={() => setHighlightedFeedbackId(null)}
                      >
                        <div className="flex items-start gap-2">
                          {fb.markup_x != null && (
                            <span className="shrink-0 w-5 h-5 rounded-full bg-amber-500 text-white text-xs flex items-center justify-center font-medium">
                              {getVersionFeedback()
                                .filter((f) => f.markup_x != null)
                                .indexOf(fb) + 1}
                            </span>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm">{fb.text}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <p className="text-xs text-muted-foreground">
                                {new Date(fb.created_at).toLocaleDateString()}
                              </p>
                              {fb.markup_timestamp != null && (
                                <span className="text-xs text-muted-foreground">
                                  @ {fb.markup_timestamp.toFixed(1)}s
                                </span>
                              )}
                              {fb.markup_page != null && (
                                <span className="text-xs text-muted-foreground">on page {fb.markup_page}</span>
                              )}
                            </div>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDeleteFeedback(fb.id)
                            }}
                            className="opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-destructive transition-opacity"
                            title="Delete feedback"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : selectedFile?.status === "approved" ? (
                  <div className="flex flex-col items-center justify-center py-12 px-4">
                    <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center mb-4">
                      <Check className="h-6 w-6 text-emerald-500" />
                    </div>
                    <p className="text-sm font-medium text-foreground mb-1">File Approved</p>
                    <p className="text-xs text-muted-foreground text-center max-w-[200px]">
                      This file has been approved and is ready for delivery.
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 px-4">
                    <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
                      <MessageSquare className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <p className="text-sm font-medium text-foreground mb-1">No feedback yet</p>
                    <p className="text-xs text-muted-foreground text-center max-w-[200px]">
                      Click anywhere on the file to add a markup, or type below to leave general feedback.
                    </p>
                  </div>
                )}
              </div>

              {/* Bottom thumbnails quick navigation */}
              <div className="p-3 border-t border-border shrink-0">
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {displayFiles.map((file) => {
                    const thumbUrl = file.current_version?.file_url
                    const isActive = file.id === selectedFile?.id
                    const isApproved = file.status === "approved"
                    return (
                      <button
                        key={file.id}
                        onClick={() => {
                          setSelectedFile(file)
                          setSelectedVersionId(null)
                          setIsViewingOldVersion(false)
                          setPendingMarkup(null)
                          setMarkupMode(false)
                          setHighlightedFeedbackId(null)
                        }}
                        className={`relative h-12 w-12 rounded-md overflow-hidden shrink-0 cursor-pointer transition-all ${
                          isActive ? "ring-2 ring-primary" : "opacity-60 hover:opacity-100"
                        }`}
                      >
                        {file.file_type === "image" && thumbUrl ? (
                          <img src={thumbUrl || "/placeholder.svg"} alt="" className="h-full w-full object-cover" />
                        ) : file.file_type === "video" && thumbUrl ? (
                          <div className="relative h-full w-full">
                            <video src={thumbUrl} className="h-full w-full object-cover" muted />
                            <div className="absolute inset-0 flex items-center justify-center">
                              <Film className="h-6 w-6 text-white drop-shadow-lg" />
                            </div>
                          </div>
                        ) : file.file_type === "pdf" && thumbUrl ? (
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
        </div>
      )}

      {/* Mobile sidebar backdrop */}
      {showMobileSidebar && (
        <div className="fixed inset-0 bg-black/50 z-10 md:hidden" onClick={() => setShowMobileSidebar(false)} />
      )}
    </div>
  )
}
