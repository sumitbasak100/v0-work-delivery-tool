import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { feedbackId } = await request.json()
    const supabase = await createClient()

    const { error } = await supabase.from("feedback").delete().eq("id", feedbackId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: "Failed to delete feedback" }, { status: 500 })
  }
}
