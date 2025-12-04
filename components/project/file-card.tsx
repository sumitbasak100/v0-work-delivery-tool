"use client"

import Image from "next/image"
import { Card, CardContent } from "@/components/ui/card"
import { StatusBadge } from "@/components/ui/status-badge"
import { ReplaceFileDialog } from "@/components/project/replace-file-dialog"
import { DeleteFileDialog } from "@/components/project/delete-file-dialog"
import { FileText, Film, ImageIcon } from "lucide-react"
import type { FileWithDetails } from "@/lib/types"

interface FileCardProps {
  file: FileWithDetails
  onClick: () => void
  isOwner?: boolean
}

export function FileCard({ file, onClick, isOwner = false }: FileCardProps) {
  const thumbnailUrl = file.current_version?.thumbnail_url || file.current_version?.file_url

  const renderThumbnail = () => {
    if (file.file_type === "image" && thumbnailUrl) {
      return (
        <Image
          src={thumbnailUrl || "/placeholder.svg"}
          alt={file.name}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 50vw, 25vw"
          loading="lazy"
        />
      )
    }

    if (file.file_type === "video" && thumbnailUrl) {
      return (
        <div className="relative h-full w-full">
          <video src={thumbnailUrl} className="h-full w-full object-cover" muted playsInline preload="none" />
          <div className="absolute inset-0 flex items-center justify-center bg-black/20">
            <Film className="h-8 w-8 text-white" />
          </div>
        </div>
      )
    }

    if (file.file_type === "pdf") {
      return (
        <div className="flex items-center justify-center h-full bg-muted">
          <FileText className="h-10 w-10 text-muted-foreground" />
        </div>
      )
    }

    return (
      <div className="flex items-center justify-center h-full bg-muted">
        <ImageIcon className="h-10 w-10 text-muted-foreground" />
      </div>
    )
  }

  return (
    <Card className="overflow-hidden group">
      <div
        className="aspect-square relative bg-muted cursor-pointer hover:opacity-90 transition-opacity"
        onClick={onClick}
      >
        {renderThumbnail()}
        <div className="absolute top-2 right-2">
          <StatusBadge status={file.status} />
        </div>
      </div>
      <CardContent className="p-3">
        <p
          className="text-sm font-medium truncate cursor-pointer hover:text-primary transition-colors"
          title={file.name}
          onClick={onClick}
        >
          {file.name}
        </p>
        <div className="flex items-center justify-between mt-2">
          <div className="text-xs text-muted-foreground">
            {file.feedback && file.feedback.length > 0 && (
              <span>
                {file.feedback.length} comment{file.feedback.length !== 1 ? "s" : ""}
              </span>
            )}
            {file.versions && file.versions.length > 1 && <span className="ml-2">v{file.versions.length}</span>}
          </div>
          {isOwner && (
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <ReplaceFileDialog file={file} />
              <DeleteFileDialog file={file} />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
