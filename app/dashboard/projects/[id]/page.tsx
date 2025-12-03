import { createClient } from "@/lib/supabase/server"
import { redirect, notFound } from "next/navigation"
import { OwnerProjectView } from "@/components/project/owner-project-view"
import type { FileWithDetails } from "@/lib/types"

interface ProjectPageProps {
  params: Promise<{ id: string }>
}

export default async function ProjectPage({ params }: ProjectPageProps) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  // Fetch project
  const { data: project, error } = await supabase
    .from("projects")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single()

  if (error || !project) {
    notFound()
  }

  const { data: files } = await supabase
    .from("files")
    .select("*")
    .eq("project_id", id)
    .order("created_at", { ascending: false })

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

  return <OwnerProjectView project={project} files={filesWithDetails} user={{ id: user.id, email: user.email }} />
}
