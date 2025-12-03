"use client"

import type React from "react"

import { useState, useEffect, useCallback, useRef } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { StatusBadge } from "@/components/ui/status-badge"
import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Check,
  X,
  Send,
  FileText,
  Film,
  CheckCircle2,
  Maximize,
  ArrowLeftRight,
  ArrowUpDown,
} from "lucide-react"
import type { Project, FileWithDetails, FileStatus } from "@/lib/types"

interface FileReviewPageProps {
  project: Project
  file: FileWithDetails
  files: FileWithDetails[]
  currentIndex: number
  totalFiles: number
  approvedFiles: number
  shareId: string
}

type FitMode = "none" | "width" | "height"

export function FileReviewPage({
  project,
  file: initialFile,
  files: initialFiles,
  currentIndex: initialIndex,
  totalFiles,
  approvedFiles: initialApprovedFiles,
  shareId,
}: FileReviewPageProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex)
  const [files, setFiles] = useState(initialFiles)
  const [zoom, setZoom] = useState(1)
  const [fitMode, setFitMode] = useState<FitMode>("none")
  const [feedbackText, setFeedbackText] = useState("")
  const [showToast, setShowToast] = useState<string | null>(null)
  const supabase = createClient()
  const feedbackInputRef = useRef<HTMLTextAreaElement>(null)
  const imageContainerRef = useRef<HTMLDivElement>(null)
  const imageRef = useRef<HTMLImageElement>(null)

  // Current file from local state
  const file = files[currentIndex]
  const fileUrl = file?.current_version?.file_url
  const approvedCount = files.filter((f) => f.status === "approved").length
  const hasPrev = currentIndex > 0
  const hasNext = currentIndex < files.length - 1

  const toast = (message: string) => {
    setShowToast(message)
    setTimeout(() => setShowToast(null), 2000)
  }

  const navigateToPrev = useCallback(() => {
    if (hasPrev) {
      setCurrentIndex((prev) => prev - 1)
      setZoom(1)
      setFitMode("none")
      setFeedbackText("")
    }
  }, [hasPrev])

  const navigateToNext = useCallback(() => {
    if (hasNext) {
      setCurrentIndex((prev) => prev + 1)
      setZoom(1)
      setFitMode("none")
      setFeedbackText("")
    }
  }, [hasNext])

  const selectFile = useCallback((index: number) => {
    setCurrentIndex(index)
    setZoom(1)
    setFitMode("none")
    setFeedbackText("")
  }, [])

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLInputElement) return
      if (e.key === "ArrowLeft") navigateToPrev()
      if (e.key === "ArrowRight") navigateToNext()
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [navigateToPrev, navigateToNext])

  const resetZoom = () => {
    setZoom(1)
    setFitMode("none")
  }

  const fitToWidth = () => {
    setFitMode("width")
    setZoom(1)
  }

  const fitToHeight = () => {
    setFitMode("height")
    setZoom(1)
  }

  const handleApprove = async () => {
    // Instant optimistic update
    const updatedFiles = files.map((f, idx) => (idx === currentIndex ? { ...f, status: "approved" as FileStatus } : f))
    setFiles(updatedFiles)
    toast("Approved!")

    // Background sync
    supabase.from("files").update({ status: "approved" }).eq("id", file.id).then()
    fetch("/api/notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "approved", projectId: project.id, fileId: file.id, fileName: file.name }),
    }).catch(() => {})

    // Auto-advance to next file after short delay
    if (hasNext) {
      setTimeout(() => navigateToNext(), 400)
    }
  }

  const handleSubmitFeedback = async () => {
    if (!feedbackText.trim()) return

    const newFeedback = {
      id: crypto.randomUUID(),
      file_id: file.id,
      file_version_id: file.current_version_id,
      text: feedbackText.trim(),
      created_at: new Date().toISOString(),
    }

    // Instant optimistic update
    const updatedFiles = files.map((f, idx) =>
      idx === currentIndex
        ? {
            ...f,
            status: "needs_changes" as FileStatus,
            feedback: [newFeedback, ...(f.feedback || [])],
          }
        : f,
    )
    setFiles(updatedFiles)
    setFeedbackText("")
    toast("Feedback sent!")

    // Background sync
    supabase
      .from("feedback")
      .insert({
        file_id: file.id,
        file_version_id: file.current_version_id,
        text: feedbackText.trim(),
      })
      .then()
    supabase.from("files").update({ status: "needs_changes" }).eq("id", file.id).then()
    fetch("/api/notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "feedback", projectId: project.id, fileId: file.id, fileName: file.name }),
    }).catch(() => {})
  }

  const getImageStyle = (): React.CSSProperties => {
    if (fitMode === "width") {
      return { width: "100%", height: "auto", maxWidth: "none" }
    }
    if (fitMode === "height") {
      return { height: "100%", width: "auto", maxWidth: "none" }
    }
    return { transform: `scale(${zoom})` }
  }

  const renderFilePreview = () => {
    if (!fileUrl) {
      return (
        <div className="flex items-center justify-center h-full">
          <p className="text-muted-foreground">No preview available</p>
        </div>
      )
    }

    if (file.file_type === "image") {
      return (
        <div ref={imageContainerRef} className="relative w-full h-full flex items-center justify-center overflow-auto">
          <div
            style={fitMode === "none" ? { transform: `scale(${zoom})` } : undefined}
            className={`transition-transform duration-150 ${fitMode === "width" ? "w-full" : ""} ${fitMode === "height" ? "h-full" : ""}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              ref={imageRef}
              src={fileUrl || "/placeholder.svg"}
              alt={file.name}
              style={fitMode !== "none" ? getImageStyle() : undefined}
              className={`${fitMode === "none" ? "max-w-none" : ""} object-contain rounded-lg shadow-2xl`}
            />
          </div>
        </div>
      )
    }

    if (file.file_type === "video") {
      return (
        <div className="flex items-center justify-center h-full p-4">
          <video src={fileUrl} controls className="max-w-full max-h-full rounded-lg shadow-2xl" autoPlay />
        </div>
      )
    }

    if (file.file_type === "pdf") {
      return <iframe src={fileUrl} className="w-full h-full" title={file.name} />
    }

    return null
  }

  if (!file) return null

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* Toast notification */}
      {showToast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-foreground text-background px-4 py-2 rounded-full text-sm font-medium shadow-lg animate-in fade-in slide-in-from-top-2 duration-200 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4" />
          {showToast}
        </div>
      )}

      {/* Minimal top bar */}
      <header className="h-14 border-b border-border flex items-center justify-between px-4 shrink-0">
        <Link
          href={`/p/${shareId}`}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="h-5 w-5" />
          <span className="text-sm hidden sm:inline">Back to gallery</span>
        </Link>
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium">
            {currentIndex + 1} of {totalFiles}
          </span>
          <span className="text-xs text-muted-foreground">({approvedCount} approved)</span>
        </div>
        <div className="w-24" />
      </header>

      {/* Main content area */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Left: File preview */}
        <div className="flex-1 relative bg-muted/30 flex flex-col min-w-0">
          {/* Navigation arrows */}
          <button
            onClick={navigateToPrev}
            disabled={!hasPrev}
            className="absolute left-2 top-1/2 -translate-y-1/2 z-10 h-12 w-12 rounded-full bg-background/90 shadow-lg flex items-center justify-center opacity-80 hover:opacity-100 transition-opacity disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <button
            onClick={navigateToNext}
            disabled={!hasNext}
            className="absolute right-2 top-1/2 -translate-y-1/2 z-10 h-12 w-12 rounded-full bg-background/90 shadow-lg flex items-center justify-center opacity-80 hover:opacity-100 transition-opacity disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronRight className="h-6 w-6" />
          </button>

          {/* File preview */}
          <div className="flex-1 overflow-auto p-4">{renderFilePreview()}</div>

          {file.file_type === "image" && (
            <div className="absolute bottom-4 left-4 flex items-center gap-1 bg-background/95 backdrop-blur rounded-lg px-2 py-1.5 shadow-lg border border-border">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => setZoom((z) => Math.max(0.25, z - 0.25))}
                disabled={fitMode !== "none"}
              >
                <ZoomOut className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs font-mono min-w-[52px]"
                onClick={resetZoom}
                title="Reset to 100%"
              >
                {fitMode === "none" ? `${Math.round(zoom * 100)}%` : "100%"}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => setZoom((z) => Math.min(4, z + 0.25))}
                disabled={fitMode !== "none"}
              >
                <ZoomIn className="h-3.5 w-3.5" />
              </Button>
              <div className="w-px h-5 bg-border mx-1" />
              <Button
                variant={fitMode === "width" ? "secondary" : "ghost"}
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={fitToWidth}
                title="Fit to width"
              >
                <ArrowLeftRight className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant={fitMode === "height" ? "secondary" : "ghost"}
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={fitToHeight}
                title="Fit to height"
              >
                <ArrowUpDown className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={resetZoom} title="Actual size">
                <Maximize className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </div>

        <div className="w-72 lg:w-80 border-l border-border flex flex-col bg-background shrink-0 overflow-hidden">
          {/* File info */}
          <div className="p-4 border-b border-border shrink-0">
            <div className="flex items-start justify-between gap-2">
              <h2 className="font-medium text-sm leading-tight truncate">{file.name}</h2>
              <StatusBadge status={file.status} />
            </div>
          </div>

          {/* Approve button */}
          <div className="p-4 border-b border-border shrink-0">
            <Button
              onClick={handleApprove}
              disabled={file.status === "approved"}
              className="w-full h-11 text-sm gap-2"
              variant={file.status === "approved" ? "secondary" : "default"}
            >
              <Check className="h-4 w-4" />
              {file.status === "approved" ? "Approved" : "Approve this file"}
            </Button>
          </div>

          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            <div className="p-4 shrink-0">
              <h3 className="text-sm font-medium mb-3">Leave feedback</h3>
              <div className="space-y-2">
                <Textarea
                  ref={feedbackInputRef}
                  placeholder="Type your feedback here..."
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                  rows={3}
                  className="resize-none text-sm"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault()
                      handleSubmitFeedback()
                    }
                  }}
                />
                <Button
                  size="sm"
                  className="w-full gap-2"
                  onClick={handleSubmitFeedback}
                  disabled={!feedbackText.trim()}
                >
                  <Send className="h-3.5 w-3.5" />
                  Send feedback
                </Button>
                <p className="text-xs text-muted-foreground text-center">Press Enter to send</p>
              </div>
            </div>

            {/* Feedback history - scrollable */}
            {file.feedback && file.feedback.length > 0 && (
              <div className="flex-1 overflow-auto border-t border-border">
                <div className="p-4">
                  <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
                    Feedback ({file.feedback.length})
                  </h3>
                  <div className="space-y-2">
                    {file.feedback.map((fb) => (
                      <div key={fb.id} className="bg-muted/50 rounded-lg p-3">
                        <p className="text-sm">{fb.text}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(fb.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="p-3 border-t border-border bg-muted/30 shrink-0">
            <div className="flex gap-1.5 overflow-x-auto pb-1">
              {files.map((f, idx) => {
                const isActive = idx === currentIndex
                const thumbUrl = f.current_version?.file_url

                return (
                  <button
                    key={f.id}
                    onClick={() => selectFile(idx)}
                    className="shrink-0 focus:outline-none focus:ring-2 focus:ring-primary rounded-md"
                  >
                    <div
                      className={`relative w-11 h-11 rounded-md overflow-hidden border-2 transition-all ${
                        isActive
                          ? "border-primary ring-1 ring-primary"
                          : "border-transparent hover:border-muted-foreground/40"
                      }`}
                    >
                      {f.file_type === "image" && thumbUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={thumbUrl || "/placeholder.svg"} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-muted flex items-center justify-center">
                          {f.file_type === "video" ? (
                            <Film className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <FileText className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                      )}
                      {f.status === "approved" && (
                        <div className="absolute inset-0 bg-green-500/30 flex items-center justify-center">
                          <Check className="h-4 w-4 text-green-600" />
                        </div>
                      )}
                      {f.status === "needs_changes" && (
                        <div className="absolute bottom-0 left-0 right-0 h-1 bg-amber-500" />
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
