import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const { projectId } = await request.json()

    if (!projectId) {
      return NextResponse.json({ error: "Project ID required" }, { status: 400 })
    }

    const supabase = await createClient()

    // Delete all files first (this will cascade to versions and feedback)
    await supabase.from("files").delete().eq("project_id", projectId)

    // Then delete the project
    const { error } = await supabase.from("projects").delete().eq("id", projectId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Delete failed" }, { status: 500 })
  }
}
