import { createClient } from "@/lib/supabase/server"
import { notFound, redirect } from "next/navigation"
import { cookies } from "next/headers"
import { FileReviewPage } from "@/components/client/file-review-page"
import type { FileWithDetails } from "@/lib/types"

interface ReviewPageProps {
  params: Promise<{ shareId: string; fileId: string }>
}

export default async function ReviewPage({ params }: ReviewPageProps) {
  const { shareId, fileId } = await params
  const supabase = await createClient()

  // Fetch project by share_id
  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("*")
    .eq("share_id", shareId)
    .eq("is_active", true)
    .single()

  if (projectError || !project) {
    notFound()
  }

  // Check password if required
  if (project.password) {
    const cookieStore = await cookies()
    const authCookie = cookieStore.get(`project_auth_${project.id}`)

    if (authCookie?.value !== project.password) {
      redirect(`/p/${shareId}`)
    }
  }

  // Fetch all files for navigation
  const { data: files } = await supabase
    .from("files")
    .select("*")
    .eq("project_id", project.id)
    .order("created_at", { ascending: true })

  if (!files || files.length === 0) {
    redirect(`/p/${shareId}`)
  }

  // Find current file index
  const currentFileIndex = files.findIndex((f) => f.id === fileId)
  if (currentFileIndex === -1) {
    redirect(`/p/${shareId}`)
  }

  // Get all file IDs
  const fileIds = files.map((f) => f.id)

  // Fetch versions for all files
  const { data: allVersions } = await supabase
    .from("file_versions")
    .select("*")
    .in("file_id", fileIds)
    .order("created_at", { ascending: false })

  // Fetch feedback for all files
  const { data: allFeedback } = await supabase
    .from("feedback")
    .select("*")
    .in("file_id", fileIds)
    .order("created_at", { ascending: false })

  // Combine data manually
  const filesWithDetails: FileWithDetails[] = files.map((file) => {
    const versions = (allVersions || []).filter((v) => v.file_id === file.id)
    const feedback = (allFeedback || []).filter((f) => f.file_id === file.id)
    const currentVersion = versions.find((v) => v.id === file.current_version_id) || versions[0]

    return {
      ...file,
      current_version: currentVersion,
      versions: versions,
      feedback: feedback,
    }
  })

  const currentFile = filesWithDetails[currentFileIndex]
  const totalFiles = filesWithDetails.length
  const approvedFiles = filesWithDetails.filter((f) => f.status === "approved").length

  return (
    <FileReviewPage
      project={project}
      file={currentFile}
      files={filesWithDetails}
      currentIndex={currentFileIndex}
      totalFiles={totalFiles}
      approvedFiles={approvedFiles}
      shareId={shareId}
    />
  )
}
