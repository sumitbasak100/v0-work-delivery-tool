import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { fileId, versionId, feedbackText } = await request.json()
    const supabase = await createClient()

    // Insert feedback
    const { error: feedbackError } = await supabase.from("feedback").insert({
      file_id: fileId,
      file_version_id: versionId,
      text: feedbackText,
    })

    if (feedbackError) {
      return NextResponse.json({ error: feedbackError.message }, { status: 500 })
    }

    const { error: statusError } = await supabase.from("files").update({ status: "needs_changes" }).eq("id", fileId)

    if (statusError) {
      return NextResponse.json({ error: statusError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: "Failed to add feedback" }, { status: 500 })
  }
}
