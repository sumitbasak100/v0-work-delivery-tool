"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { StatusBadge } from "@/components/ui/status-badge"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Check, MessageSquare, CheckCircle } from "lucide-react"
import type { FileWithDetails, FileStatus } from "@/lib/types"
import { formatDistanceToNow } from "date-fns"

interface ClientFileViewerProps {
  file: FileWithDetails
  files: FileWithDetails[]
  currentIndex: number
  onClose: () => void
  onPrevious: () => void
  onNext: () => void
  onFileUpdate: (file: FileWithDetails) => void
}

export function ClientFileViewer({
  file,
  files,
  currentIndex,
  onClose,
  onPrevious,
  onNext,
  onFileUpdate,
}: ClientFileViewerProps) {
  const [zoom, setZoom] = useState(1)
  const [showFeedback, setShowFeedback] = useState(false)
  const [feedbackText, setFeedbackText] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [savedMessage, setSavedMessage] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const fileUrl = file.current_version?.file_url

  useEffect(() => {
    setZoom(1)
    setShowFeedback(false)
    setFeedbackText("")
    setSavedMessage(null)
  }, [file.id])

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") onPrevious()
      if (e.key === "ArrowRight") onNext()
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [onPrevious, onNext, onClose])

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 0.25, 3))
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 0.25, 0.5))

  const showSavedMessage = (message: string) => {
    setSavedMessage(message)
    setTimeout(() => setSavedMessage(null), 2000)
  }

  const sendNotification = async (type: string) => {
    try {
      // Get project ID from file
      const { data: fileData } = await supabase.from("files").select("project_id").eq("id", file.id).single()

      if (fileData) {
        await fetch("/api/notify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type,
            projectId: fileData.project_id,
            fileId: file.id,
            fileName: file.name,
          }),
        })
      }
    } catch (error) {
      console.error("Failed to send notification:", error)
    }
  }

  const handleApprove = async () => {
    setIsSaving(true)

    const { error } = await supabase
      .from("files")
      .update({ status: "approved" as FileStatus })
      .eq("id", file.id)

    if (!error) {
      onFileUpdate({ ...file, status: "approved" })
      showSavedMessage("Approved!")

      // Send notification
      await sendNotification("approved")

      // Check if all files are now approved
      const allApproved = files.every((f) => (f.id === file.id ? true : f.status === "approved"))
      if (allApproved) {
        await sendNotification("all_approved")
      }

      router.refresh()
    }

    setIsSaving(false)
  }

  const handleSubmitFeedback = async () => {
    if (!feedbackText.trim()) return

    setIsSaving(true)

    const { data: newFeedback, error: feedbackError } = await supabase
      .from("feedback")
      .insert({
        file_id: file.id,
        file_version_id: file.current_version_id,
        text: feedbackText.trim(),
      })
      .select()
      .single()

    if (feedbackError) {
      setIsSaving(false)
      return
    }

    const { error: statusError } = await supabase
      .from("files")
      .update({ status: "needs_changes" as FileStatus })
      .eq("id", file.id)

    if (!statusError) {
      const updatedFeedback = [...(file.feedback || []), newFeedback]
      onFileUpdate({
        ...file,
        status: "needs_changes",
        feedback: updatedFeedback,
      })
      showSavedMessage("Feedback saved!")

      await sendNotification("feedback")

      setFeedbackText("")
      setShowFeedback(false)
      router.refresh()
    }

    setIsSaving(false)
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
            {savedMessage && (
              <span className="text-sm text-status-approved flex items-center gap-1 animate-in fade-in">
                <CheckCircle className="h-4 w-4" />
                {savedMessage}
              </span>
            )}
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
            <div className="p-4 border-b space-y-3">
              <Button
                className="w-full gap-2"
                onClick={handleApprove}
                disabled={isSaving || file.status === "approved"}
              >
                <Check className="h-4 w-4" />
                {file.status === "approved" ? "Approved" : "Approve"}
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
                    autoFocus
                  />
                  <Button
                    size="sm"
                    onClick={handleSubmitFeedback}
                    disabled={isSaving || !feedbackText.trim()}
                    className="w-full"
                  >
                    {isSaving ? "Saving..." : "Submit Feedback"}
                  </Button>
                </div>
              )}
            </div>

            <div className="flex-1 overflow-auto p-4">
              <h4 className="font-medium text-sm mb-3">Feedback History</h4>

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
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
