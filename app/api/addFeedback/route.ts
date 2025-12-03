import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { fileId, versionId, feedbackText } = await request.json()
    const supabase = await createClient()

    const { error } = await supabase.from("feedback").insert({
      file_id: fileId,
      file_version_id: versionId,
      text: feedbackText,
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: "Failed to add feedback" }, { status: 500 })
  }
}
