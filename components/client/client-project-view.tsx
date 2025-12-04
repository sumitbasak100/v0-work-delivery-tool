"use client"

import type React from "react"

import { useState, useEffect, useCallback } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { FileViewer } from "@/components/ui/file-viewer"
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
  Send,
  PartyPopper,
  ChevronDown,
  ThumbsUp,
  Info,
} from "lucide-react"
import type { Project, FileWithVersions } from "@/lib/types"

interface ClientProjectViewProps {
  project: Project
  initialFiles: FileWithVersions[]
}

export function ClientProjectView({ project, initialFiles }: ClientProjectViewProps) {
  const [files, setFiles] = useState<FileWithVersions[]>(initialFiles)
  const [selectedFile, setSelectedFile] = useState<FileWithVersions | null>(null)
  const [filterStatus, setFilterStatus] = useState<"to_review" | "all" | "approved" | "needs_changes">("to_review")
  const [feedbackText, setFeedbackText] = useState("")
  const [showToast, setShowToast] = useState<{ message: string; type: "success" | "info" } | null>(null)
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null)
  const [isViewingOldVersion, setIsViewingOldVersion] = useState(false)

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
    } else {
      setSelectedVersionId(null)
    }
  }, [selectedFile])

  useEffect(() => {
    if (selectedFile) {
      setSelectedVersionId(selectedFile.current_version_id)
      setIsViewingOldVersion(false)
      setFeedbackText("")
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
    const fileId = selectedFile.id
    const versionId = selectedVersionId || selectedFile.current_version_id
    const newFeedback = {
      id: crypto.randomUUID(),
      file_id: fileId,
      file_version_id: versionId,
      text: feedbackText.trim(),
      created_at: new Date().toISOString(),
    }

    const updatedFiles = files.map((f) =>
      f.id === fileId ? { ...f, status: "needs_changes" as const, feedback: [newFeedback, ...(f.feedback || [])] } : f,
    )
    setFiles(updatedFiles)
    setSelectedFile(updatedFiles.find((f) => f.id === fileId) || null)
    setFeedbackText("")
    toast("Feedback sent!", "success")

    fetch("/api/addFeedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId: project.id, fileId, versionId, feedbackText: feedbackText.trim() }),
    }).catch(() => {})
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

  const getSelectedVersionUrl = () => {
    if (!selectedFile) return null
    if (selectedVersionId) {
      const version = selectedFile.versions?.find((v) => v.id === selectedVersionId)
      return version?.file_url || selectedFile.current_version?.file_url
    }
    return selectedFile.current_version?.file_url
  }

  const getVersionFeedback = () => {
    if (!selectedFile) return []
    const versionId = selectedVersionId || selectedFile.current_version_id
    return selectedFile.feedback?.filter((f) => f.file_version_id === versionId) || []
  }

  const allApproved = files.length > 0 && files.every((f) => f.status === "approved")
  const pendingCount = files.filter((f) => f.status === "pending").length
  const approvedCount = files.filter((f) => f.status === "approved").length

  const getCurrentVersionNumber = () => {
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
  }

  const renderToast = () => {
    if (!showToast) return null
    return (
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[60] bg-foreground text-background px-4 py-2 rounded-full text-sm font-medium shadow-lg animate-in fade-in slide-in-from-top-2 duration-200 flex items-center gap-2">
        {showToast.type === "success" ? <CheckCircle2 className="h-4 w-4" /> : <Info className="h-4 w-4" />}
        {showToast.message}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {renderToast()}

      {/* Header */}
      <header className="border-b border-border bg-card sticky top-0 z-40">
        <div className="max-w-[1280px] mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="font-semibold text-base">{project.name}</h1>
              <p className="text-xs text-muted-foreground">
                {pendingCount > 0
                  ? `${pendingCount} files to review`
                  : allApproved
                    ? "All approved"
                    : `${approvedCount}/${files.length} approved`}
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Filter tabs */}
      <div className="border-b border-border bg-background">
        <div className="max-w-[1280px] mx-auto px-4">
          <div className="flex items-center gap-1 py-2">
            {[
              { value: "to_review", label: "To Review", count: files.filter((f) => f.status === "pending").length },
              { value: "all", label: "All", count: files.length },
              { value: "approved", label: "Approved", count: files.filter((f) => f.status === "approved").length },
              {
                value: "needs_changes",
                label: "Changes",
                count: files.filter((f) => f.status === "needs_changes").length,
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

      {/* File grid */}
      <main className="flex-1 max-w-[1280px] mx-auto w-full px-4 py-8">
        {/* Success state */}
        {filterStatus === "to_review" && pendingCount === 0 && files.length > 0 && (
          <div className="text-center py-20">
            <div className="h-20 w-20 rounded-full bg-green-100 dark:bg-green-950/50 flex items-center justify-center mx-auto mb-6">
              {allApproved ? (
                <PartyPopper className="h-10 w-10 text-green-600" />
              ) : (
                <CheckCircle2 className="h-10 w-10 text-green-600" />
              )}
            </div>
            <h3 className="text-2xl font-semibold mb-3">{allApproved ? "All Done!" : "All Reviewed"}</h3>
            <p className="text-muted-foreground mb-8 max-w-md mx-auto">
              {allApproved
                ? "You've approved all files. Thank you for your review!"
                : `${approvedCount} approved, ${files.filter((f) => f.status === "needs_changes").length} need changes.`}
            </p>
            <Button variant="outline" onClick={() => setFilterStatus("all")} className="cursor-pointer">
              View All Files
            </Button>
          </div>
        )}

        {/* Empty state */}
        {filteredFiles().length === 0 && !(filterStatus === "to_review" && pendingCount === 0 && files.length > 0) && (
          <div className="text-center py-20">
            <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <FileText className="h-7 w-7 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground">
              {filterStatus === "to_review" ? "No files to review." : `No ${filterStatus.replace("_", " ")} files.`}
            </p>
          </div>
        )}

        {filteredFiles().length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {filteredFiles().map((file) => {
              const thumbnailUrl = file.current_version?.file_url
              const isApproved = file.status === "approved"
              const needsChanges = file.status === "needs_changes"
              const versionCount = file.versions?.length || 1
              return (
                <Card
                  key={file.id}
                  className="overflow-hidden group cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all"
                  onClick={() => setSelectedFile(file)}
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
                  </div>
                </Card>
              )
            })}
          </div>
        )}
      </main>

      {/* Review overlay */}
      {selectedFile && (
        <div className="fixed inset-0 bg-background z-50 flex flex-col">
          {/* Top bar - Remove version from header */}
          <header className="h-14 border-b border-border flex items-center justify-between px-4 shrink-0 bg-background">
            <button
              onClick={() => {
                setSelectedFile(null)
              }}
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
              <span className="text-sm hidden sm:inline">Close</span>
            </button>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {filteredFiles().findIndex((f) => f.id === selectedFile.id) + 1} of {filteredFiles().length}
              </span>
            </div>
            <div className="w-16" />
          </header>

          {/* Main content */}
          <div className="flex-1 flex overflow-hidden">
            {/* File preview area */}
            <div className="flex-1 relative bg-muted/30 flex flex-col overflow-hidden">
              {/* Navigation */}
              <button
                onClick={() => {
                  const currentIndex = filteredFiles().findIndex((f) => f.id === selectedFile.id)
                  if (currentIndex > 0) setSelectedFile(filteredFiles()[currentIndex - 1])
                }}
                disabled={filteredFiles().findIndex((f) => f.id === selectedFile.id) === 0}
                className="absolute left-4 top-1/2 -translate-y-1/2 z-10 h-12 w-12 rounded-full bg-background/90 shadow-lg flex items-center justify-center opacity-80 hover:opacity-100 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-opacity"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
              <button
                onClick={() => {
                  const currentIndex = filteredFiles().findIndex((f) => f.id === selectedFile.id)
                  if (currentIndex < filteredFiles().length - 1) setSelectedFile(filteredFiles()[currentIndex + 1])
                }}
                disabled={filteredFiles().findIndex((f) => f.id === selectedFile.id) === filteredFiles().length - 1}
                className="absolute right-4 top-1/2 -translate-y-1/2 z-10 h-12 w-12 rounded-full bg-background/90 shadow-lg flex items-center justify-center opacity-80 hover:opacity-100 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-opacity"
              >
                <ChevronRight className="h-6 w-6" />
              </button>

              <div className="flex-1 overflow-hidden">
                {getSelectedVersionUrl() && (
                  <FileViewer
                    fileUrl={getSelectedVersionUrl()!}
                    fileName={selectedFile.name}
                    fileType={selectedFile.file_type as "image" | "video" | "pdf"}
                  />
                )}
              </div>
            </div>

            {/* Sidebar - Reduced height of top section */}
            <div className="w-80 bg-background border-l border-border flex flex-col shrink-0">
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
                      onValueChange={(val) => {
                        setSelectedVersionId(val)
                        setIsViewingOldVersion(val !== selectedFile.current_version_id)
                      }}
                    >
                      <SelectTrigger className="h-auto w-auto gap-0.5 px-2 py-0.5 text-xs text-muted-foreground border-0 bg-transparent shadow-none hover:bg-muted focus:ring-0 [&>svg]:hidden group rounded-full shrink-0">
                        <span>v{getCurrentVersionNumber()}</span>
                        <ChevronDown className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </SelectTrigger>
                      <SelectContent className="min-w-0">
                        {selectedFile.versions.map((version, idx) => {
                          const versionNum = selectedFile.versions!.length - idx
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
                  ) : (
                    <span className="text-xs text-muted-foreground px-2 py-0.5 shrink-0">
                      v{getCurrentVersionNumber()}
                    </span>
                  )}
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
                      <Button
                        onClick={handleSubmitFeedback}
                        disabled={!feedbackText.trim()}
                        size="sm"
                        variant="outline"
                        className="w-full cursor-pointer gap-2 bg-transparent"
                      >
                        <Send className="h-3 w-3" />
                        Send Feedback
                      </Button>
                    </div>
                  </div>
                )}

              {/* Feedback history */}
              <div className="flex-1 overflow-auto p-4">
                {getVersionFeedback().length > 0 ? (
                  <div className="space-y-3">
                    <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Feedback</h4>
                    {getVersionFeedback().map((fb) => (
                      <div key={fb.id} className="bg-muted/50 rounded-lg p-3">
                        <p className="text-sm">{fb.text}</p>
                        <p className="text-xs text-muted-foreground mt-2">
                          {new Date(fb.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-sm text-muted-foreground">No feedback yet</p>
                  </div>
                )}
              </div>

              {/* Bottom thumbnails */}
              <div className="border-t border-border p-3 shrink-0">
                <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                  {filteredFiles().map((file) => {
                    const isActive = file.id === selectedFile.id
                    return (
                      <button
                        key={file.id}
                        onClick={() => setSelectedFile(file)}
                        className={`shrink-0 w-12 h-12 rounded-md overflow-hidden border-2 transition-colors cursor-pointer ${
                          isActive ? "border-primary" : "border-transparent hover:border-muted-foreground/50"
                        }`}
                      >
                        {file.file_type === "image" && file.current_version?.file_url ? (
                          <Image
                            src={file.current_version.file_url || "/placeholder.svg"}
                            alt={file.name}
                            width={48}
                            height={48}
                            className="object-cover w-full h-full"
                          />
                        ) : (
                          <div className="w-full h-full bg-muted flex items-center justify-center">
                            {file.file_type === "video" ? (
                              <Film className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <FileText className="h-4 w-4 text-muted-foreground" />
                            )}
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
    </div>
  )
}
