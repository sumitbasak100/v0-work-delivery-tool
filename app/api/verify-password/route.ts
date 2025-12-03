import { createClient } from "@/lib/supabase/server"
import { NextResponse, type NextRequest } from "next/server"
import { cookies } from "next/headers"

export async function POST(request: NextRequest) {
  try {
    const { projectId, password } = await request.json()

    const supabase = await createClient()

    const { data: project, error } = await supabase.from("projects").select("password").eq("id", projectId).single()

    if (error || !project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 })
    }

    if (project.password !== password) {
      return NextResponse.json({ error: "Invalid password" }, { status: 401 })
    }

    // Set auth cookie
    const cookieStore = await cookies()
    cookieStore.set(`project_auth_${projectId}`, password, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: "Verification failed" }, { status: 500 })
  }
}
