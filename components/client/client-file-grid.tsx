"use client"

import Image from "next/image"
import Link from "next/link"
import { Card } from "@/components/ui/card"
import { FileText, Film, Check, AlertCircle } from "lucide-react"
import type { FileWithDetails } from "@/lib/types"

interface ClientFileGridProps {
  files: FileWithDetails[]
  shareId: string
}

export function ClientFileGrid({ files, shareId }: ClientFileGridProps) {
  if (files.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground">No files to review yet.</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
      {files.map((file, index) => {
        const thumbnailUrl = file.current_version?.file_url
        const isApproved = file.status === "approved"
        const needsChanges = file.status === "needs_changes"

        return (
          <Link key={file.id} href={`/p/${shareId}/review/${file.id}`}>
            <Card className="overflow-hidden group cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all">
              <div className="aspect-square relative bg-muted">
                {/* Thumbnail */}
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

                {/* Status overlay */}
                {isApproved && (
                  <div className="absolute inset-0 bg-green-500/20 flex items-center justify-center">
                    <div className="h-10 w-10 rounded-full bg-green-500 flex items-center justify-center">
                      <Check className="h-6 w-6 text-white" />
                    </div>
                  </div>
                )}

                {/* Needs changes indicator */}
                {needsChanges && (
                  <div className="absolute top-2 right-2">
                    <div className="h-6 w-6 rounded-full bg-amber-500 flex items-center justify-center">
                      <AlertCircle className="h-4 w-4 text-white" />
                    </div>
                  </div>
                )}

                {/* File number */}
                <div className="absolute bottom-2 left-2 bg-background/80 backdrop-blur text-xs px-2 py-1 rounded-full font-medium">
                  {index + 1}
                </div>
              </div>

              {/* File name */}
              <div className="p-2.5">
                <p className="text-sm font-medium truncate">{file.name}</p>
              </div>
            </Card>
          </Link>
        )
      })}
    </div>
  )
}
