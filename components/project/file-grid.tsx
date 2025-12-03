"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { FileViewer } from "@/components/project/file-viewer"
import { FileCard } from "@/components/project/file-card"
import { Upload } from "lucide-react"
import type { FileWithDetails } from "@/lib/types"

interface FileGridProps {
  files: FileWithDetails[]
  projectId: string
  isOwner?: boolean
}

export function FileGrid({ files, projectId, isOwner = false }: FileGridProps) {
  const [selectedFile, setSelectedFile] = useState<FileWithDetails | null>(null)
  const [selectedIndex, setSelectedIndex] = useState(0)

  const handleOpenFile = (file: FileWithDetails, index: number) => {
    setSelectedFile(file)
    setSelectedIndex(index)
  }

  const handlePrevious = () => {
    const newIndex = selectedIndex > 0 ? selectedIndex - 1 : files.length - 1
    setSelectedIndex(newIndex)
    setSelectedFile(files[newIndex])
  }

  const handleNext = () => {
    const newIndex = selectedIndex < files.length - 1 ? selectedIndex + 1 : 0
    setSelectedIndex(newIndex)
    setSelectedFile(files[newIndex])
  }

  if (files.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-16">
          <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
            <Upload className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium mb-1">No files yet</h3>
          <p className="text-sm text-muted-foreground text-center max-w-sm">
            Upload files to share with your client for review and approval.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {files.map((file, index) => (
          <FileCard key={file.id} file={file} onClick={() => handleOpenFile(file, index)} isOwner={isOwner} />
        ))}
      </div>

      {selectedFile && (
        <FileViewer
          file={selectedFile}
          files={files}
          currentIndex={selectedIndex}
          isOwner={isOwner}
          onClose={() => setSelectedFile(null)}
          onPrevious={handlePrevious}
          onNext={handleNext}
        />
      )}
    </>
  )
}
