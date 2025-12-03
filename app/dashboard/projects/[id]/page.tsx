import { createClient } from "@/lib/supabase/server"
import { redirect, notFound } from "next/navigation"
import { DashboardHeader } from "@/components/dashboard/header"
import { ProjectHeader } from "@/components/project/project-header"
import { FileGrid } from "@/components/project/file-grid"
import { FileUploader } from "@/components/project/file-uploader"
import { ShareDialog } from "@/components/project/share-dialog"
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

  const totalFiles = filesWithDetails.length
  const approvedFiles = filesWithDetails.filter((f) => f.status === "approved").length

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader user={user} />
      <main className="container mx-auto px-4 py-8">
        <ProjectHeader project={project} totalFiles={totalFiles} approvedFiles={approvedFiles} />

        <div className="mt-8 flex flex-col lg:flex-row gap-6">
          <div className="flex-1">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Files</h2>
              <div className="flex items-center gap-2">
                <ShareDialog project={project} />
                <FileUploader projectId={project.id} />
              </div>
            </div>
            <FileGrid files={filesWithDetails} projectId={project.id} isOwner />
          </div>
        </div>
      </main>
    </div>
  )
}
