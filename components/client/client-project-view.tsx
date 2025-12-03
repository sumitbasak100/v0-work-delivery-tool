"use client"

import { useState } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { ClientFileGrid } from "@/components/client/client-file-grid"
import { CheckCircle2, ArrowRight } from "lucide-react"
import type { Project, FileWithDetails } from "@/lib/types"

interface ClientProjectViewProps {
  project: Project
  files: FileWithDetails[]
  totalFiles: number
  approvedFiles: number
  shareId: string
}

export function ClientProjectView({ project, files: initialFiles, shareId }: ClientProjectViewProps) {
  const [files, setFiles] = useState(initialFiles)
  const [showToast, setShowToast] = useState<string | null>(null)
  const supabase = createClient()

  const totalFiles = files.length
  const approvedCount = files.filter((f) => f.status === "approved").length
  const needsChangesCount = files.filter((f) => f.status === "needs_changes").length
  const pendingCount = files.filter((f) => f.status === "pending").length
  const allApproved = approvedCount === totalFiles && totalFiles > 0
  const hasOpenFeedback = needsChangesCount > 0
  const firstFile = files[0]

  const toast = (message: string) => {
    setShowToast(message)
    setTimeout(() => setShowToast(null), 2000)
  }

  const handleApproveAll = async () => {
    // Instant optimistic update
    setFiles((prev) => prev.map((f) => ({ ...f, status: "approved" as const })))
    toast("All files approved!")

    // Background sync
    const pendingIds = files.filter((f) => f.status !== "approved").map((f) => f.id)
    supabase.from("files").update({ status: "approved" }).in("id", pendingIds).then()
    fetch("/api/notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "all_approved", projectId: project.id }),
    }).catch(() => {})
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Toast notification */}
      {showToast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-foreground text-background px-4 py-2 rounded-full text-sm font-medium shadow-lg animate-in fade-in slide-in-from-top-2 duration-200 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4" />
          {showToast}
        </div>
      )}

      {/* Simplified header */}
      <header className="border-b border-border">
        <div className="container mx-auto px-4 py-6">
          <h1 className="text-2xl font-semibold">{project.name}</h1>
          {project.description && <p className="text-muted-foreground mt-1">{project.description}</p>}
        </div>
      </header>

      {/* Status bar - super simple */}
      <div className="border-b border-border bg-muted/30">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            {/* Progress indicator - simple text */}
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

            {/* Action buttons */}
            <div className="flex items-center gap-2">
              {firstFile && (
                <Link href={`/p/${shareId}/review/${firstFile.id}`}>
                  <Button variant="outline" className="gap-2 bg-transparent">
                    Start Review
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              )}
              {!allApproved && !hasOpenFeedback && pendingCount > 0 && (
                <Button onClick={handleApproveAll} className="gap-2">
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

      {/* File grid */}
      <main className="container mx-auto px-4 py-8">
        <ClientFileGrid files={files} shareId={shareId} />
      </main>
    </div>
  )
}
