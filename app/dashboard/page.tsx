import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { DashboardHeader } from "@/components/dashboard/header"
import { ProjectsList } from "@/components/dashboard/projects-list"
import { CreateProjectDialog } from "@/components/dashboard/create-project-dialog"

export default async function DashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  // Fetch projects with file stats
  const { data: projects } = await supabase
    .from("projects")
    .select(`
      *,
      files(id, status)
    `)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })

  // Transform projects to include stats
  const projectsWithStats =
    projects?.map((project) => {
      const files = project.files || []
      return {
        ...project,
        files: undefined,
        total_files: files.length,
        approved_files: files.filter((f: { status: string }) => f.status === "approved").length,
      }
    }) || []

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader user={user} />
      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Projects</h1>
            <p className="text-muted-foreground mt-1">Manage your work delivery projects</p>
          </div>
          <CreateProjectDialog />
        </div>
        <ProjectsList projects={projectsWithStats} />
      </main>
    </div>
  )
}
