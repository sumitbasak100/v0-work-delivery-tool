import { createClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import { ClientProjectView } from "@/components/client/client-project-view"
import { PasswordGate } from "@/components/client/password-gate"
import { cookies } from "next/headers"
import type { FileWithDetails } from "@/lib/types"

interface ClientPageProps {
  params: Promise<{ shareId: string }>
}

export default async function ClientPage({ params }: ClientPageProps) {
  const { shareId } = await params
  const supabase = await createClient()

  // Fetch project by share_id
  const { data: project, error } = await supabase
    .from("projects")
    .select("*")
    .eq("share_id", shareId)
    .eq("is_active", true)
    .single()

  if (error || !project) {
    notFound()
  }

  // Check password if required
  if (project.password) {
    const cookieStore = await cookies()
    const authCookie = cookieStore.get(`project_auth_${project.id}`)

    if (authCookie?.value !== project.password) {
      return <PasswordGate projectId={project.id} projectName={project.name} />
    }
  }

  const { data: files } = await supabase
    .from("files")
    .select("*")
    .eq("project_id", project.id)
    .order("created_at", { ascending: true })

  // Get all file IDs
  const fileIds = (files || []).map((f) => f.id)

  // Fetch versions for all files
  const { data: allVersions } =
    fileIds.length > 0
      ? await supabase
          .from("file_versions")
          .select("*")
          .in("file_id", fileIds)
          .order("created_at", { ascending: false })
      : { data: [] }

  // Fetch feedback for all files
  const { data: allFeedback } =
    fileIds.length > 0
      ? await supabase.from("feedback").select("*").in("file_id", fileIds).order("created_at", { ascending: false })
      : { data: [] }

  // Combine data manually
  const filesWithDetails: FileWithDetails[] = (files || []).map((file) => {
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

  const totalFiles = filesWithDetails.length
  const approvedFiles = filesWithDetails.filter((f) => f.status === "approved").length

  return (
    <ClientProjectView
      project={project}
      files={filesWithDetails}
      totalFiles={totalFiles}
      approvedFiles={approvedFiles}
      shareId={shareId}
    />
  )
}
