"use client"

import type React from "react"

import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { FolderOpen, ExternalLink, Copy, Check } from "lucide-react"
import type { ProjectWithStats } from "@/lib/types"
import { formatDistanceToNow } from "date-fns"
import { useState } from "react"

interface ProjectsListProps {
  projects: ProjectWithStats[]
}

export function ProjectsList({ projects }: ProjectsListProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const copyShareLink = async (e: React.MouseEvent, projectId: string, shareId: string) => {
    e.preventDefault()
    e.stopPropagation()
    const url = `${window.location.origin}/p/${shareId}`
    await navigator.clipboard.writeText(url)
    setCopiedId(projectId)
    setTimeout(() => setCopiedId(null), 2000)
  }

  if (projects.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center mb-4">
          <FolderOpen className="h-7 w-7 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold mb-2">No projects yet</h3>
        <p className="text-sm text-muted-foreground text-center max-w-sm">
          Create your first project to start delivering work to your clients.
        </p>
      </div>
    )
  }

  return (
    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
      {projects.map((project) => {
        const progress = project.total_files > 0 ? Math.round((project.approved_files / project.total_files) * 100) : 0
        const isCopied = copiedId === project.id

        return (
          <Link key={project.id} href={`/dashboard/projects/${project.id}`}>
            <Card className="h-full hover:border-primary/50 transition-all cursor-pointer group">
              <CardContent className="p-6 space-y-3">
                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-base truncate">{project.name}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {formatDistanceToNow(new Date(project.created_at), { addSuffix: true })}
                    </p>
                  </div>
                  {/* Quick share button */}
                  {project.share_id && project.is_active && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => copyShareLink(e, project.id, project.share_id!)}
                    >
                      {isCopied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  )}
                </div>

                {/* Progress - reduced space-y from 2 to 1.5 */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      {project.total_files === 0
                        ? "No files"
                        : `${project.approved_files}/${project.total_files} approved`}
                    </span>
                    {project.total_files > 0 && (
                      <span className={`font-medium ${progress === 100 ? "text-green-600" : ""}`}>{progress}%</span>
                    )}
                  </div>
                  {project.total_files > 0 && <Progress value={progress} className="h-1.5" />}
                </div>

                {/* Status indicator */}
                <div className="flex items-center gap-2">
                  <div
                    className={`h-2 w-2 rounded-full ${project.is_active ? "bg-green-500" : "bg-muted-foreground"}`}
                  />
                  <span className="text-xs text-muted-foreground">{project.is_active ? "Active" : "Inactive"}</span>
                  {project.share_id && project.is_active && (
                    <>
                      <span className="text-muted-foreground">·</span>
                      <ExternalLink className="h-3 w-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">Shared</span>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </Link>
        )
      })}
    </div>
  )
}
