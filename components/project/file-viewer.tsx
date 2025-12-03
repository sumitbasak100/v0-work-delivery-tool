"use client"

import { useState } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { StatusBadge } from "@/components/ui/status-badge"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Check, MessageSquare, History } from "lucide-react"
import type { FileWithDetails, FileStatus } from "@/lib/types"
import { formatDistanceToNow } from "date-fns"

interface FileViewerProps {
  file: FileWithDetails
  files: FileWithDetails[]
  currentIndex: number
  isOwner?: boolean
  onClose: () => void
  onPrevious: () => void
  onNext: () => void
}

export function FileViewer({
  file,
  files,
  currentIndex,
  isOwner = false,
  onClose,
  onPrevious,
  onNext,
}: FileViewerProps) {
  const [zoom, setZoom] = useState(1)
  const [showFeedback, setShowFeedback] = useState(false)
  const [feedbackText, setFeedbackText] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [showVersions, setShowVersions] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const fileUrl = file.current_version?.file_url

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 0.25, 3))
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 0.25, 0.5))

  const handleApprove = async () => {
    setIsSaving(true)
    await supabase
      .from("files")
      .update({ status: "approved" as FileStatus })
      .eq("id", file.id)
    setIsSaving(false)
    router.refresh()
    onClose()
  }

  const handleNeedsChanges = async () => {
    if (!feedbackText.trim()) {
      setShowFeedback(true)
      return
    }

    setIsSaving(true)

    // Add feedback
    await supabase.from("feedback").insert({
      file_id: file.id,
      file_version_id: file.current_version_id,
      text: feedbackText.trim(),
    })

    // Update status
    await supabase
      .from("files")
      .update({ status: "needs_changes" as FileStatus })
      .eq("id", file.id)

    setIsSaving(false)
    setFeedbackText("")
    setShowFeedback(false)
    router.refresh()
    onClose()
  }

  const renderContent = () => {
    if (!fileUrl) {
      return (
        <div className="flex items-center justify-center h-full">
          <p className="text-muted-foreground">No file preview available</p>
        </div>
      )
    }

    if (file.file_type === "image") {
      return (
        <div
          className="relative w-full h-full flex items-center justify-center overflow-auto"
          style={{ transform: `scale(${zoom})`, transformOrigin: "center center" }}
        >
          <Image
            src={fileUrl || "/placeholder.svg"}
            alt={file.name}
            width={1200}
            height={800}
            className="max-w-full max-h-full object-contain"
            priority
          />
        </div>
      )
    }

    if (file.file_type === "video") {
      return <video src={fileUrl} controls className="max-w-full max-h-full" autoPlay />
    }

    if (file.file_type === "pdf") {
      return <iframe src={fileUrl} className="w-full h-full" title={file.name} />
    }

    return null
  }

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="max-w-6xl h-[90vh] p-0 gap-0">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-3">
            <h3 className="font-semibold truncate max-w-md">{file.name}</h3>
            <StatusBadge status={file.status} />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {currentIndex + 1} of {files.length}
            </span>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Main content area */}
        <div className="flex flex-1 overflow-hidden">
          {/* File preview */}
          <div className="flex-1 relative bg-muted/30 flex items-center justify-center">
            {/* Navigation buttons */}
            <Button
              variant="ghost"
              size="icon"
              className="absolute left-2 top-1/2 -translate-y-1/2 z-10 bg-background/80 hover:bg-background"
              onClick={onPrevious}
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-2 top-1/2 -translate-y-1/2 z-10 bg-background/80 hover:bg-background"
              onClick={onNext}
            >
              <ChevronRight className="h-5 w-5" />
            </Button>

            {/* Zoom controls for images */}
            {file.file_type === "image" && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 bg-background/80 rounded-lg p-1">
                <Button variant="ghost" size="icon" onClick={handleZoomOut}>
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <span className="text-sm w-12 text-center">{Math.round(zoom * 100)}%</span>
                <Button variant="ghost" size="icon" onClick={handleZoomIn}>
                  <ZoomIn className="h-4 w-4" />
                </Button>
              </div>
            )}

            {renderContent()}
          </div>

          {/* Sidebar */}
          <div className="w-80 border-l flex flex-col">
            {/* Actions */}
            {!isOwner && (
              <div className="p-4 border-b space-y-3">
                <Button className="w-full gap-2" onClick={handleApprove} disabled={isSaving}>
                  <Check className="h-4 w-4" />
                  Approve
                </Button>
                <Button
                  variant="outline"
                  className="w-full gap-2 bg-transparent"
                  onClick={() => setShowFeedback(!showFeedback)}
                >
                  <MessageSquare className="h-4 w-4" />
                  Needs Changes
                </Button>

                {showFeedback && (
                  <div className="space-y-2">
                    <Textarea
                      placeholder="Describe what changes are needed..."
                      value={feedbackText}
                      onChange={(e) => setFeedbackText(e.target.value)}
                      rows={3}
                    />
                    <Button
                      size="sm"
                      onClick={handleNeedsChanges}
                      disabled={isSaving || !feedbackText.trim()}
                      className="w-full"
                    >
                      {isSaving ? "Saving..." : "Submit Feedback"}
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Feedback history */}
            <div className="flex-1 overflow-auto p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium text-sm">Feedback</h4>
                {isOwner && file.versions && file.versions.length > 1 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowVersions(!showVersions)}
                    className="gap-1 text-xs"
                  >
                    <History className="h-3 w-3" />
                    {file.versions.length} versions
                  </Button>
                )}
              </div>

              {file.feedback && file.feedback.length > 0 ? (
                <div className="space-y-3">
                  {file.feedback.map((fb) => (
                    <div key={fb.id} className="bg-muted rounded-lg p-3">
                      <p className="text-sm">{fb.text}</p>
                      <p className="text-xs text-muted-foreground mt-2">
                        {formatDistanceToNow(new Date(fb.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No feedback yet</p>
              )}

              {/* Version history */}
              {showVersions && file.versions && (
                <div className="mt-4 pt-4 border-t">
                  <h4 className="font-medium text-sm mb-3">Version History</h4>
                  <div className="space-y-2">
                    {file.versions.map((version, index) => (
                      <div
                        key={version.id}
                        className={`text-sm p-2 rounded ${
                          version.id === file.current_version_id ? "bg-primary/10 border border-primary/20" : "bg-muted"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span>Version {file.versions!.length - index}</span>
                          {version.id === file.current_version_id && (
                            <span className="text-xs text-primary">Current</span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(version.created_at), { addSuffix: true })}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
