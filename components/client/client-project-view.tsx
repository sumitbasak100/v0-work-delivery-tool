"use client"

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
} from "lucide-react"
import type { Project, FileWithVersions } from "@/lib/types"

interface ClientProjectViewProps {
  project: Project
  initialFiles: FileWithVersions[]
}

export function ClientProjectView({ project, initialFiles }: ClientProjectViewProps) {
  const [files, setFiles] = useState<FileWithVersions[]>(initialFiles)
  const [selectedFile, setSelectedFile] = useState<FileWithVersions | null>(null)
  const [filter, setFilter] = useState<"to_review" | "all" | "approved" | "needs_changes">("to_review")
  const [feedbackText, setFeedbackText] = useState("")
  const [showToast, setShowToast] = useState<string | null>(null)
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null)
  const [showAddFeedback, setShowAddFeedback] = useState(false)
  const [isViewingOldVersion, setIsViewingOldVersion] = useState(false) // Declare the variable here

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
      setIsViewingOldVersion(false) // Initialize the variable here
    }
  }, [selectedFile])

  const toast = useCallback((message: string) => {
    setShowToast(message)
    setTimeout(() => setShowToast(null), 2000)
  }, [])

  const handleApprove = async () => {
    if (!selectedFile) return
    const fileId = selectedFile.id
    const updatedFiles = files.map((f) => (f.id === fileId ? { ...f, status: "approved" } : f))
    setFiles(updatedFiles)
    setSelectedFile(null)
    toast("Approved!")
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
    toast("Feedback sent!")

    fetch("/api/addFeedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId: project.id, fileId, versionId, feedbackText }),
    }).catch(() => {})
    fetch("/api/updateFileStatus", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId: project.id, fileId, status: "needs_changes" }),
    }).catch(() => {})
  }

  const filteredFiles = () => {
    switch (filter) {
      case "to_review":
        return files.filter((f) => f.status === "pending")
      case "all":
        return files
      case "approved":
        return files.filter((f) => f.status === "approved")
      case "needs_changes":
        return files.filter((f) => f.status === "needs_changes")
      default:
        return files
    }
  }

  const allApproved = files.every((f) => f.status === "approved") && files.length > 0

  const getSelectedVersionUrl = () => {
    if (!selectedFile) return ""
    if (!selectedVersionId || selectedVersionId === selectedFile.current_version_id) {
      return selectedFile.current_version?.file_url || ""
    }
    const version = selectedFile.versions?.find((v) => v.id === selectedVersionId)
    return version?.file_url || selectedFile.current_version?.file_url || ""
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
      <header className="border-b border-border">
        <div className="max-w-[1280px] mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold">{project.name}</h1>
              {project.description && <p className="text-muted-foreground mt-1">{project.description}</p>}
            </div>
          </div>
        </div>
      </header>

      {/* Status bar */}
      <div className="border-b border-border bg-muted/30">
        <div className="max-w-[1280px] mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-green-500" />
                <span className="text-sm">{files.filter((f) => f.status === "approved").length} approved</span>
              </div>
              {files.filter((f) => f.status === "needs_changes").length > 0 && (
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-amber-500" />
                  <span className="text-sm">
                    {files.filter((f) => f.status === "needs_changes").length} needs changes
                  </span>
                </div>
              )}
              {files.filter((f) => f.status === "pending").length > 0 && (
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-muted-foreground" />
                  <span className="text-sm">{files.filter((f) => f.status === "pending").length} pending</span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              {!allApproved &&
                files.filter((f) => f.status === "pending").length > 0 &&
                files.filter((f) => f.status === "needs_changes").length === 0 && (
                  <Button
                    onClick={() => setFiles(files.map((f) => ({ ...f, status: "approved" })))}
                    className="gap-2 cursor-pointer"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Approve All
                  </Button>
                )}
              {allApproved && (
                <div className="flex items-center gap-2 text-green-600 bg-green-50 dark:bg-green-950/30 px-4 py-2 rounded-full">
                  <CheckCircle2 className="h-5 w-5" />
                  <span className="font-medium">All Approved</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="border-b border-border">
        <div className="max-w-[1280px] mx-auto px-4">
          <div className="flex items-center gap-1 py-2">
            {[
              { value: "to_review", label: "To Review", count: files.filter((f) => f.status === "pending").length },
              { value: "all", label: "All", count: files.length },
              { value: "approved", label: "Approved", count: files.filter((f) => f.status === "approved").length },
              {
                value: "needs_changes",
                label: "Needs Changes",
                count: files.filter((f) => f.status === "needs_changes").length,
              },
            ].map((tab) => (
              <button
                key={tab.value}
                onClick={() => setFilter(tab.value)}
                className={`px-3 py-2 text-sm rounded-md transition-colors cursor-pointer ${
                  filter === tab.value
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
        {/* Success state when all reviewed */}
        {filter === "to_review" && files.filter((f) => f.status === "pending").length === 0 && files.length > 0 && (
          <div className="text-center py-16">
            <div className="h-20 w-20 rounded-full bg-green-100 dark:bg-green-950/50 flex items-center justify-center mx-auto mb-4">
              {allApproved ? (
                <PartyPopper className="h-10 w-10 text-green-600" />
              ) : (
                <CheckCircle2 className="h-10 w-10 text-green-600" />
              )}
            </div>
            <h3 className="text-xl font-semibold mb-2">{allApproved ? "All Done!" : "All Files Reviewed"}</h3>
            <p className="text-muted-foreground mb-6">
              {allApproved
                ? "You've approved all files. Great work!"
                : `You've reviewed all files. ${files.filter((f) => f.status === "approved").length} approved, ${files.filter((f) => f.status === "needs_changes").length} need changes.`}
            </p>
            <Button variant="outline" onClick={() => setFilter("all")} className="cursor-pointer">
              View All Files
            </Button>
          </div>
        )}

        {/* Empty state */}
        {filteredFiles().length === 0 &&
          !(filter === "to_review" && files.filter((f) => f.status === "pending").length === 0 && files.length > 0) && (
            <div className="text-center py-16">
              <p className="text-muted-foreground">
                {filter === "to_review" ? "No files to review yet." : `No ${filter.replace("_", " ")} files.`}
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
          {/* Top bar */}
          <header className="h-14 border-b border-border flex items-center justify-between px-4 shrink-0">
            <button
              onClick={() => setSelectedFile(null)}
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
              <span className="text-sm hidden sm:inline">Back</span>
            </button>
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium">
                {files.indexOf(selectedFile) + 1} of {files.length}
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
                onClick={() => setSelectedFile(files[files.indexOf(selectedFile) - 1])}
                disabled={files.indexOf(selectedFile) === 0}
                className="absolute left-2 top-1/2 -translate-y-1/2 z-10 h-12 w-12 rounded-full bg-background/90 shadow-lg flex items-center justify-center opacity-80 hover:opacity-100 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
              <button
                onClick={() => setSelectedFile(files[files.indexOf(selectedFile) + 1])}
                disabled={files.indexOf(selectedFile) === files.length - 1}
                className="absolute right-2 top-1/2 -translate-y-1/2 z-10 h-12 w-12 rounded-full bg-background/90 shadow-lg flex items-center justify-center opacity-80 hover:opacity-100 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
              >
                <ChevronRight className="h-6 w-6" />
              </button>

              <div className="flex-1 overflow-hidden">
                {getSelectedVersionUrl() && (
                  <FileViewer
                    fileUrl={getSelectedVersionUrl()}
                    fileName={selectedFile.name}
                    fileType={selectedFile.file_type as "image" | "video" | "pdf"}
                  />
                )}
              </div>
            </div>

            {/* Sidebar */}
            <div className="w-80 border-l border-border flex flex-col shrink-0 overflow-hidden">
              {/* File info */}
              <div className="p-4 border-b border-border shrink-0">
                <h3 className="font-semibold truncate">{selectedFile.name}</h3>
                <div className="flex items-center gap-2 mt-2">
                  {selectedFile.versions && selectedFile.versions.length > 1 ? (
                    <Select
                      value={selectedVersionId || selectedFile.current_version_id || ""}
                      onValueChange={(val) => {
                        setSelectedVersionId(val)
                        setIsViewingOldVersion(val !== selectedFile.current_version_id)
                      }}
                    >
                      <SelectTrigger className="h-auto w-auto gap-0.5 p-0 text-xs text-muted-foreground border-0 bg-transparent hover:text-foreground focus:ring-0 group">
                        <span>
                          v
                          {selectedFile.versions.length -
                            selectedFile.versions.findIndex(
                              (v) => v.id === (selectedVersionId || selectedFile.current_version_id),
                            )}
                        </span>
                        <ChevronDown className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </SelectTrigger>
                      <SelectContent>
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
                    <span className="text-xs text-muted-foreground">v1</span>
                  )}
                  {selectedFile.status === "approved" && (
                    <span className="text-xs bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 px-2 py-1 rounded-full">
                      Approved
                    </span>
                  )}
                  {selectedFile.status === "needs_changes" && (
                    <span className="text-xs bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 px-2 py-1 rounded-full">
                      Needs Changes
                    </span>
                  )}
                  {selectedFile.status === "pending" && (
                    <span className="text-xs bg-muted text-muted-foreground px-2 py-1 rounded-full">
                      Pending Review
                    </span>
                  )}
                </div>
              </div>

              {selectedFile.status === "pending" && !isViewingOldVersion && (
                <div className="p-4 border-b border-border shrink-0">
                  <Button onClick={handleApprove} className="w-full gap-2 cursor-pointer mb-3">
                    <Check className="h-4 w-4" />
                    Approve
                  </Button>
                  <div className="space-y-2">
                    <Textarea
                      placeholder="Describe what changes are needed..."
                      value={feedbackText}
                      onChange={(e) => setFeedbackText(e.target.value)}
                      rows={3}
                      className="resize-none"
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey && feedbackText.trim()) {
                          e.preventDefault()
                          handleSubmitFeedback()
                        }
                      }}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleSubmitFeedback}
                      disabled={!feedbackText.trim()}
                      className="w-full gap-2 cursor-pointer bg-transparent"
                    >
                      <Send className="h-3.5 w-3.5" />
                      Request Changes
                    </Button>
                  </div>
                </div>
              )}

              {selectedFile.status === "needs_changes" && !isViewingOldVersion && (
                <div className="p-4 border-b border-border shrink-0">
                  <p className="text-sm text-muted-foreground mb-3">Add more feedback:</p>
                  <div className="space-y-2">
                    <Textarea
                      placeholder="Add feedback..."
                      value={feedbackText}
                      onChange={(e) => setFeedbackText(e.target.value)}
                      rows={2}
                      className="resize-none"
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey && feedbackText.trim()) {
                          e.preventDefault()
                          handleSubmitFeedback()
                        }
                      }}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleSubmitFeedback}
                      disabled={!feedbackText.trim()}
                      className="w-full gap-2 cursor-pointer bg-transparent"
                    >
                      <Send className="h-3.5 w-3.5" />
                      Send Feedback
                    </Button>
                  </div>
                </div>
              )}

              {selectedFile.status === "approved" && !isViewingOldVersion && (
                <div className="p-4 border-b border-border shrink-0">
                  <p className="text-sm text-muted-foreground mb-3">Want to add feedback anyway?</p>
                  <div className="space-y-2">
                    <Textarea
                      placeholder="Add feedback..."
                      value={feedbackText}
                      onChange={(e) => setFeedbackText(e.target.value)}
                      rows={2}
                      className="resize-none"
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey && feedbackText.trim()) {
                          e.preventDefault()
                          handleSubmitFeedback()
                        }
                      }}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleSubmitFeedback}
                      disabled={!feedbackText.trim()}
                      className="w-full gap-2 cursor-pointer bg-transparent"
                    >
                      <Send className="h-3.5 w-3.5" />
                      Send Feedback
                    </Button>
                  </div>
                </div>
              )}

              <div className="flex-1 overflow-auto p-4">
                <h4 className="text-sm font-medium mb-3">
                  Feedback{" "}
                  {selectedVersionId &&
                    selectedFile.versions &&
                    `for v${selectedFile.versions.length - selectedFile.versions.findIndex((v) => v.id === selectedVersionId)}`}
                </h4>
                {selectedFile.feedback && selectedFile.feedback.length > 0 ? (
                  <div className="space-y-3">
                    {selectedFile.feedback.map((fb) => (
                      <div key={fb.id} className="p-3 bg-muted rounded-lg">
                        <p className="text-sm">{fb.text}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(fb.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No feedback for this version yet.</p>
                )}
              </div>

              <div className="border-t border-border p-3 shrink-0">
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {filteredFiles().map((file, idx) => {
                    const isActive = file === selectedFile
                    const thumbnailUrl = file.current_version?.file_url
                    return (
                      <button
                        key={file.id}
                        onClick={() => {
                          setSelectedFile(file)
                          setIsViewingOldVersion(false)
                        }}
                        className={`shrink-0 w-12 h-12 rounded-md overflow-hidden border-2 transition-all cursor-pointer ${
                          isActive ? "border-primary" : "border-transparent hover:border-muted-foreground/30"
                        }`}
                      >
                        {file.file_type === "image" && thumbnailUrl ? (
                          <Image
                            src={thumbnailUrl || "/placeholder.svg"}
                            alt={file.name}
                            width={48}
                            height={48}
                            className="w-full h-full object-cover"
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
