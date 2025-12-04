import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const { fileId } = await request.json()

    if (!fileId) {
      return NextResponse.json({ error: "File ID required" }, { status: 400 })
    }

    const supabase = await createClient()

    // Delete the file (cascades to versions and feedback due to foreign keys)
    const { error } = await supabase.from("files").delete().eq("id", fileId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Delete failed" }, { status: 500 })
  }
}
