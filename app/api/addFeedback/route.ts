import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { fileId, versionId, feedbackText, markup_x, markup_y, markup_timestamp, markup_page } = await request.json()
    const supabase = await createClient()

    const insertData: Record<string, unknown> = {
      file_id: fileId,
      file_version_id: versionId,
      text: feedbackText,
      markup_x: markup_x ?? null,
      markup_y: markup_y ?? null,
    }

    // Only include markup_timestamp if it's provided (column may not exist yet)
    if (markup_timestamp !== undefined && markup_timestamp !== null) {
      insertData.markup_timestamp = markup_timestamp
    }

    // Only include markup_page if it's provided (column may not exist yet)
    if (markup_page !== undefined && markup_page !== null) {
      insertData.markup_page = markup_page
    }

    const { error: feedbackError } = await supabase.from("feedback").insert(insertData)

    if (feedbackError) {
      if (feedbackError.message.includes("markup_timestamp")) {
        delete insertData.markup_timestamp
        const { error: retryError } = await supabase.from("feedback").insert(insertData)
        if (retryError) {
          return NextResponse.json({ error: retryError.message }, { status: 500 })
        }
      } else if (feedbackError.message.includes("markup_page")) {
        delete insertData.markup_page
        const { error: retryError } = await supabase.from("feedback").insert(insertData)
        if (retryError) {
          return NextResponse.json({ error: retryError.message }, { status: 500 })
        }
      } else {
        return NextResponse.json({ error: feedbackError.message }, { status: 500 })
      }
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
